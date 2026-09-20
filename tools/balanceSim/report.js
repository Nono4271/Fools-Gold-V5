// ─────────────────────────────────────────────────────────────────────────────
//  report.js — turns a coverage matrix + outlier result into a JSON payload
//  and a human-readable Markdown summary.
// ─────────────────────────────────────────────────────────────────────────────
import { THRESHOLDS } from "./matrix.js";

export function buildJsonReport(matrix, outliers) {
  return {
    generatedAt: new Date().toISOString(),
    config: matrix.config,
    unitCount: matrix.catalog.length,
    matchupCounts: {
      sameTier: Object.values(matrix.bracketMatchups).reduce((s, arr) => s + arr.length, 0),
      mirror: matrix.mirrorMatchups.length,
      crossTier: matrix.crossTierMatchups.length,
    },
    thresholds: THRESHOLDS,
    matchupOutliers: outliers.matchupOutliers,
    efficiencyOutliers: outliers.efficiencyOutliers,
  };
}

function pct(n) { return `${(n * 100).toFixed(0)}%`; }

export function buildMarkdownReport(matrix, outliers) {
  const lines = [];
  lines.push("# Battle Balance Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`- Units in catalog: **${matrix.catalog.length}** (${matrix.catalog.filter(l=>l.kind==='faction').length} faction branches, ${matrix.catalog.filter(l=>l.kind==='neutral').length} neutrals, ${matrix.catalog.filter(l=>l.kind==='ancient').length} Ancients)`);
  lines.push(`- Budget per side: **${matrix.config.budget}** command points, **${matrix.config.trials}** seeded trials per matchup`);
  lines.push(`- Same-tier matchups run: **${Object.values(matrix.bracketMatchups).reduce((s, a) => s + a.length, 0)}**`);
  lines.push(`- Mirror matchups run: **${matrix.mirrorMatchups.length}**, cross-tier spot-checks: **${matrix.crossTierMatchups.length}**`);
  lines.push("");

  lines.push("## Efficiency outliers (>2 std dev from tier mean)");
  lines.push("");
  if (outliers.efficiencyOutliers.length === 0) {
    lines.push("None flagged.");
  } else {
    lines.push("| Bracket | Unit | Efficiency | Tier mean | Tier std dev | Z-score |");
    lines.push("|---|---|---|---|---|---|");
    for (const o of outliers.efficiencyOutliers) {
      lines.push(`| ${o.bracket} | ${o.label} | ${o.efficiency.toFixed(3)} | ${o.bracketMeanEfficiency.toFixed(3)} | ${o.bracketStdDevEfficiency.toFixed(3)} | ${o.zScore.toFixed(2)} |`);
    }
  }
  lines.push("");

  lines.push("## Same-tier matchup outliers (win rate >70% or <30%)");
  lines.push("");
  lines.push(`**${outliers.matchupOutliers.length}** of ${Object.values(matrix.bracketMatchups).reduce((s, a) => s + a.length, 0)} same-tier, same-budget matchups flagged.`);
  lines.push("");
  lines.push("This count is informational, not a pass/fail gate on its own — see the ReadMeAI entry for why "
    + "(budget-normalized troop counts mean 1-branch-vs-1-branch fights are inherently rock/paper/scissors at scale; "
    + "the gate is the per-unit efficiency check above).");
  lines.push("");
  const worst = [...outliers.matchupOutliers].sort((a, b) => Math.abs(b.winRate - 0.5) - Math.abs(a.winRate - 0.5)).slice(0, 25);
  lines.push("Top 25 most lopsided:");
  lines.push("");
  lines.push("| Bracket | Attacker | Defender | Win rate |");
  lines.push("|---|---|---|---|");
  for (const o of worst) {
    lines.push(`| ${o.bracket} | ${o.attacker} | ${o.defender} | ${pct(o.winRate)} |`);
  }
  lines.push("");

  return lines.join("\n");
}
