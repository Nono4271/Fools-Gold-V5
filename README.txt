Robe characters -- stronger stride pass
---------------------------------------
Replaces (same paths, no code changes -- all already wired in):
  public/commanders/map/h43-walk-v2.png   Serava
  public/commanders/map/h52-walk-v1.png   Eira
  public/commanders/map/h59-walk-v1.png   Mordwyn

Why robes didn't read as walking: their feet only tilted a few degrees
in place with a 3px lift. The leg characters' feet travel a full stride
(plant, push back, lift 11px, swing forward).

Now the robe characters' feet use the same gait as the leg characters:
same timing, same 11px lift, same forward/back travel. Sideways travel
is 12px instead of 18px so the boots stay under the hem instead of
stepping out past it. The hem also sways a bit more with each step.

Cleanups: the skirt no longer shows a notch where a boot was, and the
boots take their ground shadow with them instead of leaving specks.
All three stay on the ground line in every frame.
