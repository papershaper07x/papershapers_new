import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuestionDiagram } from "../app/papershapers/question-diagram";
import type { StudyDiagram } from "../app/papershapers/study-types";
import katex from "katex";
import "katex/contrib/mhchem";

test("chemistry and calculus notation render without unsupported commands", () => {
  for (const text of [String.raw`\ce{2H2 + O2 -> 2H2O}`, String.raw`\int_0^1 x^2\,dx`, String.raw`\frac{dy}{dx}`]) {
    assert.match(katex.renderToString(text, { throwOnError: true }), /katex/);
  }
});

test("diagrams render escaped labels and accessible descriptions", () => {
  const diagram: StudyDiagram = {version: 1, kind: "circuit", layout: "parallel", source_label: "12 V", components: [{kind: "resistor", label: "<script>"}, {kind: "capacitor", label: "C = 2 μF"}], description: "Two parallel branches."};
  const html = renderToStaticMarkup(<QuestionDiagram diagram={diagram} />);
  assert.match(html, /role="img"/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /Two parallel branches/);
  assert.doesNotMatch(html, /<script>/);
});

test("legacy papers omit diagrams and malformed kinds fail visibly", () => {
  assert.equal(renderToStaticMarkup(<QuestionDiagram />), "");
  assert.match(renderToStaticMarkup(<QuestionDiagram diagram={{version: 1, kind: "unsupported", description: "Bad"} as unknown as StudyDiagram} />), /unavailable/);
});
