# React Native Standards

## Purpose

Framework-specific standards for React Native applications.

## Rules

- Keep screens focused on orchestration and move reusable logic into hooks or
  services.
- Isolate platform-specific branches behind small adapters or components.
- Treat network, storage, and permission boundaries as failure-prone paths.
- Keep navigation contracts explicit and typed.

## Preferred Patterns

- Functional components and hooks.
- Thin UI components over typed state and domain actions.
- Explicit loading, empty, and error states for async views.

## Forbidden Patterns

- Business logic embedded directly in screen components.
- Unbounded global state for local screen concerns.
- Implicit navigation params without typed contracts.
