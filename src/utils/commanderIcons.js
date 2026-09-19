// One owner for commander display objects, shared by redraws and animation frames.
export function destroyCommanderIcon(entry) {
  for (const object of [entry.sprite, entry.mask, entry.text]) {
    if (object && !object.destroyed) object.destroy();
  }
}

export function clearCommanderIcons(spriteMap) {
  for (const entry of spriteMap.values()) destroyCommanderIcon(entry);
  spriteMap.clear();
}

export function drawCommanderIcons({PIXI, gfx, textCont, cmds, tiles, byTile, spriteMap, posMap, crewPids, facKey, aiPlayerIdMap, isoXY, TH}) {
  gfx.clear();

  // Ensure persistent sprites exist for all visible commanders
  const allCmds = cmds;
  for (const cmd of allCmds) {
    if (!cmd.tk) continue;
    if (!spriteMap.has(cmd.uid)) {
      // Determine color
      let col = 0xdd3322;
      if (cmd.owner === 'player') col = 0x22cc55;
      else if (crewPids?.has(cmd.ownerPlayerId)) col = 0x2299ff;
      else if (cmd.faction === facKey) col = 0xaa44ff;
      const entry = { col };
      if (textCont) {
        if (cmd.bust) {
          const tex = PIXI.Texture.from(cmd.bust);
          const sprite = new PIXI.Sprite(tex);
          sprite.width = 14; sprite.height = 14;
          sprite.anchor.set(0.5, 0.5);
          const mask = new PIXI.Graphics();
          sprite.mask = mask;
          textCont.addChild(mask);
          textCont.addChild(sprite);
          entry.sprite = sprite; entry.mask = mask;
        } else if (cmd.icon) {
          const txt = new PIXI.Text(cmd.icon, { fontSize: 10, align: 'center' });
          txt.anchor.set(0.5, 0.5);
          textCont.addChild(txt);
          entry.text = txt;
        }
      }
      spriteMap.set(cmd.uid, entry);
    }
  }

  // Remove sprites for commanders no longer in list
  const activeUids = new Set(allCmds.map(c => c.uid));
  for (const [uid, entry] of spriteMap) {
    if (!activeUids.has(uid)) {
      destroyCommanderIcon(entry);
      spriteMap.delete(uid);
    }
  }

  // Hide icons that moved out of the visible group; keep their objects reusable.
  for (const entry of spriteMap.values()) {
    if (entry.sprite) entry.sprite.visible = false;
    if (entry.text) entry.text.visible = false;
  }

  // Draw all commanders using worker positions for marching, tile center for static
  for (const [key, tileCmds] of Object.entries(byTile)) {
    const tile = tiles[key];
    if (!tile) continue;
    const { cx, cy } = isoXY(tile.c, tile.r);
    const elev = tile.isWin ? 10 : 4;
    const sy = cy - elev;
    const playerG  = tileCmds.filter(c => c.owner === 'player');
    const allAiG   = tileCmds.filter(c => c.owner !== 'player');
    const crewG    = allAiG.filter(c => { const pid = c.ownerPlayerId || aiPlayerIdMap?.get(key); return pid && crewPids?.has(pid); });
    const factionG = allAiG.filter(c => c.faction === facKey && !crewG.includes(c));
    const enemyG   = allAiG.filter(c => !crewG.includes(c) && !factionG.includes(c));
    const groups = [];
    if (playerG.length)  groups.push({ cmds: playerG,  col: 0x22cc55 });
    if (crewG.length)    groups.push({ cmds: crewG,    col: 0x2299ff });
    if (factionG.length) groups.push({ cmds: factionG, col: 0xaa44ff });
    if (enemyG.length)   groups.push({ cmds: enemyG,   col: 0xdd3322 });
    groups.forEach(({ cmds: grp, col }, gi) => {
      const ey = sy + TH * 0.72 - gi * 6;
      gfx.beginFill(col, 0.13); gfx.lineStyle(1.4, col, 1); gfx.drawEllipse(cx, ey, 15, 5); gfx.lineStyle(0); gfx.endFill();
      const visible = grp.slice(0, 3);
      const spacing = visible.length > 1 ? 14 : 0;
      visible.forEach((cmd, i) => {
        const workerPos = cmd.march ? posMap.get(cmd.uid) : null;
        const basePx = workerPos ? workerPos.px : cx;
        const basePy = workerPos ? workerPos.py : sy;
        const dx  = (i - (visible.length - 1) / 2) * spacing;
        const ipx = basePx + dx;
        const ipy = basePy + TH * 0.72 - gi * 6 - 11;
        gfx.beginFill(0x000000, 0.45); gfx.drawCircle(ipx+1, ipy+1, 9); gfx.endFill();
        gfx.beginFill(col, 0.9);       gfx.drawCircle(ipx,   ipy,   9); gfx.endFill();
        gfx.beginFill(0x000000, 0.55); gfx.drawCircle(ipx,   ipy,   7); gfx.endFill();
        const entry = spriteMap.get(cmd.uid);
        if (entry?.sprite) { entry.sprite.visible = true; entry.sprite.x = ipx; entry.sprite.y = ipy; entry.mask.clear(); entry.mask.beginFill(0xffffff); entry.mask.drawCircle(ipx, ipy, 7); entry.mask.endFill(); }
        else if (entry?.text) { entry.text.visible = true; entry.text.x = ipx; entry.text.y = ipy; }
      });
      if (grp.length > 3) { gfx.beginFill(col, 0.7); gfx.drawCircle(cx+14, ey-8, 5); gfx.endFill(); }
    });
  }
}
