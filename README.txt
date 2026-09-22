Orcs / Wizards / Dragons starters -- walk sprites
-------------------------------------------------
Added (public/commanders/map/):
  h9-walk-v1.png    Grimtusk          (Orcs veteran)
  h21-walk-v1.png   Warcroak          (Orcs soldier)
  h5-walk-v1.png    Solarius Vex      (Wizards veteran)
  h17-walk-v1.png   Runekeeper Dov    (Wizards soldier)
  h11-walk-v1.png   Emberclaw         (Dragons veteran)
  h23-walk-v1.png   Ashen Kraul       (Dragons soldier)

Changed:
  src/utils/commanderMapSprites.js  (+6 lines; AI copies match by bust too)
  tests/commanderMapSprites.test.js (covers the 6 new ones; npm test 4/4)

Per character:
  Grimtusk   - walking legs; axe arm stays put (front), both hands on the
               axe (back); free arm swings.
  Warcroak   - walking legs; barrels stay on his back; arms swing.
  Vex        - robe type: long robe planted + sways, boots step under it.
  Dov        - walking legs; cape stays still; the book/raised-hand pose
               in the back view stays posed.
  Emberclaw  - walking legs; wings and tail stay still.
  Kraul      - walking legs below the coat; tail stays still.

Mirrored to face like Fynn: Warcroak, Kraul, Vex (both views),
Emberclaw and Dov (front). Held items switch hands vs. the art.
