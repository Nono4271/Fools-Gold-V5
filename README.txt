Coldborns + Holy Knights starters -- walk sprites
-------------------------------------------------
Added (public/commanders/map/):
  h50-walk-v1.png   Valdris the Unmoved  (Coldborns soldier starter)
  h52-walk-v1.png   Eira Coldmantle      (Coldborns veteran starter)
  h37-walk-v1.png   Brother Aldric       (Holy Knights soldier starter)
  h38-walk-v1.png   Commander Vayne      (Holy Knights veteran starter)

Changed:
  src/utils/commanderMapSprites.js  (+4 lines, AI copies match by bust too)
  tests/commanderMapSprites.test.js (covers the 4 new ones; npm test 4/4)

Per character:
  Eira     - gown type: skirt planted + sways, both boots step, arm swings.
  Valdris  - walking legs; axe on shoulder and fur cape stay still;
             both arms swing.
  Vayne    - walking legs; sword and its hand stay still; free arm swings.
  Aldric   - walking legs; shield stays still; free arm swings.
  Vayne/Aldric back view: the cape hides the far leg, so that leg stays
  under the cape and the visible leg steps (same as Dreadmourne).

Facing: fronts of Valdris, Vayne and Aldric, and Eira's back, were
mirrored to face the same way as Fynn -- so weapons/shields switch hands
compared to the art.
All backgrounds cut with the AI remover (no holes in white hair/silver).
