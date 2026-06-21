## ADDED Requirements

### Requirement: Server-only code lives under api/ with its own TypeScript project

The system SHALL place all server-only code (Hono app, OAuth handlers, AES-GCM seal/open, Google token-exchange and userinfo calls, cookie helpers) under a top-level `api/` directory, separate from the `src/` SPA tree. The `api/` directory SHALL have its own TypeScript project configuration (`tsconfig.api.json`) with Node types and no DOM lib, referenced from the root `tsconfig.json` so `tsc -b` builds the SPA, the node-config, and the api project together. The `api/` directory SHALL NOT be included in the Vite SPA bundle. Files under `api/` MAY read server-only environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_KEY`) that are never prefixed with `VITE_` and therefore never inlined into the client bundle.

#### Scenario: Server code is excluded from the SPA bundle

- **WHEN** `vite build` produces the SPA bundle
- **THEN** no module under `api/` is included in the client output
- **AND** the `GOOGLE_CLIENT_SECRET` and `TOKEN_ENC_KEY` strings do not appear in the client bundle

#### Scenario: tsc -b builds all three projects

- **WHEN** `npm run typecheck` runs `tsc -b`
- **THEN** the app project (`src/`), the node-config project (`vite.config.ts`), and the api project (`api/`) all type-check
- **AND** the api project does not include DOM lib types
- **AND** the app project does not include Node types from the api project

#### Scenario: Server code reads server-only env vars

- **WHEN** an `api/` handler reads `process.env.GOOGLE_CLIENT_SECRET`
- **THEN** the value is available at runtime on Vercel
- **AND** the value is never replaced with a literal by Vite's `define` or `import.meta.env` machinery
- **AND** no `VITE_GOOGLE_CLIENT_ID` variable is referenced anywhere in `src/` or `api/`
