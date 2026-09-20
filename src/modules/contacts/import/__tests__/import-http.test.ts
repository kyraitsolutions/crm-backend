import { jest } from "@jest/globals";
import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Types } from "mongoose";
import request from "supertest";
import { ContactModel } from "../../../../models/contact.model.js";
import { Organization } from "../../../../models/organization.model.js";
import { HttpError } from "../../../../utils/http.error.js";
import {
  IMPORT_CONSENT_TEXT_VERSION,
  IMPORT_ERROR_CODE,
  IMPORT_PERMISSION,
  IMPORT_STATUS,
} from "../constants/import.constant.js";
import { createContactImportRouter } from "../http/contact-import.routes.js";
import { ContactImportHttpService } from "../http/import-http.service.js";
import { LocalFilePresigner } from "../http/presign.js";
import { MemoryImportQuota } from "../http/quota-port.js";
import { NoopScanner } from "../http/scan-port.js";
import { ImportSseHub } from "../http/sse-poller.js";
import { ContactImportRepository } from "../repositories/contact-import.repository.js";
import { applyTerminalEffects } from "../runtime/terminal-effects.js";
import { wireRuntime } from "./orchestration-helpers.js";
import {
  resetImportCollections,
  startImportTestMongo,
  stopImportTestMongo,
} from "./mongo-test-env.js";
import { createTempStore, phoneCsv, putText } from "./test-helpers.js";

const repo = new ContactImportRepository();

