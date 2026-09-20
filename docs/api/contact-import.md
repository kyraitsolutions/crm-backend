# Contact import HTTP API

Base: `/api/account/:accountId/contacts/imports`  
Auth: `Authorization: Bearer <jwt>`  
Permission: `contacts.import`  
Tenancy: `organizationId` from the token, `accountId` from the path. Every lookup is scoped by both. A job id from another tenant returns **404**, never 403.

Envelope: `{ success, responseStatusCode, responseMessage, request, result }`. Singles use `result.doc`. Lists use `result.docs` + `result.nextCursor`.

## Endpoints

| Method | Path | Success | Errors |
|--------|------|---------|--------|
| `POST` | `/` | `201` created + presigned POST | `400` validation / type / size, `401`, `403`, `429` active or hourly cap |
| `GET` | `/config` | `200` limits, fields, policies, consent, default country | `401`, `403` |
| `POST` | `/:jobId/local-upload` | `200` file stored (local store only) | `400` missing/size, `404`, `409` if not local or wrong state |
| `POST` | `/:jobId/complete-upload` | `200` (idempotent) | `400` missing object / magic / size, `404`, `409` after failure |
| `GET` | `/:jobId/preview` | `200` | `404`, `409` before `mapping` |
| `POST` | `/:jobId/dry-run` | `200` sample counts (no contact writes) | `400` mapping / country, `404`, `409` unless `mapping`, `429` dry-run cap |
| `POST` | `/:jobId/start` | `200` (idempotent replay when already started) | `400` mapping / country / unknown keys, `404`, `409` wrong state, `429` contact quota |
| `POST` | `/:jobId/pause` | `200` | `404`, `409` unless `processing` / already `paused` |
| `POST` | `/:jobId/resume` | `200` | `404`, `409` unless `paused` |
| `POST` | `/:jobId/cancel` | `200` | `404`, `409` if already finished |
| `GET` | `/:jobId` | `200` O(1) snapshot | `401`, `403`, `404` |
| `GET` | `/:jobId/events` | `200` `text/event-stream` | `401`, `403`, `404`, `429` connection cap |
| `GET` | `/:jobId/errors` | `200` short-lived GET URL | `404`, `409` before the report exists |
| `GET` | `/:jobId/errors/file` | `200` CSV stream (local store / authenticated) | `404`, `409` before the report exists |
| `GET` | `/` | `200` cursor page | `400` bad cursor/status, `401`, `403` |

## Create

```http
POST /api/account/{accountId}/contacts/imports
Idempotency-Key: 8f1c2a0e-client-key
Content-Type: application/json

{
  "fileName": "contacts.csv",
  "fileSize": 2048,
  "contentType": "text/csv"
}
```

```json
{
  "success": true,
  "responseStatusCode": 201,
  "result": {
    "doc": {
      "id": "66f0…",
      "status": "uploaded",
      "key": "uploads/{orgId}/{accountId}/{jobId}/source.csv",
      "uploadUrl": "https://…",
      "upload": {
        "url": "https://…",
        "fields": { "key": "uploads/…/source.csv", "policy": "…" },
        "key": "uploads/{orgId}/{accountId}/{jobId}/source.csv",
        "expiresInSec": 900,
        "maxBytes": 262144000,
        "conditions": [
          { "key": "uploads/{orgId}/{accountId}/{jobId}/source.csv" },
          ["content-length-range", 1, 262144000]
        ]
      }
    }
  }
}
```

Upload the file with the presigned POST (exact key + size in range). When `IMPORT_FILE_STORE=local`, `upload.url` is `local-upload://…` — the browser should `POST` the same form (`fields` then `file`) to `/:jobId/local-upload` with the auth header instead. Do not enqueue validation until `complete-upload` succeeds.

## Config

```http
GET /api/account/{accountId}/contacts/imports/config
```

```json
{
  "success": true,
  "responseStatusCode": 200,
  "result": {
    "doc": {
      "limits": {
        "maxFileBytes": 262144000,
        "maxRows": 500000,
        "allowedTypes": [".csv", ".xlsx"],
        "allowedMimeTypes": ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
        "sheetSupport": { "csv": false, "xlsx": true, "firstVisibleSheet": true }
      },
      "fields": [
        { "key": "name", "label": "Name", "type": "string", "allowedTransforms": ["none", "trim", "lowercase"], "identityKey": false },
        { "key": "email", "label": "Email", "type": "string", "allowedTransforms": ["none", "trim", "lowercase"], "identityKey": true },
        { "key": "phone", "label": "Phone", "type": "string", "allowedTransforms": ["none", "trim"], "identityKey": true }
      ],
      "policies": [
        { "key": "skip", "description": "Leave the existing contact unchanged when a match is found." },
        { "key": "update", "description": "Overwrite mapped fields on the existing contact. Consent and opt-out are never changed." },
        { "key": "merge", "description": "Fill empty mapped fields only. Tags can union or replace. Consent and opt-out stay as-is." }
      ],
      "merge": { "emptyOnly": ["name", "email", "phone", "tags"], "tags": ["union", "replace"], "allowStatusUpgrade": false },
      "consentText": { "version": "import-consent-v1", "text": "I confirm these contacts consented…" },
      "defaultCountry": { "code": "US", "source": "organization" }
    }
  }
}
```

`defaultCountry.source` is `"organization"` only when `Organization.address.country` is a 2-letter ISO code. Otherwise `{ "code": null, "source": "none" }`. There is no silent `"IN"` fallback.

Consent copy is versioned in `src/modules/contacts/import/constants/consent-text.ts`.

## Complete upload

