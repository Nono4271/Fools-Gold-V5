# Fool's Gold V5 — Pre-Alpha Testing Checklist

The things to check before handing the game to pre-alpha testers. Most
of it can be done solo in the **🛠 Test Campaign**, using the Admin panel
(instant finishes, levels, relocation, saves). Items that need real players
or a server are marked **[MP]**. Items to check on a phone *and* a desktop
browser are marked **[📱]**.

**How to use**
- Tick `[x]` when an item passes. When one fails, add a line under it:
  `  - ❌ BUG: what happened · device · steps`
- Refer to items by ID (e.g. "C4 fails") when reporting back.
- Severity when logging bugs: **S1** crash/blocker · **S2** feature broken ·
  **S3** wrong number/visual · **S4** polish.
- Save to an Admin slot before risky tests (keep attacks, relocation) so you
  can roll back.

**Bug report template**
```
ID: (checklist item)   Severity: S1–S4   Device/browser:
Steps: 1. … 2. … 3. …
Expected:            Actual:
Screenshot/recording:
```

---

## 0. Test Campaign itself (the tool has to work before anything else)
- [ ] T1 🛠 TEST CAMPAIGN shows on the title screen when `VITE_TEST_MODE=1` and is hidden without it
- [ ] T2 New Test Campaign → faction → name → map loads, and every commander (any alignment) is in your roster
- [ ] T3 Gems, eggs, void orbs and the 4 resources refill automatically after spending
- [ ] T4 Admin → Commanders: level up/down, respect up/down (promotion at 7 and 12), MAX, stamina refill, search
- [ ] T5 Admin → Timers: ⚡ finish works for march, building upgrade, training, healing, fort, crew structure, and FINISH EVERYTHING
- [ ] T6 Attacking works with no adjacency or range limits; turning the toggle off restores the normal rules
- [ ] T7 🛠 RELOCATE HQ HERE works from a tile popup; commanders move with the HQ; the old castle disappears
- [ ] T8 A crew created in test mode starts at level 50 with all perks
- [ ] T9 Save to Slot 1/2/3 → Load → everything matches (tiles, HQ spot, commanders, levels, buildings, crew, resources)
- [ ] T10 The autosave happens (wait 1 min, or close and reopen the app) and Continue from the title menu restores it
- [ ] T11 Loading while marches or timers are running: they catch up correctly afterwards
- [ ] T12 A normal campaign after a test campaign has no leftover admin powers

## 1. First launch, title and accounts [📱]
- [ ] A1 The title screen loads, animations are smooth, and buttons are readable on a small phone
- [ ] A2 Log In / Register: create an account, log in, log out, wrong password message, username shown afterwards
- [ ] A3 Begin Campaign → faction select: all 8 factions show the correct name, colors, alignment, legendary and starters
- [ ] A4 Faction bonus text is correct for each faction (see §14)
- [ ] A5 Name entry: profanity blocked, empty/too long names blocked, the error message is clear
- [ ] A6 Loading screen: progress and labels move and the map appears (note how long it takes on your phone: ____ s)
- [ ] A7 The starting state is right: 2 starter commanders, starting troops in the barracks, starting resources and gems, 2 relocation tokens
- [ ] A8 Refreshing the page mid-game: what happens? (Normal mode has no saves yet, so note the expected behavior)

## 2. HUD and navigation [📱]
- [ ] B1 The resource bar shows the right values and the right +/h rates (compare with owned tiles, buildings, crew and faction bonuses)
- [ ] B2 Dragon eggs x/cap, tile count x/cap, void orbs x/cap and gems display correctly and update live
- [ ] B3 **Settings ⚙ button**: currently does nothing. Decide what goes in Settings (sound, graphics, logout, language…)
- [ ] B4 Online/Offline badge is correct and doesn't cover buttons
- [ ] B5 Minimap: shows your tiles/HQ, tapping it recenters, opens the world map
- [ ] B6 HQ button recenters on the HQ; Search button opens search
- [ ] B7 Bottom bar: Summon, Commander, Bag, Ranks and Crew each open the right screen, and labels are readable
- [ ] B8 Reports (right rail) shows an unread badge, opens the battle log, and the badge clears
- [ ] B9 The left rail shows away-from-HQ commander busts with the right badges (🩸 wounded, 🛡 guard, 📍 fort, ⚠ stranded, 🥾 march timer)
- [ ] B10 Every screen/overlay has a visible, easy-to-tap close/back button and nothing is stuck off-screen
- [ ] B11 Rotating the phone/resizing the window keeps the layout usable (landscape and portrait)
- [ ] B12 Chat preview bar shows the latest messages and opens chat

