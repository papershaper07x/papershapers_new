"""Bounded diagram specifications, never executable markup."""
def validate_diagram(value):
    if value is None:
        return
    if not isinstance(value, dict) or value.get("version") != 1:
        raise ValueError("Unsupported diagram version")
    def label(text, limit=48):
        if not isinstance(text, str) or not text.strip() or len(text) > limit:
            raise ValueError("Diagram labels must be nonempty and within their length limit")
    label(value.get("description"), 160)
    kind = value.get("kind")
    if kind == "circuit":
        if value.get("layout") not in ("series", "parallel"):
            raise ValueError("Unsupported circuit layout")
        label(value.get("source_label"))
        items = value.get("components")
        if not isinstance(items, list) or not 1 <= len(items) <= 4:
            raise ValueError("Circuits require one to four components")
        for item in items:
            if not isinstance(item, dict) or item.get("kind") not in ("resistor", "capacitor"):
                raise ValueError("Unsupported circuit component")
            label(item.get("label"))
    elif kind == "uniform-field":
        if value.get("direction") not in ("left", "right"):
            raise ValueError("Unsupported field direction")
        label(value.get("left_label"))
        label(value.get("right_label"))
    elif kind == "plot":
        import math
        points, lines = value.get("points"), value.get("lines")
        if not isinstance(points, list) or not 2 <= len(points) <= 24 or not isinstance(lines, list) or len(lines) > 24:
            raise ValueError("Plot requires two to 24 points and up to 24 lines")
        ids = set()
        for point in points:
            if not isinstance(point, dict):
                raise ValueError("Invalid plot point")
            label(point.get("id"))
            label(point.get("label"))
            if point["id"] in ids or any(type(point.get(axis)) not in (int, float) or not math.isfinite(point[axis]) or not 20 <= point[axis] <= (580 if axis == "x" else 260) for axis in ("x", "y")):
                raise ValueError("Invalid plot point")
            ids.add(point["id"])
        for line in lines:
            if not isinstance(line, dict) or line.get("from") not in ids or line.get("to") not in ids or line["from"] == line["to"]:
                raise ValueError("Invalid plot connection")
    elif kind == "flow":
        nodes, edges = value.get("nodes"), value.get("edges")
        if not isinstance(nodes, list) or not 1 <= len(nodes) <= 6 or not isinstance(edges, list) or len(edges) > 8:
            raise ValueError("Flow diagrams require up to six nodes and eight edges")
        ids = set()
        for node in nodes:
            if not isinstance(node, dict):
                raise ValueError("Invalid flow node")
            label(node.get("id"))
            label(node.get("label"))
            if node["id"] in ids:
                raise ValueError("Duplicate flow node")
            ids.add(node["id"])
        for edge in edges:
            if not isinstance(edge, dict) or not isinstance(edge.get("from"), str) or not isinstance(edge.get("to"), str) or edge["from"] not in ids or edge["to"] not in ids or edge["from"] == edge["to"]:
                raise ValueError("Invalid flow connection")
    else:
        raise ValueError("Unsupported diagram kind")

DIAGRAM_GUIDANCE = {
    "plot": {"version": 1, "kind": "plot", "points": [{"id": "A", "label": "A", "x": 100, "y": 220}, {"id": "B", "label": "B", "x": 300, "y": 60}], "lines": [{"from": "A", "to": "B"}], "description": "Line joining A and B. Schematic, not to scale."},
    "rules": "Optional diagram must be version 1 JSON, never HTML, SVG, image URLs or executable code. Use only when relevant. Labels are plain text <=48 characters; description <=160 characters. Description explains all visible information without revealing the answer. Circuits are ideal closed loops with one battery; parallel components are individual branches. Uniform-field is schematic, not calculated. Plot coordinates are layout pixels on a 600x280 schematic, not mathematical coordinates; use explicit coordinate/length labels and state not to scale. Flow diagrams show relationships, not spatial architecture. Omit unsupported diagrams.",
    "circuit": {"version": 1, "kind": "circuit", "layout": "series|parallel", "source_label": "12 V", "components": [{"kind": "resistor|capacitor", "label": "R1 = 4 ohm"}], "description": "Accessible description"},
    "uniform-field": {"version": 1, "kind": "uniform-field", "direction": "left|right", "left_label": "+ plate", "right_label": "- plate", "description": "Accessible description"},
    "flow": {"version": 1, "kind": "flow", "nodes": [{"id": "A", "label": "Input"}, {"id": "B", "label": "Output"}], "edges": [{"from": "A", "to": "B"}], "description": "Accessible description"}
}
