---
name: create-drawio-diagrams
description: Use this skill when the user wants to create or edit draw.io diagrams. It helps author valid `.drawio` XML with explicit shapes, containers, connectors, routing, labels, and layout.
---

# Drawio Diagrams

Use this skill when the user wants a draw.io diagram and the output should be editable `.drawio` XML.

## Outcome

- Produce valid `.drawio` XML that opens in draw.io.
- Keep diagram structure, layout, and routing explicit in the XML.
- Preserve editability by using native draw.io cells, geometry, and styles.

## Required input

- diagram title
- nodes, labels, and relationships
- preferred layout direction or grouping, when known
- output path, when the user specifies one

## Workflow

1. Confirm the diagram request is specific enough to identify nodes and relationships.
2. Plan the layout before writing coordinates.
3. Write a complete `.drawio` XML file using the required skeleton.
4. Use native vertex cells for shapes and native edge cells for connectors.
5. Use parent-child containment for containers instead of visually stacking shapes.
6. Route edges with entry and exit points, waypoints, and spacing corridors when needed.
7. Validate the XML structure before handing it off.

## XML Skeleton

Start every file with this structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio" version="26.0.0">
  <diagram name="Page-1">
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

Rules:

- `id="0"` and `id="1"` are required root cells.
- Put top-level diagram cells under `parent="1"`.
- Put contained cells under their container cell id.
- Use stable, unique cell ids.
- Use `html=1` in text-bearing styles.
- Escape XML attribute values: `&amp;`, `&lt;`, `&gt;`, and `&quot;`.
- Use `&#xa;` for line breaks inside `value` attributes.
- Do not place `--` inside XML comments.

## Shapes

Use vertex cells with an `mxGeometry` child:

```xml
<mxCell id="service" value="Service" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="160" height="60" as="geometry" />
</mxCell>
```

Common shape styles:

- `rounded=0` for plain rectangles.
- `rounded=1` for services or modules.
- `ellipse;` for circles and ovals.
- `rhombus;` for decisions.
- `shape=cylinder3;` for databases.
- `swimlane;startSize=30;` for titled containers.

Do not guess complex vendor shape names. If exact official shapes are unavailable, use simple native shapes with clear labels.

## Containers

Use draw.io containment for grouped architecture, not a large background shape with unrelated children layered on top.

```xml
<mxCell id="container" value="User Service" style="swimlane;startSize=30;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="300" height="200" as="geometry" />
</mxCell>
<mxCell id="api" value="REST API" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="container">
  <mxGeometry x="20" y="40" width="120" height="60" as="geometry" />
</mxCell>
```

Rules:

- Use child coordinates relative to the container.
- Add `pointerEvents=0;` to containers that should not capture child-to-child connections.
- Use swimlanes when the group needs a visible title bar or the container itself has connections.

## Connectors

Every edge cell must use expanded XML and include `<mxGeometry relative="1" as="geometry" />`.

```xml
<mxCell id="edge1" value="HTTP" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;" edge="1" parent="1" source="client" target="service">
  <mxGeometry relative="1" as="geometry" />
</mxCell>
```

Rules:

- Never use self-closing edge cells.
- Always include `rounded=1;orthogonalLoop=1;jettySize=auto`.
- Pin `exitX`, `exitY`, `entryX`, and `entryY` when a node has multiple connections.
- Add waypoints when an edge needs to route around another shape:

```xml
<mxGeometry relative="1" as="geometry">
  <Array as="points">
    <mxPoint x="500" y="50" />
  </Array>
</mxGeometry>
```

- Leave at least 20px for the final straight segment into an arrowhead.
- For animated data-flow connectors, add `flowAnimation=1;` to the edge style.

## Connection Ports

Use these port positions for predictable routing:

- top center: `entryX=0.5;entryY=0` or `exitX=0.5;exitY=0`
- right center: `entryX=1;entryY=0.5` or `exitX=1;exitY=0.5`
- bottom center: `entryX=0.5;entryY=1` or `exitX=0.5;exitY=1`
- left center: `entryX=0;entryY=0.5` or `exitX=0;exitY=0.5`

When several edges connect to the same side, distribute them evenly. For three bottom-side connections, use `0.25`, `0.5`, and `0.75` for `entryX` or `exitX`.

## Layout

- Snap all `x`, `y`, `width`, and `height` values to multiples of 10.
- Use at least 200px horizontal gap and 150px vertical gap for simple diagrams.
- Use at least 280px horizontal gap and 200px vertical gap for medium diagrams.
- Use at least 350px horizontal gap and 250px vertical gap for complex diagrams.
- Leave about 80px of empty corridor between rows or columns for edge routing.
- Group related nodes in the same horizontal or vertical band.
- Place heavily connected hub nodes centrally.
- For hierarchical layouts, place nodes in layers and connect adjacent layers where practical.
- For event bus patterns, place the bus in the center of the service row so producers and consumers connect with short horizontal arrows.

## Palette

Use simple semantic colors unless the user specifies a style:

- services and clients: `fillColor=#dae8fc;strokeColor=#6c8ebf`
- databases and success states: `fillColor=#d5e8d4;strokeColor=#82b366`
- queues and decisions: `fillColor=#fff2cc;strokeColor=#d6b656`
- gateways and APIs: `fillColor=#ffe6cc;strokeColor=#d79b00`
- errors and alerts: `fillColor=#f8cecc;strokeColor=#b85450`
- external or neutral systems: `fillColor=#f5f5f5;strokeColor=#666666`
- security and auth: `fillColor=#e1d5e7;strokeColor=#9673a6`

When three or more semantic colors are used, add a small legend in an open corner.

## Validation

Before finalizing:

- Check that every `mxCell` id is unique.
- Check that every edge `source` and `target` references an existing cell.
- Check that all non-root cells have a valid parent.
- Check that every vertex has `mxGeometry`.
- Check that every edge has expanded `mxGeometry relative="1"`.
- Check that XML special characters are escaped.
- Check that labels fit inside their shapes.
- Check that connectors do not cross unrelated shapes when a waypoint or spacing change would avoid it.
