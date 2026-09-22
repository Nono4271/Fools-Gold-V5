// Main in-game screen layout (map, HUD, popups, menus, overlays).
// Pure presentation: every value and handler comes from Game.jsx as a prop.
import { useMemo } from "react";
import { MapRenderer } from "./MapRenderer";
import { CSS } from "./constants/css.js";
import { validateRelocationPad, allHqKeyList } from "../shared/utils/relocation.js";
import { defaultCrewSubchannels } from "../shared/constants/chat.js";
import { addSubchannel, removeSubchannel, moveSubchannel } from "../shared/utils/subchannels.js";
import { NYRO_ID } from "../shared/constants/nyro.js";
import { createCrew, roleOf, canPromote, canDemote, canKick, canDisband, spendContribution, updateAnnouncement, setCrewTarget, clearCrewTarget, setDiplomacyStatus, declareWar, cancelWar } from "../shared/utils/crewRules.js";
import { removeFortress, canDemolishFortress } from "../shared/utils/crewFortress.js";
import { CREW_STORE_ITEMS } from "../shared/constants/crew.js";
import { createConsumable } from "../shared/constants/consumables.js";
import { crewHallStats, crewHelpAmount } from "../shared/constants/buildings.js";
import { GameContext } from "./GameContext.js";
import HUD from "./components/game/HUD.jsx";
import TilePopup from "./components/game/TilePopup.jsx";
import HQMenu from "./components/game/HQMenu.jsx";
import WorldMap from "./components/game/WorldMap.jsx";
import BattleLog from "./components/game/BattleLog.jsx";
import CommanderPicker from "./components/game/CommanderPicker.jsx";
import BottomPanel from "./components/game/BottomPanel.jsx";
import WinScreen from "./components/game/WinScreen.jsx";
import Minimap from "./components/game/Minimap.jsx";
import WizardsTomes, { ScrollStackIcon } from "./components/game/WizardsTomes.jsx";
import GameBar from "./components/game/GameBar.jsx";
import Leaderboard from "./components/game/Leaderboard.jsx";
import CrewScreen from "./components/game/crew/CrewScreen.jsx";
import ChatPanel from "./components/game/ChatPanel.jsx";
import ChatPreview from "./components/game/ChatPreview.jsx";
import CommanderScreen from "./components/screens/CommanderScreen.jsx";
import BagScreen from "./components/screens/BagScreen.jsx";
import { PerfOverlay } from "./utils/perfLog.jsx";

