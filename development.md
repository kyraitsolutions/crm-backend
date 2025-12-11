Development guide for chat-base-api

Stack
- Node.js + TypeScript, Express 5, Mongoose (MongoDB)
- Passport (local, Google, JWT)
- Bull/Redis email queue + worker
- WebSocket via ws
- Zod validation, Winston logging, Axios, Nodemailer
- Google Generative AI client

Entry points
- `src/server.ts` boots the Express app from `src/app.ts`, binds HTTP and WebSocket on the same port, and mounts routes under `/api`.
- MongoDB connects via `ENV.DATABASE_URL` in `src/db/index.ts`.

Scripts (package.json)
- `npm run dev`: `tsx watch src/server.ts` plus `tsx src/workers/email.worker.ts` (API with TS transpilation + email worker).
- `npm run build`: `tsc` → outputs to `dist/`.
- `npm start`: `node dist/server.js` (after build).
- Drizzle scripts exist but Drizzle is unused in `src/`; keep aligned if you add it.

TypeScript config
- CommonJS, ES2022 target, `rootDir` `src`, `outDir` `dist`, strict mode.
- Includes a reference to `../../chatbot-script/utils/leadFieldMapper.ts`; ensure that path exists or adjust to avoid build breaks.

Environment (.env)
- Required: `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `FRONT_END_CALLBACK_URL`
- Google GenAI: `GOOGLE_GENAI_API_KEY`
- Optional: `NODE_ENV`
- Place `.env` at repo root (git-ignored).

HTTP server (`src/app.ts`)
- Middleware: CORS (localhost:5173,3001 with credentials), JSON and urlencoded body parsers, `passport.initialize()`.
- Routes under `/api`: auth (`/auth`), chatbot (`/chatbot`), subscription (currently also uses chatbot router), account (`/account`), user profile (`/user/profile`), team (`/team`), email (`/mail`).
- Errors handled by `ErrorMiddleware.notFound` then `ErrorMiddleware.handle`.

Auth (`src/config/passport.ts`)
- Local login delegates to `UserService.login`.
- Google OAuth delegates to `UserService.findOrCreateGoogleUser`.
- JWT Bearer verifies via `config.jwtSecret`, fetches user by ID.

WebSocket (`src/config/wsServer/wsServer.ts`)
- Shares the HTTP server; expects `accountId` query param.
- Messages shaped `{ event, data }` are routed to `handleEvent` in `src/config/wsServer/handleEvent.ts`.
- Extend events under `src/config/wsServer/events/`.

Project structure (high level)
- `controllers/`, `services/`, `repositories/`, `models/` (Mongoose)
- `dtos/`, `types/`, `enums/`
- `middleware/` (auth, role, error)
- `utils/` (jwt/password/gemini/logger/http response helpers)
- `config/` (passport, redis/queue/email/ws)
- `workers/email.worker.ts`
- `views/template` (HTML/EJS emails)

Local quick start
1) `npm install`
2) Create `.env` with Mongo and auth/OAuth/GenAI secrets.
3) `npm run dev` (starts API + email worker; HMR via tsx).
4) Call APIs at `http://localhost:<PORT>/api/...`; WS connects to the same port with `?accountId=...`.

Production
- `npm run build` then `npm start`.
- Ensure env vars are set; run email worker separately (`npm run worker:email`).

Testing
- Jest dependency present but not wired; `npm test` is a placeholder.
- Add tests under `__tests__/` or `tests/` and configure Jest for TS if you add coverage.

Observability and logging
- Winston logger in `src/utils/logger.ts`; HTTP errors flow through `ErrorMiddleware`.

Email and queue
- Nodemailer config in `src/config/email.ts`.
- Bull/Redis queue config in `src/config/queue.ts` and `src/config/redis.ts`.
- Worker at `src/workers/email.worker.ts` processes queued email jobs.

Common workflows
- Add route: create controller/service/repository as needed; register router in `src/routes/index.ts`.
- Add WS event: add handler in `src/config/wsServer/events/`, wire in `handleEvent`.
- Update auth: adjust `UserService` and corresponding strategy in `src/config/passport.ts`.

Gotchas
- Set `config.google.clientId`, `config.google.clientSecret`, `config.google.callback` and `JWT_SECRET` or auth flows will fail.
- CORS allows only localhost origins; update `initializeMiddlewares` for other domains.
- Subscription currently reuses the chatbot router; confirm if that is intended.
- The TS include referencing `../../chatbot-script/utils/leadFieldMapper.ts` can break builds if missing—remove or point correctly.

Useful paths when extending
- `src/routes/*.routes.ts` for route definitions
- `src/controllers/*.controller.ts` for request handling and validation
- `src/services/*.service.ts` for business logic
- `src/repositories/*.repository.ts` and `src/models/*.model.ts` for persistence
- `src/middleware/auth.middleware.ts` and `src/middleware/role.middleware.ts` for guards
- `src/utils/jwt.util.ts`, `password.util.ts`, `gemini-ai.util.ts` for helpers