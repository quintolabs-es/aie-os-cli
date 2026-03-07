# CSharp Standards

## Purpose

Language and runtime standards for .NET and C# codebases.

## Rules

- Enable nullable reference types and address warnings intentionally.
- Pass `CancellationToken` through async flows that can be cancelled.
- Keep domain logic out of controllers and infrastructure layers.
- Keep dependency registration explicit and close to composition roots.

## Preferred Patterns

- Dependency injection through constructors.
- Small application services with explicit command or query responsibilities.
- Structured logging with contextual properties.

## Forbidden Patterns

- Blocking on async code with `.Result` or `.Wait()`.
- Static mutable state for request or user-specific data.
- Catch-all exception handlers that hide the original failure.
