Ashen Dead starters -- walk sprites
-----------------------------------
Added:
  public/commanders/map/h57-walk-v1.png   Ser Dreadmourne
  public/commanders/map/h59-walk-v1.png   Fallen Lord Mordwyn

Changed:
  src/utils/commanderMapSprites.js  (+2 lines)
    h57 and h59 now resolve to their new atlases (AI copies too, via bust).
  tests/commanderMapSprites.test.js
    The test still expected Serava's and Fang's OLD v1 atlases, so it was
    already failing after the earlier deliveries. Updated to the v2 files,
    added h57/h59, and the sheet-size check now covers every wired atlas.
    npm test: 4/4 passing.

Mordwyn (h59) -- cloak type
  Cloak stays planted and sways from the waist; both boots step under
  the hem; the hanging arm swings (from behind, with the lantern).
  Both views mirrored to face the same way as Fynn.

Dreadmourne (h57) -- walking legs, same gait math as Fynn/Fang
  Legs stride; the greatsword and its hand stay still (a swinging
  greatsword looks wrong); the free arm swings. Cape hangs behind his
  legs from the front and over them from behind. Front view mirrored.
