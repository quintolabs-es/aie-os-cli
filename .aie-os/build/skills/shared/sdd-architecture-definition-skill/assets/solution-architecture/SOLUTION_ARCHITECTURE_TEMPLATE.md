# Solution Architecture

Use the bounded-context structure only when the solution contains more than one bounded context.
When the solution contains one bounded context, omit the Bounded Context heading and Responsibility section, and promote Components and Third-Party Dependencies by one heading level.

## Bounded Context: [Bounded Context Name] (Optional)

### Responsibility

Describe the business responsibility and boundary of the bounded context.

*Example: Mission Operations owns the operational view of active missions, including their current status, progress, and operational events. It does not own flight planning or aircraft telemetry collection.*

---

### Components

#### Component: [Component Name]

**Responsibility**

Describe the primary responsibility of the component in one short, verb-led statement at the main entity or architectural capability level.
Include the data it owns or the interface it exposes when relevant.
Do not enumerate operations, use cases, or detailed behavior.

*Example: Offer a REST API for managing missions and operational mission state.*

**Component Boundary Rationale** (Optional)

Explain why this responsibility requires a separate component only when the boundary is not obvious.

*Example: The API isolates the externally accessible mission interface from internal telemetry processing.*

**Technology Stack**

List the programming language, application framework, and other technologies used within the component.
Place rationale beside a specific technology only when the choice is not obvious.
Represent independently operated databases, message brokers, user interfaces, APIs, background processors, and services as separate components rather than technologies inside another component.

*Example:*

*- C# and .NET 10.*
*- ASP.NET Core Minimal APIs.*
*- ASP.NET Core health checks: selected to integrate with the existing operational monitoring platform.*

**Interactions** (Optional)

List the other components this component accesses or communicates with.
State the direction explicitly and include the mechanism when relevant.

*Example:*

*- Reads and writes mission data in the Mission Database.*
*- Calls the Flight Data Adapter API to retrieve current flight telemetry.*
*- Publishes mission status changes to the Mission Events Broker through Kafka.*
*- Receives mission-management requests from the Mission Operations Web App through its REST API.*

---

#### Component: [Component Name]

Repeat the same structure for each additional component in this bounded context.

*Example: Represent Mission Database as a separate component with the responsibility "Store mission and operational mission-state data" and PostgreSQL as its technology stack.*

---

### Third-Party Dependencies (Optional)

#### Third Party: [Third-Party Name]

**Ownership**

Explicitly identify the dependency as externally owned.

*Example: Externally owned and operated by the flight-data provider.*

**Used By**

List the internal components that use the third-party dependency.

*Example: Mission Monitoring Service.*

**Purpose**

Describe why the dependency is required by this bounded context.

*Example: Supplies the aircraft position and telemetry used to maintain the operational view of active missions.*

**Interaction**

Describe how the internal components interact with the third party and the relevant responsibility boundary.

*Example: Mission Monitoring Service consumes telemetry through the provider's event stream. The provider owns telemetry collection and delivery; Mission Monitoring owns its interpretation within the mission domain.*

**Dependency Rationale** (Optional)

Explain the dependency choice only when its rationale is not obvious.

*Example: The existing provider remains the authoritative organizational source for aircraft telemetry.*

---

#### Third Party: [Third-Party Name]

Repeat the same structure for each additional third-party dependency used by this bounded context.

---

## Bounded Context: [Bounded Context Name]

Repeat the same structure for each additional bounded context.
