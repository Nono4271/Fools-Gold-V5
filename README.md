# Fools Gold V5 — ReadMeAI Audit Delivery

## What changed
Only one file was edited: **`ReadMeAI.md`** — the "CURRENT AUDIT AND ROADMAP"
section (old lines 527-865) was fully rewritten. Everything else in the file
(the full changelog history, before and after that section) is untouched.

## Why
The old roadmap section was last consolidated 2026-09-20, but 20+ later
sessions (chat system, Relations, Nyro companion, Crew 2.0 Fortress/
Diplomacy/Level tab, Records/Rally design docs) had shipped real, tested
features that section never got updated to reflect. I re-read the full
2,354-line file, cross-checked claims against the actual code (via a
research pass over `src/`, `shared/`, and `public/`), and rewrote the
roadmap section from scratch.

## Key findings
- **Chat, Relations, Nyro, Crew 2.0 (roles/store/fortress siege/diplomacy)
  are all actually done and wired in** — moved to "Complete." Correction
  after your follow-up: Crew level REWARDS (1-50) are NOT done — the level
  mechanism works, but most levels have no perk defined yet, so Crew 2.0
  stays "partial" until an owner-approved reward table exists.
- **Diplomacy is cosmetic-only by design**, not an unfinished feature — the
  two contradictory-sounding earlier log entries were reconciled.
- **Records and Cooperation/Rally tabs are still literal "coming soon"
  stubs** — fully spec'd in the log, zero code, correctly held pending
  multiplayer.
- **16 of 60 commanders** have map sprites, not "just 2" as older entries
  implied — 44 are still outstanding.
- **Flagged for GPT art review/edit:** 14 of the 16 sprited commanders
  (everyone except Fynn h1 and Brine h13) — they predate the approved v3
  quality pass and haven't been checked against it. IDs: h5, h9, h11, h17,
  h21, h23, h37, h38, h43, h45, h50, h52, h57, h59.
- **Flagged for GPT art review/edit:** the 7 non-Pirate faction HQ
  redesigns (Wizards, Orcs, Dragons, Holy Knights, Creatures of the Night,
  Coldborns, Ashen Dead) — assets exist and are wired in code, but none are
  owner-approved yet; GPT should check them against the approved Pirate HQ
  look and fix any that don't match.
- Found several other small stray issues not previously tracked: a
  hardcoded resource-rate display in the HUD, a stale "Placeholder" string
  visible in the Faction screen, two skill passives labeled "Coming Soon"
  in their own description, and a likely-dead `CrewPanel.jsx`.
- **The single biggest blocker for even a 5-15 person pre-alpha test:**
  chat/relations/crews/diplomacy are all client-local right now — nothing is
  actually shared between two players' browsers yet, even though the
  underlying rule functions are already written server-portable.

## New roadmap structure
Replaced the old single "recommended implementation order" with four
phases matching what you asked for:
- **Phase A** — Pre-Alpha (5-15 testers): stand up a minimal shared server,
  wire chat/crew/diplomacy onto it, fix the small stub issues found above.
- **Phase B** — Alpha (1 server, ~100-200): durable persistence, finish art
  queue, build Records/Rally for real, balance pass.
- **Phase C** — Beta (1 server, ~1000): chunked map sync, Season Chapters,
  gear rework, tutorial, load testing.
- **Phase D** — Launch (multi-server, ~2000/server): provisioning,
  migration, ops, final polish.

Full detail is in `ReadMeAI.md` under "8. Roadmap — Pre-Alpha through
Launch."