export default function GameView(props) {
  const {
    ZOOM_LEVELS, abandonFort, startFortRemoval, cancelFortRemoval, aiFaction, aiHqKeys, aiHqKeysRef, aiLastActionRef,
    aiPlayerIdMapRef, assignTroops, atkKey, autoHeal, bLog, barracksPool, battles, bldgs,
    buildFortWithCost, canAfford, canAtk, cancelGuard, centerOnHQ, cmdPathLengths,
    chatChannels, chatKnownPlayerIds, chatOpen, chatProfanityFilterEnabled, chatNormalizedCrews,
    chatRecentMessages,
    chatActiveDisplay, setChatActiveDisplay, chatActiveChannelId, setChatActiveChannelId,
    chatActiveSubId, setChatActiveSubId,
    chatMutedChannelIds, chatToggleMute, chatReactions, chatToggleReaction, chatTypingByChannel,
    chatUnreadCount, chatMarkRead, chatUnreadLeafIds, chatUnreadTopIds,
    getChatMessages, sendChatMessage, setChatOpen, setChatProfanityFilterEnabled,
    startChatDm, startChatGroup, leaveChatGroup,
    addGroupSubchannel, removeGroupSubchannel, moveGroupSubchannel,
    relFriends, relBlocked, relIncoming, relOutgoing, relAddFriend, relDeclineIncoming,
    relCancelOutgoing, relUnfriend, relBlockPlayer, relUnblockPlayer, relSearch, relationsNameOf,
    cmdScreenOpen, cmdScreenUid, cmds, cmdsAdjToSel, cmdsForMove, cmdsOnSel, consumables,
    crewOpen, crewmatePlayerIds, diplomacyPlayerIds, crews, myCrew, buildCrewFortress, demolishCrewFortressHere,
    buildCrewWell, demolishCrewWell, stationAtWell, buildCrewOutpost, demolishCrewOutpost, chooseOutpostUnits,
    crewStructureKeys, trainableUnlocked, neutralSources, contractCommandsLeft,
    startFortressSiegeMarch, crossingsState, deletingSecsLeft, deletingTiles,
    demolishFort, doVoidTap, dragonEggs, dragonEggsCap, editArmyCmd, eligibleSpawnKeysRef,
    facKey, facName, floats, forts, gearInventory, gearScreenOpen, gems, getFortAtTile,
    guardedTiles, handleZoomChange, hasCmdTraining, hasGather, hasLongMarch, hasQuickGather,
    hasQuickMarch, hasRecon, healQueue, hqOpen, hqTab, keepMeta, lastRelocateAt, lastVoidTap,
    leaderboardOpen, loadLabel, loadPct, longMarchReady, mapReady, mapRendererRef,
    marchingToSel, minimapRedrawRef, mode, mvCmd, mysticOrbs, mysticOrbsCap, nowTick,
    onEnterHQ, onExpedience, onGather, onLongMarch, onPanChange, onQuickGather, onQuickMarch,
    onRecon, onSweep, onTileClick, pKeys, panRef, panelOpen, pendingCrewId, performRelocation,
    pickCmd, playerAlignment, playerCrewId, playerEntries, playerHqKey, popupMode, powerPerHr,
    powerPool, protectedTiles, quarterLevels, queueHealing, queueTraining, quickMarchReady,
    recallMarch, recallPopup, recallStationary, recallToFort, recallToHQ, reinCmd, reinMarches,
    reinMarchesRef, respectSchematics, returnTroops, rss, rssBonus, facTileYield, crewRssBonus, searchOpen, selKey, selTile,
    serverConnected, setAiBarracksPool, setAiBldgs, setAiHqKeys, setAiRss, setArmySlots,
    setAtkKey, setAutoHeal, setBLog, setBarracks, setBattles, setBldgs, setCmdScreenOpen,
    setCmdScreenUid, setCmds, setCrewOpen, setCrews, setDeletingSecsLeft, setDeletingTiles,
    setEditArmyCmd, setGearInventory, setGearScreenOpen, setGems, setHealQueue, setHqOpen,
    setHqTab, setLeaderboardOpen, setMode, setMvCmd, setMysticOrbs, setPendingCrewId, setPick,
    setPlayerCrewId, setPlayerHqKey, setPopupMode, setPopupPos, setPowerPool, setQuarterLevels,
    setRecallPopup, setReinCmd, setReinMarches, setRespectSchematics, setRss, setScreen,
    setSearchOpen, setSelKey, setShowBattleLog, setShowPerf, setSliderVals, setTiles,
    setTomesLevel, setTomesNodeLevels, setTomesOpen, setTomesUnspentPoints, setTrainSlider,
    setTrainingQueues, setTroopCounts, setTroopSkillLevels, setTroopSlot, setUnlockedBranches,
    setUnseenBattles, setUpgQueue, setWinner, setWorldMapOpen, setWorldMapPrompt, setWounded,
    setWoundedQueue, showBattleLog, showPerf, sliderVals, spawnWorkerRef, spawns, staminaMax,
    startGuard, startMarch, startReinforcement, startReposition, teleportTo, tileCap,
    tileScreenX, tileScreenY, tiles, tomesLevel, tomesOpen, tomesUnspentPoints, trainSlider,
    trainingQueues, trainingSpeedMult, trainingCostMult, healSpeedMult, trainingXpMult, troopCounts, troopSkillLevels,
    unlockedBranches, unseenBattles, upgQueue, upgrade, upgradeFort, useConsumable,
    voidTapCooldown, voidTapLvl, voidTapReady, winner, worldMapOpen, worldMapPrompt,
    woundedQueue, woundedTroops, zoomRef, zoomState,
  } = props;

  // Map markers for every crew's Fortresses / Wells / Contract Outpost —
  // colour by relationship to the player's crew (see MapRenderer's
  // syncCrewStructures). `built` flips when the build timer passes.
  const crewStructures = useMemo(() => {
    const now = nowTick ?? Date.now();
    const out = [];
    for (const c of crews || []) {
      const rel = c.id === myCrew?.id ? "mine"
        : myCrew?.diplomacy?.[c.id] === "ally" ? "ally"
        : myCrew?.diplomacy?.[c.id] === "enemy" ? "enemy" : "other";
      const built = s => !s.buildEndsAt || now >= s.buildEndsAt;
      for (const f of c.fortresses || []) out.push({ tileKey: f.tileKey, kind: "fortress", built: built(f), rel });
      for (const w of c.wells || []) out.push({ tileKey: w.tileKey, kind: "well", built: built(w), rel });
      if (c.outpost) out.push({ tileKey: c.outpost.tileKey, kind: "outpost", built: built(c.outpost), rel });
    }
    return out;
  }, [crews, myCrew, nowTick]);

  // Crew sub-channel add/remove/reorder — gear icon in ChatPanel's header,
  // only shown to a crew's founder (see shared/utils/subchannels.js).
  // Groups manage their own (src/hooks/useChat.js owns `groups` state).
  function manageCrewSubchannels(crewId, action) {
    setCrews(prev => prev.map(c => {
      if (c.id !== crewId) return c;
      const subChannels = c.subChannels?.length ? c.subChannels : defaultCrewSubchannels();
      if (action.type === "add") return { ...c, subChannels: addSubchannel(subChannels, action.name) };
      if (action.type === "remove") return { ...c, subChannels: removeSubchannel(subChannels, action.id) };
      if (action.type === "move") return { ...c, subChannels: moveSubchannel(subChannels, action.id, action.direction) };
      return c;
    }));
  }

  // Chat (preview + panel) is suppressed while any other full-screen/overlay
  // menu is open — same set GameBar's "hidden" prop already checks, plus
  // Crew/Leaderboard/the win screen, which are also full overlays chat would
  // otherwise sit on top of.
  const chatBlocked = worldMapOpen || hqOpen || cmdScreenOpen || gearScreenOpen
    || showBattleLog || tomesOpen || crewOpen || leaderboardOpen || !!winner;

  return (
    <GameContext.Provider value={{ staminaMax }}>
    <div style={{
      width:"100vw", height:"100vh", position:"relative", overflow:"hidden",
      background:"transparent", userSelect:"none",
      touchAction:"none",
      // Phone optimizations: eliminate tap delay and visual tap flash
      WebkitTapHighlightColor:"transparent",
      WebkitTouchCallout:"none",
      WebkitUserSelect:"none",
      // Prevent overscroll bounce on iOS
      overscrollBehavior:"none",
    }}>
      <style>{CSS}
        {`
          * { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
          canvas { touch-action: none !important; }
          button, .btn { touch-action: manipulation; cursor: pointer; }
          [style*="position: fixed"], [style*="position:fixed"] { touch-action: auto; }
          .scr, [style*="overflow-y: auto"], [style*="overflowY: auto"] { touch-action: pan-y !important; }
          .scr * { touch-action: pan-y; }
          .scr button, .scr .btn, .scr input[type="range"] { touch-action: manipulation !important; }
          .gear-picker-list { touch-action: pan-y !important; }
          .gear-picker-list * { touch-action: pan-y; }
          .gear-picker-list button, .gear-picker-list .btn { touch-action: manipulation !important; }
        `}
      </style>

      {/* ── Loading overlay ── */}
      {!mapReady && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "#080704",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 18,
        }}>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg); } }
            @keyframes pulse { 0%,100% { opacity: .5; } 50% { opacity: 1; } }
          `}</style>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            border: "3px solid #2a2010",
            borderTop: "3px solid #f0c040",
            animation: "spin 1s linear infinite",
          }} />
          <div style={{
            fontFamily: "'Cinzel Decorative',serif", fontSize: 15,
            background: "linear-gradient(135deg,#f0c040,#c03030,#f0c040)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite",
            letterSpacing: ".15em",
          }}>FOOLS GOLD</div>
          <div style={{ width: 220, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{
              width: "100%", height: 4,
              background: "#1a1508", borderRadius: 2,
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%",
                width: `${loadPct}%`,
                background: "linear-gradient(90deg,#8a4020,#f0c040)",
                borderRadius: 2,
                transition: "width .4s ease",
              }} />
            </div>
            <div style={{
              fontFamily: "'Cinzel',serif", fontSize: 9,
              color: "#6a5030", letterSpacing: ".12em",
              textAlign: "center",
              animation: "pulse 1.6s ease-in-out infinite",
            }}>{loadLabel}</div>
          </div>
        </div>
      )}

      <HUD facName={facName} facKey={facKey} pKeys={pKeys} rss={rss} gems={gems} tiles={tiles}
        bldgs={bldgs} forts={forts} rssBonus={rssBonus} facTileYield={facTileYield} crewRssBonus={crewRssBonus}
        mysticOrbs={mysticOrbs} mysticOrbsCap={mysticOrbsCap} voidTapReady={voidTapReady}
        dragonEggs={dragonEggs} dragonEggsCap={dragonEggsCap} tileCap={tileCap} />

      {/* Server connection indicator */}
      <div style={{
        position:"fixed", top:8, right:8, zIndex:9999,
        display:"flex", alignItems:"center", gap:5,
        background:"rgba(0,0,0,0.55)", borderRadius:6,
        padding:"3px 8px", fontSize:11, color: serverConnected ? "#4ddd88" : "#dd6644",
        border: serverConnected ? "1px solid #2a7a50" : "1px solid #7a3322",
        pointerEvents:"none",
      }}>
        <span style={{width:7,height:7,borderRadius:"50%",display:"inline-block",
          background: serverConnected ? "#4ddd88" : "#dd6644",
          boxShadow: serverConnected ? "0 0 6px #4ddd88" : "none"}} />
        {serverConnected ? "Server" : "Offline"}
      </div>

      <MapRenderer
        ref={mapRendererRef}
        tiles={tiles} cmds={cmds} selKey={selKey} mode={mode} mvCmd={mvCmd}
        reinMarchesRef={reinMarchesRef}
        panRef={panRef} zoomRef={zoomRef} ZOOM_LEVELS={ZOOM_LEVELS}
        onTileClick={onTileClick}
        onPanChange={onPanChange}
        onZoomChange={handleZoomChange}
        playerHqKey={playerHqKey}
        playerFacKey={facKey}
        playerName={facName}
        crewmatePlayerIds={crewmatePlayerIds}
        diplomacyPlayerIds={diplomacyPlayerIds}
        allHqKeys={Object.values(aiHqKeysRef.current).flat().concat(playerHqKey ? [playerHqKey] : [])}
        aiPlayerIdMap={aiPlayerIdMapRef.current}
        forts={forts}
        guardedTiles={guardedTiles}
        guardedTileKeys={[...guardedTiles.keys()].sort().join("|")}
        spawns={spawns}
        protectedTileKeys={Object.entries(protectedTiles).filter(([,u])=>Date.now()<u).map(([k])=>k).join("|")}
        crewStructures={crewStructures}
      />

      {/* Zoom controls removed — use pinch / mouse wheel */}

      {/* Floaties */}
      {floats.map(f => (
        <div key={f.id} style={{position:"fixed",left:f.x,top:f.y,zIndex:600,pointerEvents:"none",fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:12,color:f.col,animation:"floatUp 1.8s ease forwards",textShadow:"0 1px 6px rgba(0,0,0,.9)",whiteSpace:"nowrap"}}>
          {f.txt}
        </div>
      ))}

      <TilePopup
        selKey={selKey} selTile={selTile}
        tileScreenX={tileScreenX} tileScreenY={tileScreenY}
        popupMode={popupMode} setPopupMode={setPopupMode}
        onEnterHQ={onEnterHQ}
        cmds={cmds} cmdsOnSel={cmdsOnSel} marchingToSel={marchingToSel} canAtk={canAtk}
        crewmatePlayerIds={crewmatePlayerIds}
        barracksPool={barracksPool} editArmyCmd={editArmyCmd} setEditArmyCmd={setEditArmyCmd}
        sliderVals={sliderVals} setSliderVals={setSliderVals}
        deletingTiles={deletingTiles} deletingSecsLeft={deletingSecsLeft}
        setDeletingTiles={setDeletingTiles} setDeletingSecsLeft={setDeletingSecsLeft}
        setSelKey={setSelKey}
        setAtkKey={setAtkKey} setMode={setMode} setPick={setPick}
        setMvCmd={setMvCmd} setReinCmd={setReinCmd}
        startMarch={startMarch}
        recallMarch={recallMarch} recallStationary={recallStationary}
        startGuard={startGuard} cancelGuard={cancelGuard} guardedTiles={guardedTiles}
        setBarracks={setBarracks} setCmds={setCmds}
        nowTick={nowTick}
        playerHqKey={playerHqKey}
        facKey={facKey} facName={facName}
        forts={forts}
        buildFort={buildFortWithCost}
        upgradeFort={upgradeFort}
        getFortAtTile={getFortAtTile}
        startReposition={startReposition}
        startFortRemoval={startFortRemoval}
        cancelFortRemoval={cancelFortRemoval}
        setCmdScreenOpen={setCmdScreenOpen}
        setCmdScreenUid={setCmdScreenUid}
        hasQuickGather={hasQuickGather} onQuickGather={onQuickGather}
        hasRecon={hasRecon}           onRecon={onRecon}
        hasGather={hasGather}         onGather={onGather}
        hasCmdTraining={hasCmdTraining}
        dragonEggs={dragonEggs}
        upgQueue={upgQueue}           onExpedience={onExpedience}
        staminaMax={staminaMax}       trainingXpMult={trainingXpMult}
        hasLongMarch={hasLongMarch}   onLongMarch={onLongMarch}   longMarchReady={longMarchReady}
        hasQuickMarch={hasQuickMarch} onQuickMarch={onQuickMarch} quickMarchReady={quickMarchReady}
        spawns={spawns} onSweep={onSweep}
        protectedTiles={protectedTiles}
        onPerformRelocation={performRelocation}
        lastRelocateAt={lastRelocateAt}
        relocationTokens={(consumables ?? []).find(c => c.typeId === "relocation")?.quantity ?? 0}
        allHqKeys={Object.values(aiHqKeys).flat().concat(playerHqKey ? [playerHqKey] : [])}
        isValidRelocPad={selKey && selTile?.owner === "player" && !selTile?.isHQ && !selTile?.isHQPart
          ? validateRelocationPad(selKey, tiles, allHqKeyList(aiHqKeys, playerHqKey), playerHqKey).valid
          : false}
        myCrew={myCrew} rss={rss}
        crewFortressAtTile={selKey ? crews.flatMap(c => c.fortresses||[]).find(f => f.tileKey === selKey) : null}
        onBuildCrewFortress={buildCrewFortress}
        onDemolishCrewFortressHere={demolishCrewFortressHere}
        {...(() => {
          if (!selKey) return {};
          const wellCrew = crews.find(c => (c.wells || []).some(w => w.tileKey === selKey)) || null;
          const outpostCrew = crews.find(c => c.outpost?.tileKey === selKey) || null;
          return {
            wellAtTile: wellCrew?.wells.find(w => w.tileKey === selKey) || null, wellCrew,
            outpostAtTile: outpostCrew?.outpost || null, outpostCrew,
          };
        })()}
        crewStructureKeys={crewStructureKeys} contractCommandsLeft={contractCommandsLeft}
        onBuildWell={buildCrewWell} onDemolishWell={demolishCrewWell} onStationAtWell={stationAtWell}
        onBuildOutpost={buildCrewOutpost} onDemolishOutpost={demolishCrewOutpost} onChooseOutpostUnits={chooseOutpostUnits}
      />

      {showBattleLog && (
        <BattleLog
          battles={battles} bLog={bLog} unseenBattles={unseenBattles}
          onClose={() => setShowBattleLog(false)}
        />
      )}

      {mode==="pickAttackCmd" && (
        <CommanderPicker
          mode={mode} atkKey={atkKey} tiles={tiles} cmdsAdjToSel={cmdsAdjToSel}
          pickCmd={pickCmd} setPick={setPick}
          setMode={setMode} setAtkKey={setAtkKey}
          setSelKey={setSelKey} setPopupPos={setPopupPos}
          startMarch={startMarch}
          cmdPathLengths={cmdPathLengths}
        />
      )}

      {mode==="pickMoveCmd" && (
        <CommanderPicker
          mode={mode} atkKey={atkKey} tiles={tiles} cmdsAdjToSel={cmdsForMove}
          pickCmd={pickCmd} setPick={setPick}
          setMode={setMode} setAtkKey={setAtkKey}
          setSelKey={setSelKey} setPopupPos={setPopupPos}
          startMarch={startMarch}
          cmdPathLengths={cmdPathLengths}
        />
      )}

      {mode==="pickSiegeCmd" && (
        <CommanderPicker
          mode="pickAttackCmd" atkKey={atkKey} tiles={tiles} cmdsAdjToSel={cmdsAdjToSel}
          pickCmd={pickCmd} setPick={setPick}
          setMode={setMode} setAtkKey={setAtkKey}
          setSelKey={setSelKey} setPopupPos={setPopupPos}
          startMarch={startFortressSiegeMarch}
          cmdPathLengths={cmdPathLengths}
        />
      )}

      {panelOpen && (
        <BottomPanel
          mode={mode} mvCmd={mvCmd} setMvCmd={setMvCmd}
          reinCmd={reinCmd} setReinCmd={setReinCmd}
          cmdsOnSel={cmdsOnSel} barracksPool={barracksPool} troopCounts={troopCounts}
          bldgs={bldgs} sliderVals={sliderVals} setSliderVals={setSliderVals}
          startReinforcement={startReinforcement}
          setMode={setMode} setAtkKey={setAtkKey} setPick={setPick}
          setSelKey={setSelKey} setPopupPos={setPopupPos}
          gearInventory={gearInventory}
          reinMarches={reinMarches}
          playerHqKey={playerHqKey}
        />
      )}

      <HQMenu
        hqOpen={hqOpen} setHqOpen={setHqOpen} hqTab={hqTab} setHqTab={setHqTab}
        cmds={cmds} setCmds={setCmds} tiles={tiles} rss={rss} setRss={setRss} gems={gems} pKeys={pKeys}
        bldgs={bldgs} setBldgs={setBldgs} barracksPool={barracksPool} setBarracks={setBarracks} troopCounts={troopCounts} setTroopCounts={setTroopCounts}
        woundedTroops={woundedTroops} woundedQueue={woundedQueue} trainingQueues={trainingQueues}
        healQueue={healQueue} setHealQueue={setHealQueue}
        queueHealing={queueHealing} autoHeal={autoHeal} setAutoHeal={setAutoHeal} trainingSpeedMult={trainingSpeedMult}
        trainingCostMult={trainingCostMult} healSpeedMult={healSpeedMult}
        setWounded={setWounded} setWoundedQueue={setWoundedQueue}
        trainSlider={trainSlider} setTrainSlider={setTrainSlider} setTrainingQueues={setTrainingQueues}
        upgQueue={upgQueue} sliderVals={sliderVals} setSliderVals={setSliderVals}
        bLog={bLog} upgrade={upgrade} canAfford={canAfford}
        assignTroops={assignTroops} setTroopSlot={setTroopSlot} setArmySlots={setArmySlots} returnTroops={returnTroops} queueTraining={queueTraining}
        recallMarch={recallMarch} setScreen={setScreen}
        gearInventory={gearInventory}
        playerHqKey={playerHqKey}
        facKey={facKey}
        unlockedBranches={trainableUnlocked || unlockedBranches} setUnlockedBranches={setUnlockedBranches}
        neutralSources={neutralSources} contractCommandsLeft={contractCommandsLeft}
        quarterLevels={quarterLevels} setQuarterLevels={setQuarterLevels}
        mysticOrbs={mysticOrbs} mysticOrbsCap={mysticOrbsCap}
        voidTapLvl={voidTapLvl} voidTapReady={voidTapReady}
        lastVoidTap={lastVoidTap} voidTapCooldown={voidTapCooldown}
        doVoidTap={doVoidTap}
        troopSkillLevels={troopSkillLevels} setTroopSkillLevels={setTroopSkillLevels}
        setMysticOrbs={setMysticOrbs}
      />

      {leaderboardOpen && (
        <Leaderboard
          onClose={() => setLeaderboardOpen(false)}
          playerEntries={playerEntries}
          crews={[]}
          playerCrewId={null}
        />
      )}

      {winner && (
        <WinScreen
          winner={winner} aiFaction={aiFaction}
          setWinner={setWinner} setTiles={setTiles} setCmds={setCmds}
          setMode={setMode} setSelKey={setSelKey} setUpgQueue={setUpgQueue}
          setBldgs={setBldgs} setTroopCounts={setTroopCounts}
          setAiRss={setAiRss} setAiBldgs={setAiBldgs} setAiBarracksPool={setAiBarracksPool}
          aiLastActionRef={aiLastActionRef} setScreen={setScreen}
          setWounded={setWounded} setWoundedQueue={setWoundedQueue}
          setRss={setRss} setReinMarches={setReinMarches}
          setTrainingQueues={setTrainingQueues} setBLog={setBLog}
          setBattles={setBattles} setUnseenBattles={setUnseenBattles}
          setDeletingTiles={setDeletingTiles} setDeletingSecsLeft={setDeletingSecsLeft}
          setPlayerHqKey={setPlayerHqKey} setAiHqKeys={setAiHqKeys}
        />
      )}

      <Minimap tiles={tiles} pKeys={pKeys} panRef={panRef} zoomRef={zoomRef} redrawRef={minimapRedrawRef} playerFacKey={facKey} crewmatePlayerIds={crewmatePlayerIds} playerHqKey={playerHqKey} aiHqKeys={aiHqKeys} onWorldMap={() => setWorldMapOpen(true)} forts={forts} />

      {/* HQ + Search buttons overlapping bottom of minimap */}
      {!worldMapOpen && !hqOpen && !cmdScreenOpen && !gearScreenOpen && (
        <div style={{ position:"fixed", top:"calc(var(--sat) + 100px)", left:8, zIndex:300, display:"flex", gap:5, width:130, justifyContent:"center" }}>
          <button onClick={centerOnHQ} style={{
            width:44, height:44, borderRadius:"50%",
            background:"radial-gradient(circle at 35% 30%, #2a1e08, #0e0a04)",
            border:"1px solid rgba(200,160,64,.35)",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            cursor:"pointer", padding:0, gap:1,
            boxShadow:"0 0 10px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06)",
            touchAction:"manipulation",
          }}>
            <span style={{fontSize:18, lineHeight:1}}>🏰</span>
            <span style={{fontSize:6, color:"#c8a060", fontFamily:"'Cinzel',serif", letterSpacing:".04em"}}>HQ</span>
          </button>
          <button onClick={() => setSearchOpen(v => !v)} style={{
            width:44, height:44, borderRadius:"50%",
            background:"radial-gradient(circle at 35% 30%, #0a1828, #040c14)",
            border:"1px solid rgba(80,140,200,.25)",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            cursor:"pointer", padding:0, gap:1,
            boxShadow:"0 0 10px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.06)",
            touchAction:"manipulation",
          }}>
            <span style={{fontSize:18, lineHeight:1}}>🔍</span>
            <span style={{fontSize:6, color:"#80aacc", fontFamily:"'Cinzel',serif", letterSpacing:".04em"}}>SEARCH</span>
          </button>
        </div>
      )}

      {/* Wizard's Tomes trigger — bottom-left below minimap */}
      {!tomesOpen && !hqOpen && !cmdScreenOpen && !gearScreenOpen && (
        <button onClick={()=>setTomesOpen(true)} style={{
          position:"fixed", left:8, bottom:"calc(var(--sab, 0px) + 6px)", zIndex:300,
          background:"radial-gradient(circle at 35% 30%, #1a1030, #08060e)",
          border:"1px solid rgba(200,160,64,.25)", borderRadius:"50%",
          width:75, height:75,
          display:"flex", alignItems:"center", justifyContent:"center",
          cursor:"pointer", padding:0,
          boxShadow:"0 0 14px rgba(80,40,120,.4), inset 0 1px 0 rgba(255,255,255,.06)",
          touchAction:"manipulation",
        }}>
          <ScrollStackIcon size={55}/>
        </button>
      )}

      {tomesOpen && (
        <WizardsTomes
          open={tomesOpen}
          onClose={()=>setTomesOpen(false)}
          facKey={facKey}
          tomesLevel={tomesLevel}
          setTomesLevel={setTomesLevel}
          powerPool={powerPool}
          setPowerPool={setPowerPool}
          powerPerHr={powerPerHr}
          tomesUnspentPoints={tomesUnspentPoints}
          setTomesUnspentPoints={setTomesUnspentPoints}
          onNodeLevelsChange={setTomesNodeLevels}
        />
      )}

      {gearScreenOpen && (
        <BagScreen
          gearInventory={gearInventory}
          setGearInventory={setGearInventory}
          cmds={cmds}
          setCmds={setCmds}
          playerAlignment={playerAlignment}
          respectSchematics={respectSchematics}
          consumables={consumables}
          onUseConsumable={useConsumable}
          onClose={() => setGearScreenOpen(false)}
        />
      )}

      {cmdScreenOpen && (
        <CommanderScreen
          cmds={cmds}
          setCmds={setCmds}
          bldgs={bldgs}
          gearInventory={gearInventory}
          setGearInventory={setGearInventory}
          respectSchematics={respectSchematics}
          onSchematicUsed={(id) => setRespectSchematics(prev => prev.filter(s => s.instanceId !== id))}
          initialUid={cmdScreenUid}
          gems={gems}
          setGems={setGems}
          onClose={() => { setCmdScreenOpen(false); setCmdScreenUid(null); }}
        />
      )}

      {/* ── Recall Popup — stationed at fort ── */}
      {recallPopup && (
        <div style={{
          position:"fixed", inset:0, zIndex:800,
          background:"rgba(0,0,0,0.75)",
          display:"flex", alignItems:"center", justifyContent:"center",
          pointerEvents:"auto",
        }} onClick={() => setRecallPopup(null)}>
          <div style={{
            background:"rgba(8,10,16,.97)",
            border:"1px solid #8a6020",
            borderRadius:8,
            padding:"16px 20px",
            minWidth:220,
            boxShadow:"0 8px 32px rgba(0,0,0,.9), 0 0 0 1px rgba(200,160,64,.15)",
            animation:"fadeUp .15s ease",
          }} onClick={e => e.stopPropagation()}>
            <div style={{fontFamily:"'Cinzel',serif", fontSize:11, color:"#c8a060", fontWeight:700, letterSpacing:".06em", marginBottom:12, textAlign:"center"}}>
              ↩ RECALL — {recallPopup.cmdName}
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              <button onClick={() => recallToFort(recallPopup.uid, recallPopup.fortTileKey)}
                style={{padding:"8px 12px", background:"linear-gradient(135deg,rgba(20,60,100,.7),rgba(10,40,80,.5))", border:"1px solid #2060a0", borderRadius:5, color:"#80c0f0", fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:".05em"}}>
                📍 Return to Fort
              </button>
              <button onClick={() => recallToHQ(recallPopup.uid)}
                style={{padding:"8px 12px", background:"linear-gradient(135deg,rgba(80,50,10,.7),rgba(60,30,0,.5))", border:"1px solid #a07020", borderRadius:5, color:"#f0c060", fontFamily:"'Cinzel',serif", fontSize:10, fontWeight:700, cursor:"pointer", letterSpacing:".05em"}}>
                🏰 Return to HQ
              </button>
              <button onClick={() => setRecallPopup(null)}
                style={{padding:"5px 12px", background:"rgba(40,30,20,.5)", border:"1px solid #3a2a18", borderRadius:5, color:"#6a5a4a", fontFamily:"'Cinzel',serif", fontSize:9, cursor:"pointer"}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {worldMapPrompt && (
        <div style={{
          position:"fixed", inset:0, zIndex:700,
          background:"rgba(0,0,0,0.75)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }} onClick={() => setWorldMapPrompt(false)}>
          <div style={{
            background:"rgba(5,7,11,0.98)",
            border:"1px solid #8a6020",
            borderRadius:8,
            padding:"20px 24px",
            width:220,
            textAlign:"center",
            boxShadow:"0 8px 40px rgba(0,0,0,0.8)",
          }} onClick={e => e.stopPropagation()}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:13,color:"#c8a060",marginBottom:8}}>
              🗺 World Map
            </div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:9,color:"#6a5a4a",marginBottom:16,lineHeight:1.6}}>
              You're at maximum zoom out.<br/>Open the world map?
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center"}}>
              <button onClick={() => { setWorldMapPrompt(false); setWorldMapOpen(true); }}
                style={{
                  padding:"8px 16px",
                  background:"linear-gradient(160deg,#2a1e08,#120e04)",
                  border:"1px solid #8a6020", borderRadius:4,
                  color:"#f0c060", fontFamily:"'Cinzel',serif",
                  fontSize:10, cursor:"pointer",
                }}>Open Map</button>
              <button onClick={() => setWorldMapPrompt(false)}
                style={{
                  padding:"8px 16px",
                  background:"none",
                  border:"1px solid #2a2418", borderRadius:4,
                  color:"#6a5a4a", fontFamily:"'Cinzel',serif",
                  fontSize:10, cursor:"pointer",
                }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {worldMapOpen && (
        <WorldMap
          tiles={tiles}
          crossings={crossingsState}
          keepMeta={keepMeta}
          onClose={() => setWorldMapOpen(false)}
          onTeleport={teleportTo}
          panRef={panRef}
          zoom={zoomState}
          playerHqKey={playerHqKey}
          crewmatePlayerIds={crewmatePlayerIds}
          aiHqKeys={aiHqKeys}
          forts={forts}
        />
      )}

      <GameBar
        cmds={cmds}
        facName={facName}
        tiles={tiles}
        unseenBattles={unseenBattles}
        setHqOpen={setHqOpen} setHqTab={setHqTab}
        onCenterHQ={centerOnHQ}
        setScreen={setScreen}
        setShowBattleLog={setShowBattleLog}
        setUnseenBattles={setUnseenBattles}
        setCmdScreenOpen={setCmdScreenOpen}
        setCmdScreenUid={setCmdScreenUid}
        setGearScreenOpen={setGearScreenOpen}
        gearInventoryCount={gearInventory.length}
        setLeaderboardOpen={setLeaderboardOpen}
        playerHqKey={playerHqKey}
        hidden={worldMapOpen || hqOpen || cmdScreenOpen || gearScreenOpen || showBattleLog || tomesOpen}
        showPerf={showPerf}
        setShowPerf={setShowPerf}
        panRef={panRef}
        zoomRef={zoomRef}
        mapRendererRef={mapRendererRef}
        voidTapReady={voidTapReady}
        crewOpen={crewOpen} setCrewOpen={setCrewOpen} playerCrewId={playerCrewId}
        searchOpen={searchOpen} setSearchOpen={setSearchOpen}
        forts={forts}
        spawns={spawns}
        spawnWorkerRef={spawnWorkerRef}
        eligibleSpawnKeysRef={eligibleSpawnKeysRef}
      />

      {showPerf && <PerfOverlay open={showPerf} onToggle={() => setShowPerf(v => !v)} />}

      {crewOpen && (
        <CrewScreen
          onClose={() => setCrewOpen(false)}
          crews={crews}
          playerCrewId={playerCrewId}
          pendingCrewId={pendingCrewId}
          playerName={facName}
          facKey={facKey}
          playerGems={gems}
          crewCreationCost={500}
          now={Date.now()}
          // members/officers/founder store faction keys for AI, player's facKey
          // for the human (see normalizeCrewsForPlayer in useChat.js — chat
          // swaps facKey -> "player" for the local player, founder included).
          // Nyro — a named companion, always in the player's faction — always
          // joins the player's crew too (shared/constants/nyro.js).
          onCreateCrew={({ name, abbr, description, emblem, privacy, language }) => {
            const id = `crew_${Date.now()}`;
            const crew = createCrew({ id, name, abbr, description, emblem, privacy, language, faction: facKey, founderId: facKey });
            setCrews(prev => [...prev, { ...crew, members: [...crew.members, NYRO_ID] }]);
            setGems(g => (g || 0) - 500);
            setPlayerCrewId(id);
          }}
          onJoinRequest={(crewId, mode) => {
            const join = () => {
              setCrews(prev => prev.map(c =>
                c.id === crewId ? { ...c, members: [...new Set([...(c.members || []), facKey, NYRO_ID])] } : c
              ));
              setPlayerCrewId(crewId);
              setPendingCrewId(null);
            };
            if (mode === "request") {
              // Locked crews go through a real (if short) pending window
              // instead of an instant join — same "reads as someone actually
              // responding" pattern as Nyro's friend-request delay
              // (useRelations.js) — there's no other real player to decline it.
              setPendingCrewId(crewId);
              setTimeout(join, 2500);
            } else {
              join();
            }
          }}
          onLeaveCrew={() => {
            setCrews(prev => prev.map(c =>
              c.id === playerCrewId
                ? { ...c, members: (c.members || []).filter(m => m !== facKey && m !== NYRO_ID),
                    officers: (c.officers || []).filter(m => m !== facKey) }
                : c
            ));
            setPlayerCrewId(null); setPendingCrewId(null);
          }}
          onDisbandCrew={() => {
            setCrews(prev => prev.filter(c => c.id !== playerCrewId));
            setPlayerCrewId(null); setPendingCrewId(null);
          }}
          onPromote={(targetId) => setCrews(prev => prev.map(c => {
            if (c.id !== playerCrewId || !canPromote(c, facKey)) return c;
            return { ...c, officers: [...new Set([...(c.officers || []), targetId])] };
          }))}
          onDemote={(targetId) => setCrews(prev => prev.map(c => {
            if (c.id !== playerCrewId || !canDemote(c, facKey)) return c;
            return { ...c, officers: (c.officers || []).filter(o => o !== targetId) };
          }))}
          onKick={(targetId) => setCrews(prev => prev.map(c => {
            if (c.id !== playerCrewId || !canKick(c, facKey, targetId)) return c;
            return {
              ...c,
              members: (c.members || []).filter(m => m !== targetId),
              officers: (c.officers || []).filter(o => o !== targetId),
            };
          }))}
          // Fortress placement happens on the world map (click an unclaimed
          // p10+ tile → "BUILD CREW FORTRESS" in TilePopup.jsx), so this just
          // closes the crew screen so the player can go pick a tile.
          onRequestBuildFortress={() => setCrewOpen(false)}
          onDemolishFortress={(fortressId) => setCrews(prev => prev.map(c =>
            c.id === playerCrewId && canDemolishFortress(c, facKey) ? removeFortress(c, fortressId) : c
          ))}
          onBuyStoreItem={(itemId) => {
            const crew = crews.find(c => c.id === playerCrewId);
            const item = CREW_STORE_ITEMS.find(i => i.id === itemId);
            if (!crew || !item) return;
            const spent = spendContribution(crew, facKey, item.cost);
            if (!spent) return; // can't afford
            setCrews(prev => prev.map(c => c.id === playerCrewId ? spent : c));
            if (item.effect?.type === "resource") {
              setRss(prev2 => ({ ...prev2, [item.effect.res]: (prev2[item.effect.res] || 0) + item.effect.amount }));
            } else if (item.effect?.type === "consumable") {
              // Grants a real bag item, redeemed later via the existing
              // useConsumable(typeId) flow (src/hooks/useConsumables.js) —
              // same path as any other su_bldg_*/relocation consumable.
              setConsumables(prev => {
                const existing = prev.find(c2 => c2.typeId === item.effect.typeId);
                return existing
                  ? prev.map(c2 => c2.typeId === item.effect.typeId ? { ...c2, quantity: c2.quantity + 1 } : c2)
                  : [...prev, createConsumable(item.effect.typeId, 1)];
              });
            }
          }}
          // Crew Help: speeds up the player's own currently-active building
          // upgrade (shared/constants/buildings.js's crewHallStats/
          // crewHelpAmount), tracked per-upgrade via a helpsUsed field added
          // straight onto its upgQueue entry.
          crewHallLvl={bldgs.crewhall || 1}
          helpsUsed={(() => {
            const key = Object.keys(upgQueue || {})[0];
            return key ? (upgQueue[key].helpsUsed || 0) : 0;
          })()}
          canHelp={(() => {
            const key = Object.keys(upgQueue || {})[0];
            if (!key) return false;
            const stats = crewHallStats(bldgs.crewhall || 1);
            return (upgQueue[key].helpsUsed || 0) < stats.maxHelps;
          })()}
          onHelpMember={() => {
            const key = Object.keys(upgQueue || {})[0];
            if (!key) return;
            const crewHallLvl = bldgs.crewhall || 1;
            const stats = crewHallStats(crewHallLvl);
            setUpgQueue(q => {
              const entry = q[key];
              if (!entry || (entry.helpsUsed || 0) >= stats.maxHelps) return q;
              const reduceMs = crewHelpAmount(entry.dur, crewHallLvl);
              return { ...q, [key]: { ...entry, endsAt: Math.max(Date.now(), entry.endsAt - reduceMs), helpsUsed: (entry.helpsUsed || 0) + 1 } };
            });
          }}
          onUpdateAnnouncement={(text) => setCrews(prev => prev.map(c =>
            c.id === playerCrewId ? updateAnnouncement(c, facKey, text) : c
          ))}
          onSetTarget={(label) => setCrews(prev => prev.map(c =>
            c.id === playerCrewId ? setCrewTarget(c, facKey, { tileKey: "manual", label }) : c
          ))}
          onClearTarget={() => setCrews(prev => prev.map(c =>
            c.id === playerCrewId ? clearCrewTarget(c, facKey) : c
          ))}
          onSetDiplomacy={(targetCrewId, status) => setCrews(prev => prev.map(c =>
            c.id === playerCrewId ? setDiplomacyStatus(c, facKey, targetCrewId, status) : c
          ))}
          onDeclareWar={() => setCrews(prev => prev.map(c =>
            c.id === playerCrewId ? declareWar(c, facKey) : c
          ))}
          onCancelWar={() => setCrews(prev => prev.map(c =>
            c.id === playerCrewId ? cancelWar(c, facKey) : c
          ))}
        />
      )}

      {/* Chat never shows alongside another full-screen/overlay menu (World
          Map, HQ, Commander/Gear screens, Battle Log, Wizard's Tomes, Crew,
          Leaderboard, the win screen) — same set GameBar's own "hidden"
          prop below already checks. */}
      {!chatOpen && !chatBlocked && (
        <ChatPreview
          onOpen={() => setChatOpen(true)}
          playerId="player"
          messages={chatRecentMessages}
          crews={chatNormalizedCrews}
          profanityFilterEnabled={chatProfanityFilterEnabled}
          unreadCount={chatUnreadCount}
        />
      )}

      {chatOpen && !chatBlocked && (
        <ChatPanel
          onClose={() => setChatOpen(false)}
          playerId="player"
          playerName={facName}
          channels={chatChannels}
          sendMessage={sendChatMessage}
          startDm={startChatDm}
          startGroup={startChatGroup}
          getMessages={getChatMessages}
          knownPlayerIds={chatKnownPlayerIds}
          crews={chatNormalizedCrews}
          profanityFilterEnabled={chatProfanityFilterEnabled}
          setProfanityFilterEnabled={setChatProfanityFilterEnabled}
          nameOf={relationsNameOf}
          friends={relFriends}
          blocked={relBlocked}
          incoming={relIncoming}
          outgoing={relOutgoing}
          addFriend={relAddFriend}
          declineIncoming={relDeclineIncoming}
          cancelOutgoing={relCancelOutgoing}
          unfriend={relUnfriend}
          blockPlayer={relBlockPlayer}
          unblockPlayer={relUnblockPlayer}
          search={relSearch}
          onManageCrewSubchannels={manageCrewSubchannels}
          addGroupSubchannel={addGroupSubchannel}
          removeGroupSubchannel={removeGroupSubchannel}
          moveGroupSubchannel={moveGroupSubchannel}
          leaveGroup={leaveChatGroup}
          activeDisplay={chatActiveDisplay} setActiveDisplay={setChatActiveDisplay}
          activeChannelId={chatActiveChannelId} setActiveChannelId={setChatActiveChannelId}
          activeSubId={chatActiveSubId} setActiveSubId={setChatActiveSubId}
          mutedChannelIds={chatMutedChannelIds} toggleMute={chatToggleMute}
          reactions={chatReactions} toggleReaction={chatToggleReaction}
          typingByChannel={chatTypingByChannel}
          markRead={chatMarkRead}
          unreadLeafIds={chatUnreadLeafIds}
          unreadTopIds={chatUnreadTopIds}
        />
      )}

    </div>
    </GameContext.Provider>
  );
}