describe("contact import HTTP API", () => {
  const orgId = new Types.ObjectId().toHexString();
  const accountId = new Types.ObjectId().toHexString();
  const userId = new Types.ObjectId().toHexString();
  let storeRoot: Awaited<ReturnType<typeof createTempStore>>;
  let quota: MemoryImportQuota;
  let service: ContactImportHttpService;
  let app: express.Express;
  let queue: ReturnType<typeof wireRuntime>["queue"];

  beforeAll(async () => {
    process.env.IMPORT_MAX_ACTIVE_PER_ACCOUNT = "50";
    process.env.IMPORT_MAX_CREATES_PER_HOUR = "200";
    process.env.IMPORT_MAX_DRY_RUNS_PER_HOUR = "200";
    await startImportTestMongo();
  }, 120_000);

  afterAll(async () => {
    await stopImportTestMongo();
  });

  beforeEach(async () => {
    await resetImportCollections();
    storeRoot = await createTempStore();
    quota = new MemoryImportQuota();
    const wired = wireRuntime(repo, storeRoot.store, { rowsPerChunk: 50 });
    queue = wired.queue;
    const sse = new ImportSseHub(repo, 40, 80, 2);
    service = new ContactImportHttpService({
      ...wired.deps,
      quota,
      presigner: new LocalFilePresigner(),
      scanner: new NoopScanner(),
      sse,
      bucket: "local",
    });
    app = express();
    app.use(express.json());
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.headers.authorization) {
        res.status(401).json({
          success: false,
          responseStatusCode: 401,
          responseMessage: "Unauthorized",
          message: "Unauthorized",
        });
        return;
      }
      if (req.headers["x-permission"] === "deny") {
        res.status(403).json({
          success: false,
          responseStatusCode: 403,
          responseMessage: "Permission denied",
          message: "Permission denied",
        });
        return;
      }
      req.user = {
        id: String(req.headers["x-user-id"] ?? userId),
        organizationId: String(req.headers["x-org-id"] ?? orgId),
      };
      next();
    });
    app.use(
      "/api/account/:accountId/contacts/imports",
      createContactImportRouter(service, { authenticate: false }),
    );
    app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
      const error = err instanceof HttpError ? err : new HttpError(500, err instanceof Error ? err.message : "error");
      res.status(error.statusCode).json({
        success: false,
        responseStatusCode: error.statusCode,
        responseMessage: error.message,
        message: error.message,
        ...(error.code ? { code: error.code } : {}),
      });
    });
  });

  afterEach(async () => {
    await storeRoot.cleanup();
  });

  function auth(extra: Record<string, string> = {}) {
    return {
      Authorization: "Bearer test",
      ...extra,
    };
  }

  function url(suffix = "", account = accountId): string {
    return `/api/account/${account}/contacts/imports${suffix}`;
  }

  async function createAndUpload(
    csv: string,
    fileName = "contacts.csv",
  ): Promise<string> {
    const created = await request(app)
      .post(url())
      .set(auth())
      .send({ fileName, fileSize: Buffer.byteLength(csv), contentType: "text/csv" })
      .expect(201);
    const jobId = created.body.result.doc.id as string;
    const key = created.body.result.doc.key as string;
    await putText(storeRoot.store, key, csv);
    await request(app).post(url(`/${jobId}/complete-upload`)).set(auth()).expect(200);
    await queue.drain();
    return jobId;
  }

  it("wires production routes to auth and contacts.import", () => {
    const source = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../routes/account.routes.ts"),
      "utf8",
    );
    expect(source).toContain('"/:accountId/contacts/imports"');
    expect(source).toContain("createContactImportRouter");
    const routeSource = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../http/contact-import.routes.ts"),
      "utf8",
    );
    expect(routeSource).toContain("AuthMiddleware.authenticate");
    expect(routeSource).toContain(`requirePermission(${"IMPORT_PERMISSION"})`);
    expect(IMPORT_PERMISSION).toBe("contacts.import");
  });

  it("rejects missing token, missing permission, and cross-tenant job ids with 404", async () => {
    const csv = phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]);
    const jobId = await createAndUpload(csv);

    await request(app).get(url(`/${jobId}`)).expect(401);
    await request(app).get(url(`/${jobId}`)).set(auth({ "x-permission": "deny" })).expect(403);
    await request(app)
      .get(url(`/${jobId}`))
      .set(auth({ "x-org-id": new Types.ObjectId().toHexString() }))
      .expect(404);
    await request(app)
      .get(url(`/${jobId}`, new Types.ObjectId().toHexString()))
      .set(auth())
      .expect(404);
  });

  it("gates preview and start on mapping and is idempotent for complete-upload and start", async () => {
    const csv = phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]);
    const created = await request(app)
      .post(url())
      .set(auth())
      .send({ fileName: "contacts.csv", fileSize: Buffer.byteLength(csv), contentType: "text/csv" })
      .expect(201);
    const jobId = created.body.result.doc.id as string;
    expect(created.body.result.doc.upload.conditions).toEqual(
      expect.arrayContaining([
        { key: created.body.result.doc.key },
        ["content-length-range", 1, expect.any(Number)],
      ]),
    );

    await request(app).get(url(`/${jobId}/preview`)).set(auth()).expect(409);
    await request(app)
      .post(url(`/${jobId}/start`))
      .set(auth())
      .send({
        mapping: [
          { source: "name", target: "name" },
          { source: "phone", target: "phone" },
        ],
        defaultCountry: "IN",
      })
      .expect(409);

    await putText(storeRoot.store, created.body.result.doc.key, csv);
    await request(app).post(url(`/${jobId}/complete-upload`)).set(auth()).expect(200);
    await request(app).post(url(`/${jobId}/complete-upload`)).set(auth()).expect(200);
    await queue.drain();

    const preview = await request(app).get(url(`/${jobId}/preview`)).set(auth()).expect(200);
    expect(preview.body.result.doc.headers).toContain("phone");
    expect(preview.body.result.doc.suggestedMapping).toEqual(
      expect.arrayContaining([expect.objectContaining({ source: "phone", target: "phone" })]),
    );

    const startBody = {
      mapping: [
        { source: "name", target: "name" },
        { source: "phone", target: "phone" },
        { source: "email", target: "email" },
      ],
      defaultCountry: "US",
    };
    const first = await request(app).post(url(`/${jobId}/start`)).set(auth()).send(startBody).expect(200);
    const second = await request(app).post(url(`/${jobId}/start`)).set(auth()).send(startBody).expect(200);
    expect(first.body.result.doc.id).toBe(second.body.result.doc.id);
    expect(first.body.result.doc.defaultCountry).toBe("US");
    await request(app).post(url(`/${jobId}/resume`)).set(auth()).expect(409);
  });

  it("rejects wrong magic, size mismatch, and NUL-filled csv", async () => {
    const declared = "name,phone\nAda,+919876500001\n";
    const created = await request(app)
      .post(url())
      .set(auth())
      .send({ fileName: "contacts.csv", fileSize: Buffer.byteLength(declared), contentType: "text/csv" })
      .expect(201);
    const jobId = created.body.result.doc.id as string;
    const key = created.body.result.doc.key as string;

    const ole = Buffer.concat([
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      Buffer.alloc(Math.max(0, Buffer.byteLength(declared) - 8), 1),
    ]).subarray(0, Buffer.byteLength(declared));
    await putText(storeRoot.store, key, ole);
    const magic = await request(app).post(url(`/${jobId}/complete-upload`)).set(auth());
    expect(magic.status).toBe(400);
    expect(magic.body.code).toBe(IMPORT_ERROR_CODE.IMPORT_UNSUPPORTED_TYPE);

    const created2 = await request(app)
      .post(url())
      .set(auth())
      .send({ fileName: "contacts.csv", fileSize: Buffer.byteLength(declared), contentType: "text/csv" })
      .expect(201);
    await putText(storeRoot.store, created2.body.result.doc.key, `${declared}extra`);
    const mismatch = await request(app)
      .post(url(`/${created2.body.result.doc.id}/complete-upload`))
      .set(auth());
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.code).toBe(IMPORT_ERROR_CODE.IMPORT_SIZE_MISMATCH);

    const nul = Buffer.alloc(declared.length, 0);
    const created3 = await request(app)
      .post(url())
      .set(auth())
      .send({ fileName: "contacts.csv", fileSize: nul.length, contentType: "text/csv" })
      .expect(201);
    await putText(storeRoot.store, created3.body.result.doc.key, nul);
    const nuls = await request(app)
      .post(url(`/${created3.body.result.doc.id}/complete-upload`))
      .set(auth());
    expect(nuls.status).toBe(400);
  });

  it("cancels an abandoned uploaded job so it no longer counts as active", async () => {
    const csv = phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]);
    const created = await request(app)
      .post(url())
      .set(auth())
      .send({ fileName: "stuck.csv", fileSize: Buffer.byteLength(csv), contentType: "text/csv" })
      .expect(201);
    const jobId = created.body.result.doc.id as string;
    expect(created.body.result.doc.status).toBe(IMPORT_STATUS.UPLOADED);

    const cancelled = await request(app).post(url(`/${jobId}/cancel`)).set(auth()).expect(200);
    expect(cancelled.body.result.doc.status).toBe(IMPORT_STATUS.CANCELLED);

    const after = await repo.getJob({ organizationId: orgId, accountId }, jobId);
    expect(after?.status).toBe(IMPORT_STATUS.CANCELLED);
  });

  it("accepts a local-upload POST then complete-upload", async () => {
    const csv = phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]);
    const created = await request(app)
      .post(url())
      .set(auth())
      .send({ fileName: "contacts.csv", fileSize: Buffer.byteLength(csv), contentType: "text/csv" })
      .expect(201);
    const jobId = created.body.result.doc.id as string;
    const key = created.body.result.doc.key as string;
    expect(created.body.result.doc.upload.url).toMatch(/^local-upload:\/\//);

    await request(app)
      .post(url(`/${jobId}/local-upload`))
      .set(auth())
      .field("key", key)
      .attach("file", Buffer.from(csv), "contacts.csv")
      .expect(200);

    await request(app).post(url(`/${jobId}/complete-upload`)).set(auth()).expect(200);
    await queue.drain();
    const job = await repo.getJob({ organizationId: orgId, accountId }, jobId);
    expect(job?.status).toBe(IMPORT_STATUS.MAPPING);
  });

  it("rejects start over quota, settles once, and releases on cancel", async () => {
    const csv = phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]);
    const jobId = await createAndUpload(csv);
    quota.remaining = 0;
    const over = await request(app)
      .post(url(`/${jobId}/start`))
      .set(auth())
      .send({
        mapping: [
          { source: "name", target: "name" },
          { source: "phone", target: "phone" },
          { source: "email", target: "email" },
        ],
        defaultCountry: "IN",
      });
    expect(over.status).toBe(429);

    quota.remaining = Number.POSITIVE_INFINITY;
    const other = await createAndUpload(csv);
    await request(app)
      .post(url(`/${other}/start`))
      .set(auth())
      .send({
        mapping: [
          { source: "name", target: "name" },
          { source: "phone", target: "phone" },
          { source: "email", target: "email" },
        ],
        defaultCountry: "IN",
        consentAttestation: { confirmed: true },
      })
      .expect(200);
    await request(app).post(url(`/${other}/cancel`)).set(auth()).expect(200);
    const cancelled = await repo.getJob({ organizationId: orgId, accountId }, other);
    expect(cancelled?.quota?.status).toBe("released");
    expect(quota.settled).toHaveLength(0);

    const settleJob = await repo.createJob({
      workspaceId: { organizationId: orgId, accountId },
      createdBy: userId,
      file: {
        bucket: "local",
        key: "x.csv",
        fileName: "x.csv",
        mimeType: "text/csv",
        byteSize: 10,
      },
    });
    await repo.transition({ organizationId: orgId, accountId }, settleJob.id, "uploaded", "validating");
    await repo.transition({ organizationId: orgId, accountId }, settleJob.id, "validating", "mapping");
    await repo.transition({ organizationId: orgId, accountId }, settleJob.id, "mapping", "queued");
    await repo.transition({ organizationId: orgId, accountId }, settleJob.id, "queued", "processing");
    await repo.replaceJobTotals({ organizationId: orgId, accountId }, settleJob.id, {
      totalRows: 1,
      processed: 1,
      inserted: 3,
      updated: 0,
      skipped: 0,
      failed: 0,
      duplicates: 0,
    });
    await repo.transition(
      { organizationId: orgId, accountId },
      settleJob.id,
      "processing",
      "completed",
    );
    const ws = { organizationId: orgId, accountId };
    const deps = { repository: repo, store: storeRoot.store, queue, settings: wireRuntime(repo, storeRoot.store).deps.settings, quota };
    await applyTerminalEffects(deps, ws, settleJob.id);
    await applyTerminalEffects(deps, ws, settleJob.id);
    expect(quota.settled).toEqual([{ organizationId: orgId, jobId: settleJob.id, inserted: 3 }]);
  });

  it("records consent attestation and rejects unknown start keys", async () => {
    const csv = phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]);
    const jobId = await createAndUpload(csv);
    const unknown = await request(app)
      .post(url(`/${jobId}/start`))
      .set(auth())
      .send({
        mapping: [
          { source: "name", target: "name" },
          { source: "phone", target: "phone" },
          { source: "email", target: "email" },
        ],
        defaultCountry: "IN",
        defaultAssigneeId: new Types.ObjectId().toHexString(),
      });
    expect(unknown.status).toBe(400);

    const started = await request(app)
      .post(url(`/${jobId}/start`))
      .set(auth())
      .send({
        mapping: [
          { source: "name", target: "name" },
          { source: "phone", target: "phone" },
          { source: "email", target: "email" },
        ],
        defaultCountry: "IN",
        consentAttestation: { confirmed: true },
      })
      .expect(200);
    expect(started.body.result.doc.defaultAssigneeId).toBeUndefined();
    expect(started.body.result.doc.consentAttested).toBe(true);
  });

  it("returns import config limits, fields, policies, consent, and org country without an IN fallback", async () => {
    const none = await request(app).get(url("/config")).set(auth()).expect(200);
    const doc = none.body.result.doc;
    expect(doc.limits.maxFileBytes).toBeGreaterThan(0);
    expect(doc.limits.maxRows).toBeGreaterThan(0);
    expect(doc.limits.allowedTypes).toEqual([".csv", ".xlsx"]);
    expect(doc.limits.sheetSupport.xlsx).toBe(true);
    expect(doc.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "phone",
          label: expect.any(String),
          type: "string",
          allowedTransforms: expect.any(Array),
          identityKey: true,
        }),
        expect.objectContaining({ key: "email", identityKey: true }),
      ]),
    );
    expect(doc.policies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "skip", description: expect.any(String) }),
        expect.objectContaining({ key: "update", description: expect.any(String) }),
        expect.objectContaining({ key: "merge", description: expect.any(String) }),
      ]),
    );
    expect(doc.merge.tags).toEqual(["union", "replace"]);
    expect(doc.consentText).toEqual({
      version: IMPORT_CONSENT_TEXT_VERSION,
      text: expect.any(String),
    });
    expect(doc.defaultCountry).toEqual({ code: null, source: "none" });

    await Organization.create({
      _id: new Types.ObjectId(orgId),
      name: "Kyra",
      slug: `kyra-${orgId}`,
      email: `org-${orgId}@kyra.test`,
      createdBy: new Types.ObjectId(userId),
      address: { country: "us" },
    });
    const withOrg = await request(app).get(url("/config")).set(auth()).expect(200);
    expect(withOrg.body.result.doc.defaultCountry).toEqual({ code: "US", source: "organization" });

    await Organization.updateOne({ _id: orgId }, { $set: { "address.country": "India" } });
    const invalid = await request(app).get(url("/config")).set(auth()).expect(200);
    expect(invalid.body.result.doc.defaultCountry).toEqual({ code: null, source: "none" });
    await Organization.deleteMany({ _id: orgId });
  });

  it("dry-runs a mixed fixture, reports error codes, and writes no contacts", async () => {
    const csv = [
      "name,phone,email,status",
      "Ada,+919876500001,ada@kyra.test,subscribed",
      "BadPhone,123,badphone@kyra.test,subscribed",
      "NoId,,,subscribed",
      "BadEmail,,not-an-email,subscribed",
      "BadStatus,+919876500003,status@kyra.test,not-a-status",
      "ValidTwo,+919876500004,two@kyra.test,subscribed",
    ].join("\n") + "\n";
    const jobId = await createAndUpload(csv);
    await ContactModel.create({
      accountId,
      name: "Ada",
      phone: "+919876500001",
      email: "ada@kyra.test",
      source: "manual",
    });
    const before = await ContactModel.countDocuments();
    const beforeJob = await repo.getJob({ organizationId: orgId, accountId }, jobId);
    const writeSpies = [
      jest.spyOn(ContactModel, "create"),
      jest.spyOn(ContactModel, "insertMany"),
      jest.spyOn(ContactModel, "updateOne"),
      jest.spyOn(ContactModel, "updateMany"),
      jest.spyOn(ContactModel, "bulkWrite"),
      jest.spyOn(ContactModel, "findOneAndUpdate"),
      jest.spyOn(ContactModel, "replaceOne"),
    ];
    const findSpy = jest.spyOn(ContactModel, "find");

    const mapping = [
      { source: "name", target: "name" },
      { source: "phone", target: "phone" },
      { source: "email", target: "email" },
      { source: "status", target: "status" },
    ];
    const result = await request(app)
      .post(url(`/${jobId}/dry-run`))
      .set(auth())
      .send({
        mapping,
        identity: { keys: ["phone", "email"] },
        policy: "update",
        defaultCountry: "IN",
        sampleSize: 200,
      })
      .expect(200);
    const doc = result.body.result.doc;
    expect(doc.sampled).toBe(6);
    expect(doc.valid).toBe(3);
    expect(doc.invalid).toBe(3);
    expect(doc.byErrorCode).toEqual({
      INVALID_PHONE: 1,
      INVALID_IDENTITY: 1,
      INVALID_EMAIL: 1,
    });
    expect(doc.invalidSamples).toHaveLength(3);
    expect(doc.validSamples).toHaveLength(3);
    expect(doc.invalidSamples[0]).toEqual(
      expect.objectContaining({
        raw: expect.any(Array),
        normalized: expect.any(Object),
        errors: [expect.objectContaining({ code: expect.any(String) })],
      }),
    );
    expect(doc.existingMatches.count).toBe(1);
    expect(doc.existingMatches.phones).toContain("+919876500001");
    expect(findSpy).toHaveBeenCalledTimes(1);

    expect(await ContactModel.countDocuments()).toBe(before);
    const afterJob = await repo.getJob({ organizationId: orgId, accountId }, jobId);
    expect(afterJob?.status).toBe(IMPORT_STATUS.MAPPING);
    expect(afterJob?.counters).toEqual(beforeJob?.counters);
    for (const spy of writeSpies) {
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    }
    findSpy.mockRestore();
  });

  it("returns 409 when dry-run is not in mapping and 404 for a cross-tenant job", async () => {
    const csv = phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]);
    const created = await request(app)
      .post(url())
      .set(auth())
      .send({ fileName: "contacts.csv", fileSize: Buffer.byteLength(csv), contentType: "text/csv" })
      .expect(201);
    const uploadedId = created.body.result.doc.id as string;
    const mapping = [
      { source: "name", target: "name" },
      { source: "phone", target: "phone" },
      { source: "email", target: "email" },
    ];
    const wrongState = await request(app)
      .post(url(`/${uploadedId}/dry-run`))
      .set(auth())
      .send({ mapping, defaultCountry: "IN" });
    expect(wrongState.status).toBe(409);
    expect(wrongState.body.code).toBe(IMPORT_ERROR_CODE.IMPORT_INVALID_STATE);

    const jobId = await createAndUpload(csv);
    const cross = await request(app)
      .post(url(`/${jobId}/dry-run`))
      .set(auth({ "x-org-id": new Types.ObjectId().toHexString() }))
      .send({ mapping, defaultCountry: "IN" });
    expect(cross.status).toBe(404);
    expect(cross.body.code).toBe(IMPORT_ERROR_CODE.IMPORT_NOT_FOUND);
  });

  it("requires a 2-letter defaultCountry on start", async () => {
    const csv = phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]);
    const jobId = await createAndUpload(csv);
    const mapping = [
      { source: "name", target: "name" },
      { source: "phone", target: "phone" },
      { source: "email", target: "email" },
    ];
    const missing = await request(app)
      .post(url(`/${jobId}/start`))
      .set(auth())
      .send({ mapping });
    expect(missing.status).toBe(400);
    expect(missing.body.code).toBe(IMPORT_ERROR_CODE.IMPORT_DEFAULT_COUNTRY_REQUIRED);

    const invalid = await request(app)
      .post(url(`/${jobId}/start`))
      .set(auth())
      .send({ mapping, defaultCountry: "IND" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe(IMPORT_ERROR_CODE.IMPORT_DEFAULT_COUNTRY_REQUIRED);
  });

  it("serves an O(1) status snapshot without chunk aggregation", async () => {
    const csv = phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]);
    const jobId = await createAndUpload(csv);
    const spy = jest.spyOn(repo, "listChunks");
    const status = await request(app).get(url(`/${jobId}`)).set(auth()).expect(200);
    expect(status.body.result.doc.status).toBe(IMPORT_STATUS.MAPPING);
    expect(status.body.result.doc.percent).toBeDefined();
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("lists jobs with a cursor and 409s error download before finalize", async () => {
    const csv = phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]);
    const jobId = await createAndUpload(csv);
    const listed = await request(app).get(url()).set(auth()).expect(200);
    expect(listed.body.result.docs.some((row: { id: string }) => row.id === jobId)).toBe(true);
    await request(app).get(url(`/${jobId}/errors`)).set(auth()).expect(409);
    await request(app).get(url(`/${jobId}/errors/file`)).set(auth()).expect(409);
  });

  it("streams SSE snapshots, heartbeats, closes on terminal, and drops the poller", async () => {
    const csv = phoneCsv([{ name: "Ada", phone: "+919876500001", email: "ada@kyra.test" }]);
    const jobId = await createAndUpload(csv);
    const server = createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("expected tcp port");
    }
    const chunks: string[] = [];
    const response = await fetch(
      `http://127.0.0.1:${address.port}${url(`/${jobId}/events`)}`,
      { headers: { Authorization: "Bearer test" } },
    );
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("expected SSE body");
    }
    const decoder = new TextDecoder();
    const readUntil = async (match: RegExp, ms = 4_000): Promise<void> => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) {
        const joined = chunks.join("");
        if (match.test(joined)) {
          return;
        }
        const next = await Promise.race([
          reader.read(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error("sse timeout")), 1_000);
          }),
        ]).catch(() => ({ done: false, value: undefined }));
        if (next.value) {
          chunks.push(decoder.decode(next.value));
        }
        if ("done" in next && next.done) {
          return;
        }
      }
    };
    await readUntil(/event: snapshot/);
    await readUntil(/: heartbeat/);
    await repo.transition(
      { organizationId: orgId, accountId },
      jobId,
      IMPORT_STATUS.MAPPING,
      IMPORT_STATUS.QUEUED,
    );
    await repo.transition(
      { organizationId: orgId, accountId },
      jobId,
      IMPORT_STATUS.QUEUED,
      IMPORT_STATUS.PROCESSING,
    );
    await repo.transition(
      { organizationId: orgId, accountId },
      jobId,
      IMPORT_STATUS.PROCESSING,
      IMPORT_STATUS.COMPLETED,
    );
    await readUntil(/completed/);
    await reader.cancel();
    await new Promise((resolve) => setTimeout(resolve, 120));
    expect(service.sse.activePollers()).toBe(0);
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });
});
