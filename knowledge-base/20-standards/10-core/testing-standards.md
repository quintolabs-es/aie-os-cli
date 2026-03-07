# Testing Standards

## Purpose

Define the default testing expectations for new or changed behavior.

## Rules

- Add tests for every behavior change or bug fix.
- Test observable behavior instead of private implementation details.
- Cover system boundaries with integration tests when contracts matter.
- Keep test setup small and readable.

## Preferred Patterns

- Unit tests for domain logic.
- Integration tests for persistence, network, or framework boundaries.
- Regression tests for previously broken behavior.

## Forbidden Patterns

- Snapshot-heavy tests without focused assertions.
- Tests that only verify mocks interacted in a certain order.
- Broad end-to-end coverage as the only test layer.
