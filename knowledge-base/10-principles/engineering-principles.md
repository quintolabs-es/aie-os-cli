# Engineering Principles

## Purpose

Stable cross-project reasoning rules that guide implementation decisions.

## Rules

- Ship iteratively. Prefer the smallest valuable change on the direct path to
  the goal.
- Choose simplicity over convenience. Prefer simple systems and simple
  solutions, even when they require more design effort upfront.
- Optimize for long-term engineering efficiency. Reduce repeated work with
  automation, better abstractions, and cleaner workflows.
- Build quality in from the start. Quality is not a cleanup phase after
  delivery.
- Reliability is a product requirement. Availability, security, performance,
  and operability are part of the implementation bar.
- Preserve clear ownership. Systems, services, and operational responsibilities
  need explicit owners.
- Keep boundaries clear and coupling low. Align components with real business
  capabilities and avoid entangled systems.
- Design for autonomous evolution. Teams and systems should be able to change,
  deploy, and recover independently.
- Treat APIs and interfaces as products. Make contracts explicit, review them
  early, and evolve them without breaking consumers.
- Prefer observability over guesswork. Logging, metrics, tracing, alerts, and
  runbooks are part of system design.
- Document decisions and operating context. Keep architecture and operational
  documentation concise, current, and close to the work.
- Favor measurable improvement over process theater. Use process only when it
  creates real clarity, safety, or speed.
- Engineer with the full lifecycle in mind. Building, operating, debugging, and
  supporting the system are one continuous responsibility.
- Protect developer velocity by reducing accidental complexity. Tooling,
  testing, and local workflows should shorten feedback loops.
- Standardize where it increases consistency and trust. Leave room for local
  choice only when it does not weaken core principles.

## Preferred Patterns

- Small, composable units with explicit inputs and outputs.
- Backward-compatible evolution of public interfaces.
- Automation for repeated operational or development work.
- Observable system boundaries with clear ownership and recovery paths.
- Documentation that stays close to the code and operating reality.

## Forbidden Patterns

- Speculative generality without a proven need.
- Hidden side effects across module boundaries.
- Swallowing exceptions or returning ambiguous empty results without context.
- Process that adds ceremony without improving outcomes.
- Local conventions that weaken shared principles without explicit justification.