## 3. Map, camera and tiles [📱]
- [ ] C1 Pan with one finger, pinch zoom, zoom levels; no lag spikes when panning fast
- [ ] C2 Zooming out past minimum shows the world map prompt; the world map opens and teleporting works
- [ ] C3 Tapping a tile opens the popup in a sensible spot (not off-screen); double-tap closes it
- [ ] C4 Tile popup info: name, coordinates, power level, resource and rate, siege, garrison waves, owner
- [ ] C5 Tile colors: green mine, blue crew, purple same faction, orange keep/gate, red enemy
- [ ] C6 P1–P9 tiles, P10–P13 tiles, keeps, gates, borders, rivers/roads/mountains and hellfire all look right
- [ ] C7 Impassable terrain blocks paths; gate crossings let you cross borders
- [ ] C8 Tile cap: you can't capture beyond the cap; the Adventurer's Trek tome raises it
- [ ] C9 Protection after capture: a shield in your color, a countdown, and attacks are blocked while protected
- [ ] C10 Abandon a tile: the countdown works, it can be cancelled, and the tile turns neutral
- [ ] C11 Garrison reset: a partly-beaten tile resets its waves/siege after the timer
- [ ] C12 Map icons for forts, crew Fortress, Well and Outpost; camps; spawns (mob icons)
- [ ] C13 Search panel: tile search by power level, mob search, camp search; tapping a result jumps there

## 4. Marching and commanders on the map [📱]
- [ ] D1 Attack an adjacent tile: commander picker → path length → march line and sprite walk the route
- [ ] D2 Move to your own, crew or crew-structure tile works; moving to an enemy/neutral tile is blocked
- [ ] D3 Stamina: attack costs 20, move costs 10, not enough stamina is blocked with a message, stamina regenerates
- [ ] D4 March speed is affected by gear, tomes, faction and crew Faster Together; diagonal steps are slower
- [ ] D5 "MARCHING 1m 23s" under the sprite, the left-rail pill and the commander card all agree and count down
- [ ] D6 Tap a marching sprite → commander card → ↩ recall; the commander returns along the path
- [ ] D7 Card coordinates (start → destination) are tappable and jump the map
- [ ] D8 Recall a standing commander to HQ; recall from a fort (popup: back to fort vs HQ)
- [ ] D9 Reposition to a fort; the fort-full message; stranded commanders
- [ ] D10 Reinforce: send troops to a commander in the field; the reinforcement march arrives
- [ ] D11 Long March and Quick March tactics work once, then reset
- [ ] D12 Background the app mid-march and come back: the march caught up correctly, with no duplicate battle
- [ ] D13 Several commanders marching at once, including to the same tile

## 5. Combat [📱]
- [ ] E1 One attack gives one report (no duplicates); multi-wave fights are labelled Wave x/y
- [ ] E2 Win: the tile is captured, turns green, protection starts, and the commander stays or returns as designed
- [ ] E3 Loss: 🩸 Wounded for 10 minutes; it can't march, gather, train, guard or station; the countdown shows; it recovers
- [ ] E4 Draw behaviour and the rematch
- [ ] E5 Troop losses leave the commander and the wounded go to the Healing Tent
- [ ] E6 XP and level ups after battle; skill points granted
- [ ] E7 Battle report: rounds, damage, skills triggered, troop counts; readable on a phone
- [ ] E8 Commander skills and PvE passives fire (check a few per faction)
- [ ] E9 Siege: siege bar drops; tiles with a garrison go garrison first, then siege
- [ ] E10 Troop type advantages behave as expected (sanity check a few matchups)
- [ ] E11 The walls level affects HQ siege
- [ ] E12 **Balance notes:** does a P5 feel right for a fresh player? P10? Keeps? Write down anything too easy or hard

