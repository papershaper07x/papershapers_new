# Scientific question content

Paper Shapers uses JSON as its structured paper contract. Question text, options and answer outlines contain Markdown with `$...$` or `$$...$$` LaTeX. README, RTF and HTML are not interchange formats. JSON preserves identity, marks, choices, diagram data and answer boundaries; Markdown handles prose and KaTeX handles notation.

## Formulas

Use `\int_0^1 x^2\,dx`, `\frac{dy}{dx}` and `\ce{2H2 + O2 -> 2H2O}` inside math delimiters. Backslashes must be escaped in serialized JSON. The existing KaTeX dependency supplies the mhchem extension. No external image service is used.

## Optional question diagram, version 1

```json
{
  "version": 1,
  "kind": "circuit",
  "layout": "parallel",
  "source_label": "12 V",
  "components": [
    {"kind": "resistor", "label": "R1 = 4 Ω"},
    {"kind": "capacitor", "label": "C1 = 2 μF"}
  ],
  "description": "A 12 V battery connected across separate resistor and capacitor branches."
}
```

- `circuit`: series or parallel; one battery, one to four resistor/capacitor components. Parallel components are separate branches; series components occupy one closed loop. These are ideal schematic circuits, not simulations. No arbitrary wiring or switches in version 1.
- `uniform-field`: `direction` left/right, `left_label` and `right_label`. A schematic illustration of a uniform field between plates; no numerical field calculation.
- `flow`: one to six `nodes` with unique `id` and `label`, up to eight directed `edges` with `from` and `to` referencing existing nodes. Fixed vertical layout expresses process/system relationships, not physical geometry. Self edges are unsupported.
- Every diagram requires `description` (1–160 characters), describing visible data without supplying the answer. All other labels are 1–48 characters. Labels are plain text; LaTeX belongs in surrounding question text. Labels should be concise.

The backend validates diagrams during generation before saving and retries invalid model output through the existing provider contract. Section-grouped responses preserve diagram data. Generation cache keys include diagram schema version. Stored paper JSON requires no new database migration. Earlier papers with no diagram remain compatible and do not acquire one retroactively.

Question content is shared by reading/printing, practice, Live Rooms, results and teacher feedback. The original diagram accompanies the assessment prompt and result snapshot; the model does not redraw it during review. Frontend SVG contains code-owned geometry and React-escaped text, never model-provided SVG/HTML or remote URLs. Accessible SVG descriptions and visible captions accompany diagrams. Printing uses the same SVG.

## Limits and next steps

This release supports question diagrams only. Worked-solution diagrams, learner drawing inputs, molecular bond structures/SMILES, arbitrary circuits, optics, calculated electromagnetic fields and general graph plotting need further versioned contracts. Existing student answer outlines remain separate from question diagrams. Schema checks establish valid structure, not scientific correctness or equivalence between prose and drawing; educator review remains necessary. Diagrams are optional, so their presence in real generation depends on topic and model output.
