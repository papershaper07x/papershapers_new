import fs from "node:fs";
import readline from "node:readline";
import { pathToFileURL } from "node:url";

// Accept NDJSON or host-export lines with a prefix. Never echo raw input.
export async function summarizeTraces(stream, requestId) {
  const groups = new Map();
  for await (const line of readline.createInterface({ input: stream, crlfDelay: Infinity })) {
    let record;
    try { record = JSON.parse(line.slice(line.indexOf("{"))); } catch { continue; }
    if (record.schema !== 1 || !["web", "backend"].includes(record.service) || !["page.request", "http.request", "backend.request", "generation.job", "llm.attempt", "llm.usage"].includes(record.event)) continue;
    if (requestId && record.requestId !== requestId) continue;
    // Operation values originate in server allowlists/route templates. Reject unsafe export data.
    if (typeof record.operation !== "string" || !/^[a-zA-Z0-9./{}_-]{1,100}$/.test(record.operation)) continue;
    const outcome = ["queued", "started", "completed", "failed", "blocked", "cancelled"].includes(record.outcome) ? record.outcome : "";
    const key = `${record.service} ${record.event} ${record.operation} ${outcome}`.trim();
    const group = groups.get(key) ?? { count: 0, errors: 0, durationCount: 0, durationTotal: 0, durationMax: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, inputSamples: 0, outputSamples: 0, totalSamples: 0 };
    group.count++;
    if (record.status >= 400 || ["failed", "blocked"].includes(outcome)) group.errors++;
    if (Number.isFinite(record.durationMs) && record.durationMs >= 0) {
      group.durationCount++;
      group.durationTotal += record.durationMs;
      group.durationMax = Math.max(group.durationMax, record.durationMs);
    }
    for (const field of ["inputTokens", "outputTokens", "totalTokens"]) if (Number.isSafeInteger(record[field]) && record[field] >= 0) {
      group[field] += record[field];
      group[field.replace("Tokens", "Samples")]++;
    }
    groups.set(key, group);
  }
  return [...groups].map(([group, data]) => ({ group, ...data, inputTokens: data.inputSamples ? data.inputTokens : null, outputTokens: data.outputSamples ? data.outputTokens : null, totalTokens: data.totalSamples ? data.totalTokens : null, durationMean: data.durationCount ? Math.round(data.durationTotal / data.durationCount) : null }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: node scripts/summarize-traces.mjs <export.ndjson> [request-id]");
  const report = await summarizeTraces(fs.createReadStream(file), process.argv[3]);
  console.table(report.map((row) => ({ group: row.group, count: row.count, errors: row.errors, meanMs: row.durationMean, maxMs: row.durationCount ? row.durationMax : null, reportedTokens: row.totalTokens === null ? "unknown" : `${row.totalTokens} (${row.totalSamples} reports)` })));
}
