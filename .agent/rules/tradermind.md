---
trigger: always_on
---

TraderMind — IDE Rules Configuration for PRD Compliance
1. Project Structure Enforcement

Rule: Only allowed folder structure:

/apps/frontend
/apps/api-gateway
/apps/quant-engine
/apps/ai-layer
/packages/schemas
/packages/shared-utils
/packages/risk-rules


IDE Config:

Lock folder creation outside /apps or /packages

Highlight “unapproved” files/folders in red

2. Type Safety

Rule: All Node/TS modules must use strict TypeScript.

strict: true, noImplicitAny: true, exactOptionalPropertyTypes: true

IDE Config:

Warn/error on any usage

Prevent compilation if TS errors exist

3. Frontend/Backend Framework Enforcement

Rule:

Frontend: React + TypeScript + Zustand + Tailwind

Backend: Node + Express + Socket.IO + Redis + Supabase

AI: Python FastAPI + venv + scikit-learn/XGBoost

IDE Config:

Flag imports from unapproved frameworks/packages

Disable autocomplete for unapproved frameworks

Warn if frontend code uses Node APIs, or backend imports frontend-only code

4. PRD Rules & Functional Requirements Enforcement

Rule: Code must adhere to FR/SR/AI-FR requirements. Examples:

FR-013 → Admin must define max participants

SR-003 → All trades include idempotency key

AI-FR-001 → AI confidence scoring used in QuantEngine

IDE Config:

Use code templates / snippets enforcing these rules

Pre-commit hooks check for:

Session logic functions exist

Signal objects contain required fields

Trade execution includes idempotency checks

5. Security Constraints

Rule:

No deriv tokens in frontend

AES-256-GCM for token encryption

AI layer never writes to DB

IDE Config:

Highlight forbidden API calls (localStorage for tokens, DB writes in Python)

Warn/error on unencrypted token handling

6. State Management

Rule:

Frontend: Zustand stores only

Backend: Redis + in-memory SessionRegistry

Session state must persist after restart

IDE Config:

Flag state usage outside approved stores

Warn if local mutable objects bypass Redux/Zustand/Redis

7. WebSocket & Real-Time Data Handling

Rule:

WS channels strictly for: signals, trades, session updates

No direct DB writes from WS events

IDE Config:

Auto-check WS event payloads against JSON schemas

Warn if backend tries to store raw WS ticks directly

8. AI Layer Isolation

Rule:

Python QIL cannot access tokens, user balances, or session state

Inputs must be numeric features only

IDE Config:

Flag DB access calls in Python

Flag imports of Node modules in Python

Check inference endpoint returns {signal_bias, confidence, regime, model_version, reason}

9. Testing & Validation Enforcement

Rule:

Every module must have unit tests

Critical paths: session lifecycle, signal generation, trade execution, AI scoring

IDE Config:

Warn if files have no tests

Highlight untested exported functions

10. Commit / CI/CD Safety

Rule:

Pre-commit hooks enforce PRD adherence:

JSON schema validation for events

Signal object structure

Idempotency in trades

Token encryption enforcement

IDE Config:

Disable commits if checks fail

Enforce branch naming conventions (feature/..., bugfix/...)

11. Documentation Enforcement

Rule:

Every module must have a README with:

Responsibility

Inputs/outputs

Dependencies

API endpoints documented (schemas, events)

IDE Config:

Warn/error if a new module has no README

Highlight undocumented exported functions

12. Code Linting / Style

Rule:

Use Prettier + ESLint (TS/JS)

Python: black + flake8

IDE Config:

Auto-format on save

Fail commit on lint errors

Before every walkthrough check nd fix any errors in the codebase
