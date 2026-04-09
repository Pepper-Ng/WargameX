# Backend

## API
### Purpose
Central reference for HTTP contracts. Keep examples minimal and version-compatible.

### Current route groups
- Health/debug routes
- Auth routes
- Map routes
- Force/Base creation routes

### Contract template (use for each endpoint)
- Method + path
- Request body/query schema
- Response schema
- Error cases
- Auth requirements
- Determinism/idempotency notes

## Authentication (Skeleton)

### Current state
- Username/password registration and login are implemented.
- Credential handling uses utility helpers in `src/utils/password.js`.

### Documentation checklist
- Registration flow
- Login flow
- Password hashing strategy
- Session/token model (current + planned)
- Security constraints and abuse controls
- Error semantics
