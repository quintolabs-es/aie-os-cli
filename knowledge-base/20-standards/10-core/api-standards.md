# API Standards

## Purpose

Provide default conventions for designing and evolving APIs.

## Rules

- Keep request and response shapes explicit and versionable.
- Validate inputs at the boundary and return actionable error information.
- Prefer additive changes over breaking changes.
- Make idempotency expectations explicit for mutating operations.

## Preferred Patterns

- Structured error payloads with stable machine-readable codes.
- Consistent pagination, filtering, and sorting semantics.
- Contract tests for externally consumed APIs.

## Forbidden Patterns

- Leaking internal exception messages directly to clients.
- Inconsistent naming across adjacent endpoints.
- Silent coercion of invalid input.
