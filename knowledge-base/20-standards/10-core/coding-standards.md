# Coding Standards

## Purpose

Concrete coding rules that apply across stacks unless a more specific standard
narrows them.

## Rules

- Keep modules focused and name them after their responsibility.
- Prefer explicit dependencies over hidden global state.
- Make side effects visible at the edges of the system.
- Keep public interfaces small and stable.
- Use structured error values or exceptions consistently within a module.

## Preferred Patterns

- Constructor or parameter injection for infrastructure dependencies.
- Small adapters around external services.
- Pure functions for domain logic where feasible.

## Forbidden Patterns

- Static service locators.
- Utility modules that accumulate unrelated behavior.
- Implicit coupling through environment access deep inside domain code.
