# TypeScript Standards

## Purpose

Language-specific standards for TypeScript codebases.

## Rules

- Use strict compiler settings and keep type errors at zero.
- Prefer explicit domain types over loose object literals.
- Validate untrusted runtime input at the boundary before narrowing types.
- Keep asynchronous flows explicit and handle rejected promises.

## Preferred Patterns

- Discriminated unions for state and result modeling.
- Named exports for reusable modules.
- `readonly` data where mutation is not required.

## Forbidden Patterns

- `any` in production code without a documented boundary reason.
- Type assertions used to bypass missing validation.
- Shared mutable module state for request-scoped behavior.