HEAD the object (exists, size ≤ cap and equals `fileSize`), ranged-GET the first 4 KB, check magic (`PK` for xlsx; CSV must not contain NUL). Then enqueue `import:validate`.

## Start

```json
{
  "mapping": [
    { "source": "Name", "target": "name", "transform": "trim" },
    { "source": "Mobile", "target": "phone" },
    { "source": "Email", "target": "email", "transform": "lowercase" }
  ],
  "policy": "update",
  "identity": { "keys": ["phone", "email"] },
  "merge": { "emptyOnly": ["name", "email", "phone", "tags"], "tags": "union", "allowStatusUpgrade": false },
  "defaultCountry": "IN",
  "consentAttestation": { "confirmed": true }
}
```

`defaultCountry` is required and must be a 2-letter ISO code (`IN`, `US`, …). Missing or invalid values return `400 IMPORT_DEFAULT_COUNTRY_REQUIRED`. The start path does not read `Organization.address.country`.

Unknown keys (including `defaultAssigneeId`) return `400`. Assignment is not supported in v1.

`consentAttestation.confirmed: true` records `{ userId, at, ip, userAgent, textVersion }` on the job. New contacts then get `consent.marketing = true`. Without attestation, new contacts keep the ContactModel default (`marketing: false`). Updates never change consent or opt-out.

## Dry-run

Status must be `mapping`. No contact writes. Rate-limited per job (`IMPORT_MAX_DRY_RUNS_PER_HOUR`, default 30) with `429 IMPORT_RATE_LIMITED`.

```json
{
  "mapping": [
    { "source": "Name", "target": "name", "transform": "trim" },
    { "source": "Mobile", "target": "phone" },
    { "source": "Email", "target": "email", "transform": "lowercase" }
  ],
  "identity": { "keys": ["phone", "email"] },
  "policy": "update",
  "defaultCountry": "IN",
  "sampleSize": 200
}
```

`sampleSize` defaults to 200 and maxes at 200. The handler reads that many data rows from the file, runs the same `mapRow` / `validateRow` / normalize functions as the worker, then one batched `find` on normalized identity keys (`accountId` + `$in` on `phone` and/or `email`, using `uniq_account_phone` / `uniq_account_email`).

```json
{
  "sampled": 6,
  "valid": 2,
  "invalid": 4,
  "byErrorCode": {
    "INVALID_PHONE": 1,
    "INVALID_IDENTITY": 1,
    "INVALID_EMAIL": 1,
    "INVALID_STATUS": 1
  },
  "invalidSamples": [
    {
      "rowNumber": 2,
      "raw": ["BadPhone", "123", "badphone@kyra.test", "subscribed"],
      "normalized": { "name": "BadPhone", "phone": "123", "email": "badphone@kyra.test" },
      "errors": [{ "code": "INVALID_PHONE", "column": "phone", "rawValue": "123" }]
    }
  ],
  "validSamples": [
    {
      "rowNumber": 1,
      "raw": ["Ada", "+919876500001", "ada@kyra.test", "subscribed"],
      "normalized": { "name": "Ada", "phone": "+919876500001", "email": "ada@kyra.test", "status": "subscribed" }
    }
  ],
  "existingMatches": {
    "count": 1,
    "phones": ["+919876500001"],
    "emails": ["ada@kyra.test"]
  }
}
```

Up to 20 invalid samples and 10 valid samples are returned.

## Status snapshot

O(1) from the job document (no chunk aggregation): `status`, `file`, `processed` / `total` / `percent`, `totals`, `rowErrorPreview`, `timestamps`, `errorReportAvailable`.

## SSE

`GET /:jobId/events`

- `Cache-Control: no-cache`
- `X-Accel-Buffering: no`
- `event: snapshot` on change
- comment heartbeat every 15s (`: heartbeat`)
- connection closes on a terminal status
- per-user cap (`IMPORT_SSE_MAX_CONNECTIONS_PER_USER`, default 4)

## Error codes

| Code | HTTP | When |
|------|------|------|
| `IMPORT_FILE_TOO_LARGE` | 400 | Declared or stored size over the cap |
| `IMPORT_UNSUPPORTED_TYPE` | 400 | Bad extension or magic / NUL CSV |
| `IMPORT_SIZE_MISMATCH` | 400 | Object size ≠ declared `fileSize` |
| `IMPORT_EMPTY` | 400 | Object missing after complete-upload |
| `IMPORT_SCAN_REJECTED` | 400 | AV hook rejected the object |
| `IMPORT_DEFAULT_COUNTRY_REQUIRED` | 400 | `defaultCountry` missing or not a 2-letter ISO code |
| `IMPORT_INVALID_STATE` | 409 | Wrong status for preview/dry-run/start/pause/resume/errors |
| `IMPORT_NOT_FOUND` | 404 | Unknown or cross-tenant job |
| `IMPORT_QUOTA_ACTIVE` | 429 | Too many non-terminal imports on the account |
| `IMPORT_RATE_LIMITED` | 429 | Hourly create cap, dry-run cap, SSE cap, or contact capacity |

## Quota

Soft check of planned rows at start. Finalize/cancel/fail/stall settle the actual inserted count, idempotent by `jobId`. There is no atomic reserve — concurrent starts can overshoot until settlement.

## Grant `contacts.import`

```bash
npm run migrate:grant-contacts-import          # dry-run: print roles that already have contacts.create
npm run migrate:grant-contacts-import -- --apply
```

Default is dry-run. `--apply` inserts `RolePermission` for those roles (idempotent upsert). Roles that already have `contacts.import` are skipped.