## 6. Keeps, gates, camps, regions, win condition
- [ ] F1 Attack a keep: every garrison wave, stage labels, siege to 0, capture
- [ ] F2 Standing commanders (moved onto the keep) defend before the garrison
- [ ] F3 Gates: attack and capture; crossing borders through gates
- [ ] F4 Region/territory owner updates when a keep is captured (war territory)
- [ ] F5 Neutral camps: 2 waves, capture, the camp unlocks unlimited neutral conscription while owned
- [ ] F6 Ancient camps: T4 ancients trainable while owned
- [ ] F7 Losing the camp removes training access (troops you already trained stay usable)
- [ ] F8 Win tile / win screen triggers and looks right
- [ ] F9 Losing your HQ triggers a forced relocation (or game over if there's nowhere to go)

## 7. Tactics, spawns and resources on the map
- [ ] G1 Gather: pick a commander, it gathers, the yield arrives, and it stops correctly
- [ ] G2 Quick Gather and Recon (tome-unlocked) work and cost eggs as shown
- [ ] G3 Spawns: sweep a mob, battle runs, rewards arrive (XP, orbs), respawn timer
- [ ] G4 Crew Spawn Sweeper/PvE perks raise damage (compare with and without)
- [ ] G5 Dragon eggs regenerate to the cap; the cap raise from tomes and faction bonus
- [ ] G6 Owned-tile income ticks into resources and the storage cap stops overflow
- [ ] G7 Offline catch-up: close the app for a while and income, eggs, stamina and timers catch up

## 8. HQ — buildings (Architecture) [📱]
- [ ] H1 Every building lists its level, cost, time and what the next level gives
- [ ] H2 Upgrade: resources deducted, the timer runs, completion raises the level; you can't queue the same building twice
- [ ] H3 HQ level caps other buildings
- [ ] H4 Quarry/Lumber/Forge/Refinery raise income; Storage raises the cap
- [ ] H5 Barracks raises troop capacity; Training Grounds raises batch size and queue slots
- [ ] H6 Command Center raises troop slots per commander
- [ ] H7 Healing Tent raises healing capacity; Walls raises HQ siege
- [ ] H8 Void Tap: build, tap for orbs, cooldown, cap
- [ ] H9 Faction quarters and branch buildings unlock troop branches and tiers; capstone units
- [ ] H10 Expedience/speed-ups on upgrades
- [ ] H11 Marketplace trade rate by level; trades give the right amounts

## 9. HQ — troops, army and healing [📱]
- [ ] I1 Training: pick a unit, slider, cost/time preview, queue it, troops arrive in the barracks
- [ ] I2 The slider explains why it's disabled (barracks full / no Training Grounds)
- [ ] I3 Multiple queues; the barracks-full pause; training cost and time bonuses (faction, crew, tomes)
- [ ] I4 Neutral units from an owned camp; Contract Outpost units with the 100 commands/day limit and daily reset
- [ ] I5 Army: assign troops to commander slots, mixed slots, return troops, slot limits from the Command Center
- [ ] I6 Healing: queue heals, food cost, auto-heal toggle, healing speed bonuses
- [ ] I7 Troop skills (void orb upgrades) apply

## 10. Commanders (Commander screen, Summon, Bag) [📱]
- [ ] J1 The roster lists owned commanders first; filter by class, alignment and subspecies; sort
- [ ] J2 Commander detail: stats, level, XP bar, respect bar, trees, skills
- [ ] J3 Spend skill points; respec/refund if available; the Lv20 class bonus
- [ ] J4 Respect: schematics, duplicate conversion, promotion to Veteran at 7 and Champion at 12 with stat bumps
- [ ] J5 Gear: equip, unequip, swap; stats change; the gear inventory in the Bag
- [ ] J6 Summon: free daily pull, half-price pull, x1/x10, gem cost, pity counters, results screen
- [ ] J7 Only your alignment's commanders can be pulled (normal mode); opposite-alignment ones show as locked
- [ ] J8 The 16 commanders with finished art vs placeholders: note any missing portraits or busts
- [ ] J9 Bag: consumables list, use relocation token, medallion, resource boosts, expedience
- [ ] J10 The commander card from a tile/marching sprite/bust: Recall, Reinforce, Guard, the stamina bar

## 11. Guard, forts and protection
- [ ] K1 Guard: costs 10 stamina, covers the 3x3 (your tiles, crew tiles, crew structures only)
- [ ] K2 Cancel guard gives a 3-minute cooldown; moving ends the guard with no cooldown
- [ ] K3 Guarded tile under attack: the newest guard fights first **[MP]** (the AI doesn't attack player tiles yet)
- [ ] K4 Forts: build (3 eggs), upgrade, capacity, station, range from forts, demolish, abandon, removal timers
- [ ] K5 Fort max count and the Numerous Forts tome

## 12. Wizard's Tomes
- [ ] L1 Power pool fills from owned tiles; spend points; tome level up
- [ ] L2 Each node's effect is real: tile cap, egg cap, speed/focus/attack, RSS mastery, stamina max, XP, forts, Long/Quick March, training speed, reinforcement speed
- [ ] L3 Tomes that are still stubs/TBD are listed so they aren't a surprise

## 13. HQ relocation
- [ ] M1 A valid pad (3x3 owned, same region, P1–P9, not next to another HQ) shows RELOCATE; invalid pads don't
- [ ] M2 Relocate: token used, 72h cooldown, blocked while commanders march
- [ ] M3 Commanders at HQ move to the new HQ after relocation (fixed 2026-09-23 — re-test)
- [ ] M4 The old HQ tiles turn neutral; the new HQ castle, name and border appear; buildings are kept

## 14. Factions (run once per faction)
- [ ] N1 Pirates  N2 Orcs  N3 Wizards  N4 Dragons  N5 Holy Knights  N6 Night Creatures  N7 Coldborns  N8 Ashen Dead
  - For each: the bonus works in numbers, the troop branches and art look right, the HQ art is right, starters are right, it's playable with no missing assets

## 15. Crew [📱]
- [ ] O1 Create a crew (500 gems): name, abbr, description, emblem, privacy, language validation
- [ ] O2 Browse and join: open join vs request-to-join (pending window), leave
- [ ] O3 Roles: founder/officer/member; promote, demote, kick, disband permissions
- [ ] O4 Contributions and the crew store; the help button
- [ ] O5 Announcement; crew target marker on the map
- [ ] O6 Crew levels 2–50: each level's perk is real (resource +/h, march speed, heal, XP, gather, PvE, spawn, training time/cost, fortress slots at 5/15/30/45, member cap)
- [ ] O7 Crew Fortress: build on P10+, timer, station, siege, destroy → last hitter gets the tile
- [ ] O8 Well: founder only, p10+, level 31/40 slots, station from anywhere, gathers all 4 resources at the P11 rate
- [ ] O9 Contract Outpost: founder only, choose 1 unit (2 at level 50), whole crew can train it, 100/day limit, -10% hire time at 42
- [ ] O10 Structure defense order: standing → stationed → siege; outposts can't hold stationed armies
- [ ] O11 Diplomacy: set ally/enemy; tile colors update; declare war, war timer, cooldown
- [ ] O12 AI crews form over time and show up in browse/leaderboard

## 16. Chat and relations [📱]
- [ ] P1 World / Faction / Crew / DM / Group channels send and receive
- [ ] P2 Crew sub-channels: founder can add, remove, reorder
- [ ] P3 Groups: create, invite, leave; group sub-channels
- [ ] P4 Reactions, mute/unmute, unread counts and badges, mark read
- [ ] P5 Profanity filter toggle; messages scroll and auto-scroll; the keyboard doesn't cover the input on phones
- [ ] P6 Friends: add, accept/decline, cancel, unfriend; block/unblock; search players
- [ ] P7 Chat is hidden behind full-screen menus and comes back after

## 17. Leaderboard / Ranks
- [ ] Q1 Player, Crew and War tabs load; your row is highlighted; the numbers make sense

## 18. Mobile and UX polish [📱]
- [ ] R1 Every button is at least ~36px and easy to hit with a thumb
- [ ] R2 Every scroll list scrolls on iPhone (HQ menus, roster, chat, crew lists, reports, bag, admin)
- [ ] R3 Sliders drag smoothly and jump to your finger
- [ ] R4 No accidental page zoom, pull-to-refresh or text selection while playing
- [ ] R5 Safe areas: nothing hidden under the notch or home bar
- [ ] R6 Text is readable at arm's length; nothing important is under 8px
- [ ] R7 Popups never open off-screen at the map edges
- [ ] R8 Performance: FPS while panning, time to load, phone heat and battery after 30 min (note: ____)
- [ ] R9 Test on at least one older/lower-end phone and one desktop browser (Chrome, Safari)

## 19. Stability and edge cases
- [ ] S1 No crashes or black screens across a 1-hour session (note the steps if one happens)
- [ ] S2 Rapid taps (double-sending a march, spamming upgrade/train) don't duplicate actions or resources
- [ ] S3 Resources never go negative; costs are deducted exactly once
- [ ] S4 Leaving and returning (backgrounding, locking the phone) doesn't break timers or marches
- [ ] S5 Console errors: open the browser dev tools on desktop and note any red errors during play

## 20. Server and multiplayer [MP] (pre-alpha items 1–3)
- [ ] U1 The server connects and the badge shows Server; it reconnects after dropping
- [ ] U2 Two players see each other's tile captures in real time
- [ ] U3 The server rejects invalid commands (e.g. attacking a non-adjacent tile, spending resources you don't have)
- [ ] U4 Crew, chat, relations, diplomacy and fortress state are shared between players
- [ ] U5 Real player vs player attacks: guard, wounded-on-defense, structure siege
- [ ] U6 Account progress persists across devices/logins
- [ ] U7 10 players at once: latency and server load are acceptable

## 21. Content still marked "good enough" (review, don't block)
- [ ] V1 Faction HQ art review (flagged good enough for pre-alpha)
- [ ] V2 Commander sprite review (flagged good enough for pre-alpha)
- [ ] V3 Placeholder numbers: Well/Outpost cost and time use fortress placeholders
- [ ] V4 Season chapters / tutorial are planned for Phase C (not in pre-alpha): confirm testers get a short how-to-play note instead

## 22. Before sending to testers
- [ ] W1 `VITE_TEST_MODE` removed from the tester build (or deliberately left on, your call)
- [ ] W2 The known-issues list written for testers (AI doesn't attack players, Settings is empty, etc.)
- [ ] W3 A bug report channel set up (form, Discord, etc.) with the template above
- [ ] W4 The ReadMeAI roadmap updated with anything found here
