#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
//  cli.js — `npm run balance-report`. Runs the full coverage matrix and
//  writes tools/balanceSim/reports/report.json + report.md.
//
//  Flags: --trials=N (default 60), --budget=N (default 500), --seed=N (default 1)
// ─────────────────────────────────────────────────────────────────────────────
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runCoverageMatrix, detectOutliers } from "./matrix.js";
import { buildJsonReport, buildMarkdownReport } from "./report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function argNum(flag, fallback) {
  const arg = process.argv.find(a => a.startsWith(`--${flag}=`));
  return arg ? Number(arg.split("=")[1]) : fallback;
}

const trials = argNum("trials", 60);
const budget = argNum("budget", 500);
const seed = argNum("seed", 1);

console.log(`Running balance coverage matrix (trials=${trials}, budget=${budget}, seed=${seed})...`);
const t0 = Date.now();
const matrix = runCoverageMatrix({ trials, budget, baseSeed: seed });
const outliers = detectOutliers(matrix);
console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s. ${outliers.matchupOutliers.length} matchup outliers, ${outliers.efficiencyOutliers.length} efficiency outliers.`);

const outDir = join(__dirname, "reports");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "report.json"), JSON.stringify(buildJsonReport(matrix, outliers), null, 2));
writeFileSync(join(outDir, "report.md"), buildMarkdownReport(matrix, outliers));
console.log(`Wrote ${join(outDir, "report.json")} and ${join(outDir, "report.md")}`);
