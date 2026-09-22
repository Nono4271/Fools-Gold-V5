Vayne (h38) + Aldric (h37) walk sprites -- facing + back-view legs
------------------------------------------------------------------
Replaces (same paths, no code changes):
  public/commanders/map/h37-walk-v1.png
  public/commanders/map/h38-walk-v1.png

1. Walking backwards: their front art was mirrored the wrong way, so
   they faced away from the direction they walked. Mirror removed.
   (Weapon/shield are back in the hands shown in your art.)

2. Back view -- only one leg moved + odd shape: I'd kept the far leg
   frozen under the cape, but on these two that boot is visible below
   the hem, and the frozen cape piece showed up as a hard-edged shape.
   Rebuilt from measured boot positions: the cape now ends at its real
   hem, both legs step, and a still copy of the hip area sits behind the
   legs so no gaps open when a thigh swings.
