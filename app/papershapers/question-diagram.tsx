import { useId } from "react";
import type { StudyDiagram } from "./study-types";

function ComponentSymbol({ kind, x, y }: { kind: "resistor" | "capacitor"; x: number; y: number }) {
  return kind === "resistor"
    ? <><path d={`M${x - 40} ${y}h15m50 0h15`} /><rect x={x - 25} y={y - 9} width="50" height="18" /></>
    : <path d={`M${x - 40} ${y}h34m12 0h34M${x - 6} ${y - 17}v34M${x + 6} ${y - 17}v34`} />;
}

function DiagramLabel({ text, x, y }: { text: string; x: number; y: number }) {
  const chunks = text.match(/.{1,22}(?:\s|$)|.{1,22}/g) ?? [text];
  return <text x={x} y={y} textAnchor="middle" fill="currentColor" stroke="none">{chunks.map((chunk, index) => <tspan key={index} x={x} dy={index ? 16 : 0}>{chunk.trim()}</tspan>)}</text>;
}

/** SVG is constructed exclusively by React; model data supplies escaped labels. */
export function QuestionDiagram({ diagram }: { diagram?: StudyDiagram | null }) {
  const id = useId();
  if (!diagram || diagram.version !== 1) return null;
  const valid = typeof diagram.description === "string" && diagram.description.length <= 160 && (
    diagram.kind === "circuit" ? ["series", "parallel"].includes(diagram.layout) && typeof diagram.source_label === "string" && diagram.source_label.length <= 48 && Array.isArray(diagram.components) && diagram.components.length > 0 && diagram.components.length <= 4 && diagram.components.every(c => c && ["resistor", "capacitor"].includes(c.kind) && typeof c.label === "string" && c.label.length <= 48) :
    diagram.kind === "uniform-field" ? ["left", "right"].includes(diagram.direction) && typeof diagram.left_label === "string" && typeof diagram.right_label === "string" && diagram.left_label.length <= 48 && diagram.right_label.length <= 48 :
    diagram.kind === "flow" && Array.isArray(diagram.nodes) && diagram.nodes.length > 0 && diagram.nodes.length <= 6 && diagram.nodes.every(n => n && typeof n.id === "string" && typeof n.label === "string" && n.label.length <= 48) && Array.isArray(diagram.edges) && diagram.edges.length <= 8 && diagram.edges.every(e => e && diagram.nodes.some(n => n.id === e.from) && diagram.nodes.some(n => n.id === e.to))
  );
  if (!valid) return <p role="status">This diagram is unavailable. Ask your teacher for clarification before answering.</p>;
  const height = diagram.kind === "flow" ? 90 + diagram.nodes.length * 80 : diagram.kind === "circuit" && diagram.layout === "parallel" ? 140 + diagram.components.length * 70 : 280;
  return <figure className="question-diagram">
    <svg viewBox={`0 0 600 ${height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>{diagram.kind === "circuit" ? "Circuit diagram" : diagram.kind === "flow" ? "Relationship diagram" : "Uniform electric field"}</title>
      <desc id={`${id}-desc`}>{diagram.description}</desc>
      <defs><marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="currentColor" stroke="none" /></marker></defs>
      <g fill="none" stroke="currentColor" strokeWidth="2">
        {diagram.kind === "circuit" && <>
          <path d="M65 70V35H535V70M65 35V80m0 40v30" />
          <path d="M43 80h44M52 120h26" />
          <DiagramLabel x={145} y={90} text={diagram.source_label} />
          {diagram.layout === "series" ? <>
            <path d="M65 150V215H535V35" />
            {diagram.components.map((item, index) => { const x = 140 + index * (320 / Math.max(1, diagram.components.length - 1)); return <g key={index}><rect x={x - 41} y="193" width="82" height="44" fill="white" stroke="none" /><ComponentSymbol kind={item.kind} x={x} y={215} /><DiagramLabel x={x} y={125} text={item.label} /></g>; })}
          </> : <>
            <path d={`M65 150V${100 + diagram.components.length * 70}H535V35`} />
            {diagram.components.map((item, index) => { const y = 170 + index * 70; return <g key={index}><path d={`M65 ${y}H260m80 0H535`} /><circle cx="65" cy={y} r="3" fill="currentColor" /><circle cx="535" cy={y} r="3" fill="currentColor" /><ComponentSymbol kind={item.kind} x={300} y={y} /><DiagramLabel x={300} y={y - 40} text={item.label} /></g>; })}
          </>}
        </>}
        {diagram.kind === "uniform-field" && <>
          <path d="M100 60V230M500 60V230" strokeWidth="5" />
          <DiagramLabel x={100} y={18} text={diagram.left_label} />
          <DiagramLabel x={500} y={18} text={diagram.right_label} />
          {[90, 145, 200].map(y => <path key={y} d={diagram.direction === "right" ? `M125 ${y}H475` : `M475 ${y}H125`} markerEnd={`url(#${id}-arrow)`} />)}
        </>}
        {diagram.kind === "flow" && <>
          {diagram.edges.map((edge, index) => { const from = diagram.nodes.findIndex(n => n.id === edge.from); const to = diagram.nodes.findIndex(n => n.id === edge.to); const lane = 510 + index * 9; return <path key={index} d={`M480 ${60 + from * 80}H${lane}V${60 + to * 80}H480`} markerEnd={`url(#${id}-arrow)`} />; })}
          {diagram.nodes.map((node, index) => <g key={node.id}><rect x="60" y={35 + index * 80} width="420" height="50" rx="4" /><DiagramLabel x={270} y={52 + index * 80} text={node.label} /></g>)}
        </>}
      </g>
    </svg>
    <figcaption>{diagram.description}</figcaption>
  </figure>;
}
