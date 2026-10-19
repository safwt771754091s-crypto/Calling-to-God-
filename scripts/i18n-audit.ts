import "dotenv/config";
import { auditDictionaries } from "../src/i18n/keys";
import { localeMeta } from "../src/i18n/config";

/**
 * Translation-drift audit. Compares every locale dictionary against English and
 * exits non-zero if any locale is missing keys, carries extras, or has blanks.
 * Run in CI so a half-translated page can never ship silently.
 *
 *   tsx scripts/i18n-audit.ts            # fail on any drift
 *   tsx scripts/i18n-audit.ts --warn     # report but exit 0
 */
const warnOnly = process.argv.includes("--warn");

const reports = auditDictionaries();
let problems = 0;

for (const r of reports) {
  const name = `${r.locale} (${localeMeta[r.locale].nativeName})`;
  if (r.complete) {
    console.log(`  ✓ ${name.padEnd(22)} complete`);
    continue;
  }
  problems++;
  console.log(`  ✗ ${name.padEnd(22)} missing=${r.missing.length} extra=${r.extra.length} empty=${r.empty.length}`);
  for (const k of r.missing.slice(0, 10)) console.log(`      - missing: ${k}`);
  for (const k of r.extra.slice(0, 10)) console.log(`      - extra:   ${k}`);
  for (const k of r.empty.slice(0, 10)) console.log(`      - empty:   ${k}`);
}

console.log(`\n${reports.length - problems}/${reports.length} locales complete.`);

if (problems > 0 && !warnOnly) {
  console.error("i18n audit failed — translation drift detected.");
  process.exit(1);
}
