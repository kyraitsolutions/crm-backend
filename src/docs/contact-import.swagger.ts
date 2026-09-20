const apiResponse = (resultSchema: Record<string, unknown>) => ({
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    responseStatusCode: { type: "integer", example: 200 },
    responseMessage: { type: "string" },
    request: {
      type: "object",
      properties: {
        method: { type: "string" },
        baseUrl: { type: "string" },
        endpoint: { type: "string" },
      },
    },
    result: resultSchema,
  },
});

const bearerAuth = [{ bearerAuth: [] }];

const accountIdParam = {
  name: "accountId",
  in: "path",
  required: true,
  schema: { type: "string" },
};

const jobIdParam = {
  name: "jobId",
  in: "path",
  required: true,
  schema: { type: "string" },
};

const errorResponses = {
  400: { description: "Validation or file rejected" },
  401: { description: "Unauthorized" },
  403: { description: "Missing contacts.import" },
  404: { description: "Job not found for this tenant" },
  409: { description: "Illegal import state" },
  429: { description: "Active-job, hourly, SSE, or contact quota" },
};

export const contactImportSwaggerPaths = {
  "/account/{accountId}/contacts/imports": {
    get: {
      tags: ["Account Contact Imports"],
      summary: "List contact imports",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        { name: "status", in: "query", schema: { type: "string" } },
        { name: "cursor", in: "query", schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
      ],
      responses: {
        200: {
          description: "Import jobs",
          content: {
            "application/json": {
              schema: apiResponse({
                type: "object",
                properties: {
                  docs: { type: "array", items: { type: "object" } },
                  nextCursor: { type: "string" },
                },
              }),
            },
          },
        },
        ...errorResponses,
      },
    },
    post: {
      tags: ["Account Contact Imports"],
      summary: "Create import job and presigned POST",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        { name: "Idempotency-Key", in: "header", schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["fileName", "fileSize", "contentType"],
              properties: {
                fileName: { type: "string", example: "contacts.csv" },
                fileSize: { type: "integer", example: 2048 },
                contentType: { type: "string", example: "text/csv" },
              },
            },
          },
        },
      },
      responses: {
        201: {
          description: "Job created",
          content: { "application/json": { schema: apiResponse({ type: "object" }) } },
        },
        ...errorResponses,
      },
    },
  },
  "/account/{accountId}/contacts/imports/config": {
    get: {
      tags: ["Account Contact Imports"],
      summary: "Import limits, mappable fields, policies, consent text, and default country",
      security: bearerAuth,
      parameters: [accountIdParam],
      responses: {
        200: {
          description: "Import config",
          content: { "application/json": { schema: apiResponse({ type: "object" }) } },
        },
        ...errorResponses,
      },
    },
  },
  "/account/{accountId}/contacts/imports/{jobId}": {
    get: {
      tags: ["Account Contact Imports"],
      summary: "O(1) import status snapshot",
      security: bearerAuth,
      parameters: [accountIdParam, jobIdParam],
      responses: {
        200: {
          description: "Status snapshot from the job document",
          content: { "application/json": { schema: apiResponse({ type: "object" }) } },
        },
        ...errorResponses,
      },
    },
  },
  "/account/{accountId}/contacts/imports/{jobId}/complete-upload": {
    post: {
      tags: ["Account Contact Imports"],
      summary: "Verify uploaded object and enqueue validation",
      security: bearerAuth,
      parameters: [accountIdParam, jobIdParam],
      responses: {
        200: { description: "Upload verified" },
        ...errorResponses,
      },
    },
  },
  "/account/{accountId}/contacts/imports/{jobId}/preview": {
    get: {
      tags: ["Account Contact Imports"],
      summary: "Headers, sample rows, and suggested mapping",
      security: bearerAuth,
      parameters: [accountIdParam, jobIdParam],
      responses: {
        200: { description: "Preview" },
        ...errorResponses,
      },
    },
  },
  "/account/{accountId}/contacts/imports/{jobId}/start": {
    post: {
      tags: ["Account Contact Imports"],
      summary: "Confirm mapping and start the import",
      security: bearerAuth,
      parameters: [accountIdParam, jobIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["mapping", "defaultCountry"],
              properties: {
                mapping: { type: "array", items: { type: "object" } },
                policy: { type: "string", enum: ["skip", "update", "merge"] },
                identity: { type: "object" },
                merge: { type: "object" },
                defaultCountry: { type: "string", example: "IN", minLength: 2, maxLength: 2 },
                consentAttestation: {
                  type: "object",
                  properties: { confirmed: { type: "boolean", enum: [true] } },
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Import started" },
        ...errorResponses,
      },
    },
  },
  "/account/{accountId}/contacts/imports/{jobId}/dry-run": {
    post: {
      tags: ["Account Contact Imports"],
      summary: "Validate a head sample without writing contacts",
      security: bearerAuth,
      parameters: [accountIdParam, jobIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["mapping", "defaultCountry"],
              properties: {
                mapping: { type: "array", items: { type: "object" } },
                policy: { type: "string", enum: ["skip", "update", "merge"] },
                identity: { type: "object" },
                defaultCountry: { type: "string", example: "IN", minLength: 2, maxLength: 2 },
                sampleSize: { type: "integer", minimum: 1, maximum: 200, default: 200 },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Dry-run counts, samples, and existing matches" },
        ...errorResponses,
      },
    },
  },
  "/account/{accountId}/contacts/imports/{jobId}/pause": {
    post: {
      tags: ["Account Contact Imports"],
      summary: "Pause a processing import",
      security: bearerAuth,
      parameters: [accountIdParam, jobIdParam],
      responses: { 200: { description: "Paused" }, ...errorResponses },
    },
  },
  "/account/{accountId}/contacts/imports/{jobId}/resume": {
    post: {
      tags: ["Account Contact Imports"],
      summary: "Resume a paused import",
      security: bearerAuth,
      parameters: [accountIdParam, jobIdParam],
      responses: { 200: { description: "Resumed" }, ...errorResponses },
    },
  },
  "/account/{accountId}/contacts/imports/{jobId}/cancel": {
    post: {
      tags: ["Account Contact Imports"],
      summary: "Cancel an import",
      security: bearerAuth,
      parameters: [accountIdParam, jobIdParam],
      responses: { 200: { description: "Cancelled" }, ...errorResponses },
    },
  },
  "/account/{accountId}/contacts/imports/{jobId}/events": {
    get: {
      tags: ["Account Contact Imports"],
      summary: "SSE progress stream",
      security: bearerAuth,
      parameters: [accountIdParam, jobIdParam],
      responses: {
        200: { description: "text/event-stream" },
        ...errorResponses,
      },
    },
  },
  "/account/{accountId}/contacts/imports/{jobId}/errors": {
    get: {
      tags: ["Account Contact Imports"],
      summary: "Presigned GET for the error CSV",
      security: bearerAuth,
      parameters: [accountIdParam, jobIdParam],
      responses: {
        200: { description: "Short-lived download URL" },
        ...errorResponses,
      },
    },
  },
};
