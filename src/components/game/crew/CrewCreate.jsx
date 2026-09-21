import { useState } from "react";
import {
  CREW_PRIVACY, DEFAULT_CREW_PRIVACY, DEFAULT_EMBLEM, CREW_DESCRIPTION_MAX_LEN,
  CREW_LANGUAGES, DEFAULT_CREW_LANGUAGE,
} from "../../../../shared/constants/crew.js";
import { validateCrewCreation } from "../../../../shared/utils/crewRules.js";
import { EmblemPicker } from "./Emblem.jsx";
import { BTN_RESET, GOLD, TEXT_XS, primaryBtn } from "./crewStyles.js";

const PRIVACY_OPTIONS = [
  { id: CREW_PRIVACY.OPEN,   label: "Open",    icon: "🔓", desc: "Anyone can join instantly." },
  { id: CREW_PRIVACY.LOCKED, label: "Locked",  icon: "🔒", desc: "Players must request to join." },
  { id: CREW_PRIVACY.PRIVATE,label: "Private", icon: "🕶️", desc: "Invite-only — won't appear in search." },
];

export default function CrewCreate({ playerGems, crewCreationCost, onCreate, onCancel }) {
  const [name, setName]               = useState("");
  const [abbr, setAbbr]                = useState("");
  const [description, setDescription]  = useState("");
  const [emblem, setEmblem]            = useState(DEFAULT_EMBLEM);
  const [privacy, setPrivacy]          = useState(DEFAULT_CREW_PRIVACY);
  const [language, setLanguage]        = useState(DEFAULT_CREW_LANGUAGE);
  const [errs, setErrs]                = useState([]);

  const canAfford = (playerGems ?? 0) >= (crewCreationCost ?? 500);

  function handleSubmit() {
    const validationErrs = validateCrewCreation({ name, abbr, description, emblem, privacy, language });
    if (validationErrs.length) { setErrs(validationErrs); return; }
    onCreate({ name: name.trim(), abbr: abbr.trim().toUpperCase(), description: description.trim(), emblem, privacy, language });
  }

  if (!canAfford) {
    return (
      <div style={{ textAlign: "center", padding: "30px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ fontSize: 28 }}>🔒</div>
        <div style={{ ...TEXT_XS, color: "#6a5a4a", fontSize: 9 }}>Not enough gems</div>
        <div style={{ background: "rgba(200,160,60,.1)", border: "1px solid #c8a04030", borderRadius: 5, padding: "10px 16px" }}>
          <div style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "#f0c040", fontWeight: 700 }}>
            💎 {(crewCreationCost ?? 500).toLocaleString()} gems
          </div>
        </div>
        <button onClick={onCancel} style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a" }}>← Back</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(200,160,60,.1)", border: "1px solid #c8a04030", borderRadius: 5, padding: "8px 10px",
      }}>
        <span style={{ ...TEXT_XS, color: GOLD }}>Founding cost</span>
        <span style={{ fontFamily: "'Cinzel',serif", fontSize: 12, color: "#f0c040", fontWeight: 700 }}>
          💎 {(crewCreationCost ?? 500).toLocaleString()}
        </span>
      </div>

      <EmblemPicker value={emblem} onChange={setEmblem} />

      <div>
        <div style={{ ...TEXT_XS, color: "#5a6a7a", marginBottom: 4, letterSpacing: ".06em" }}>CREW NAME (4–20 chars)</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Iron Tide" maxLength={20}
          style={inputStyle()} />
      </div>

      <div>
        <div style={{ ...TEXT_XS, color: "#5a6a7a", marginBottom: 4, letterSpacing: ".06em" }}>ABBREVIATION (4 chars)</div>
        <input value={abbr} onChange={e => setAbbr(e.target.value.toUpperCase())} placeholder="e.g. IRON" maxLength={4}
          style={{ ...inputStyle(), fontSize: 13, letterSpacing: ".15em", textTransform: "uppercase" }} />
      </div>

      <div>
        <div style={{ ...TEXT_XS, color: "#5a6a7a", marginBottom: 4, letterSpacing: ".06em" }}>
          DESCRIPTION ({description.length}/{CREW_DESCRIPTION_MAX_LEN})
        </div>
        <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, CREW_DESCRIPTION_MAX_LEN))}
          placeholder="What is this crew about? What are you looking for?" rows={3}
          style={{ ...inputStyle(), resize: "vertical", fontFamily: "'Crimson Pro',serif", fontSize: 11 }} />
      </div>

      <div>
        <div style={{ ...TEXT_XS, color: "#5a6a7a", marginBottom: 4, letterSpacing: ".06em" }}>LANGUAGE</div>
        <select value={language} onChange={e => setLanguage(e.target.value)} style={inputStyle()}>
          {CREW_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div>
        <div style={{ ...TEXT_XS, color: "#5a6a7a", marginBottom: 4, letterSpacing: ".06em" }}>PRIVACY</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {PRIVACY_OPTIONS.map(opt => (
            <button key={opt.id} onClick={() => setPrivacy(opt.id)} style={{
              ...BTN_RESET, display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 5, textAlign: "left",
              background: privacy === opt.id ? "rgba(200,160,96,.1)" : "rgba(255,255,255,.03)",
              border: `1px solid ${privacy === opt.id ? GOLD : "#2a3040"}`,
            }}>
              <span style={{ fontSize: 15 }}>{opt.icon}</span>
              <div>
                <div style={{ fontFamily: "'Cinzel',serif", fontSize: 10, color: privacy === opt.id ? GOLD : "#8a95a5" }}>
                  {opt.label}
                </div>
                <div style={{ ...TEXT_XS, color: "#4a5a6a", fontSize: 8 }}>{opt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {errs.length > 0 && (
        <div style={{ background: "rgba(160,40,40,.15)", border: "1px solid #602020", borderRadius: 4, padding: "8px 10px" }}>
          {errs.map((e, i) => <div key={i} style={{ ...TEXT_XS, color: "#cc6060" }}>• {e}</div>)}
        </div>
      )}

      <button onClick={handleSubmit} style={primaryBtn(false)}>⚓ Create Crew</button>
      <button onClick={onCancel} style={{ ...BTN_RESET, ...TEXT_XS, color: "#5a6a7a", textAlign: "center", padding: "4px 0" }}>← Back</button>
    </div>
  );
}

function inputStyle() {
  return {
    width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,.05)",
    border: "1px solid #2a3040", borderRadius: 4, padding: "8px 10px", color: "#c8c0b0",
    fontFamily: "'Cinzel',serif", fontSize: 11, outline: "none",
  };
}
