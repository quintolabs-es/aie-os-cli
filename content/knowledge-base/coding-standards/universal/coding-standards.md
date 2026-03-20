- Keep modules focused and name them after their responsibility.
- Organize code by vertical feature when it improves cohesion, change locality,
  and maintainability.
- Keep the artifacts needed to implement one feature close together.
- Prefer explicit dependencies over hidden global state.
- Prefer self-explanatory code over comments. Use comments only when intent
  cannot be made clear through naming and structure.
- Changes must pass the strongest available compile-time or static validation
  for the stack before they are considered complete.
- Make side effects visible at the edges of the system.
- Separate decision logic from side-effect execution to keep business logic
  testable. Return side-effect plans as data, then apply them in a dedicated
  executor when practical.

  ```ts
  const plan = shouldCreateFile ? { filePath: "out.txt", fileContent: "..." } : null;
  await fileWriter.apply(plan);
  ```
- Keep public interfaces small and stable.
- Use structured error values or exceptions consistently within a module.
- README files must explain setup, run, and deployment with direct commands.
- Tool READMEs must explain usage directly and prefer command examples.
- Write command-line documentation command-first. Show the command in its final form with concise placeholders like `<value>` or `<value1,value2>`, and avoid explanatory prose before the command.
- Prefer constructor or parameter injection for infrastructure dependencies.
- Prefer small adapters around external services.
- Prefer pure functions for domain logic where feasible.
- Do not use static service locators.
- Do not use broad technical-layer separation that scatters one feature across too many unrelated folders.
- Do not create utility modules that accumulate unrelated behavior.
- Do not couple domain code implicitly through deep environment access.
