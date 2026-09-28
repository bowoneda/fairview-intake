import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Evidence {
  id: string;
  actor: string;
  action: string;
  expected: string;
  actual: string;
  pass: boolean;
}

const entries: Evidence[] = [];
const startedAt = new Date().toISOString();

/** Record one observed result. The report keeps what actually happened, not only pass or fail. */
export function record(entry: Evidence): Evidence {
  entries.push(entry);
  return entry;
}

/** Summarize a Supabase response as evidence text: row count, or error code and message. */
export function describe(res: { data: unknown; error: { code?: string; message: string } | null }): string {
  if (res.error) return `error ${res.error.code ?? "?"}: ${res.error.message}`;
  if (Array.isArray(res.data)) return `${res.data.length} row(s)`;
  return res.data === null ? "no data" : `data: ${JSON.stringify(res.data)}`;
}

export function writeReport(projectRef: string): string {
  const dir = join(process.cwd(), "tests", "isolation", "reports");
  mkdirSync(dir, { recursive: true });
  const stamp = startedAt.replace(/[:.]/g, "-");
  const passed = entries.filter((e) => e.pass).length;

  const json = { suite: "cross tenant isolation", projectRef, startedAt, finishedAt: new Date().toISOString(),
                 total: entries.length, passed, failed: entries.length - passed, entries };
  writeFileSync(join(dir, `isolation-${stamp}.json`), JSON.stringify(json, null, 2));

  const lines = [
    `# Isolation report ${startedAt}`,
    "",
    `Project ref: ${projectRef}. ${passed} of ${entries.length} checks passed.`,
    "",
    "| Check | Actor | Action | Expected | Actual | Result |",
    "|---|---|---|---|---|---|",
    ...entries.map((e) =>
      `| ${e.id} | ${e.actor} | ${e.action} | ${e.expected} | ${e.actual.replace(/\|/g, "/")} | ${e.pass ? "PASS" : "FAIL"} |`),
  ];
  const mdPath = join(dir, `isolation-${stamp}.md`);
  writeFileSync(mdPath, lines.join("\n") + "\n");
  return mdPath;
}
