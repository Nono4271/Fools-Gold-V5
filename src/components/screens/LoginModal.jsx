import { useState } from "react";
import { loginAccount, registerAccount, getAccountUsername } from "../../utils/playerIdentity.js";

// Optional account login/register modal, shown from TitleScreen. Skippable —
// declining just keeps the existing per-browser guest id (playerIdentity.js).
export default function LoginModal({ onClose }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const loggedInAs = getAccountUsername();

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fn = mode === "login" ? loginAccount : registerAccount;
      await fn(username.trim(), password);
      onClose();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:50,background:"rgba(0,0,0,.7)",display:"flex",alignItems:"center",justifyContent:"center"}}
         onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()}
        style={{width:280,background:"#1a0a04",border:"1px solid #5a3a08",borderRadius:8,padding:20,display:"flex",flexDirection:"column",gap:10}}>
        <h2 style={{margin:0,color:"#f0c040",fontSize:16}}>{mode === "login" ? "Log In" : "Create Account"}</h2>
        {loggedInAs && <div style={{color:"#a8f0a8",fontSize:12}}>Currently logged in as {loggedInAs}</div>}
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username"
          autoComplete="username" style={{padding:8,borderRadius:4,border:"1px solid #5a3a08",background:"#0a0502",color:"#eee"}} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          style={{padding:8,borderRadius:4,border:"1px solid #5a3a08",background:"#0a0502",color:"#eee"}} />
        {error && <div style={{color:"#ff8080",fontSize:12}}>{error}</div>}
        <button className="btn" type="submit" disabled={busy || !username || !password}
          style={{padding:10,background:"linear-gradient(135deg,#7a1010,#c03030)",border:"1px solid #e04040",color:"#f0c040",fontWeight:700}}>
          {busy ? "…" : mode === "login" ? "Log In" : "Register"}
        </button>
        <button type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
          style={{background:"none",border:"none",color:"#d8a868",fontSize:12,cursor:"pointer"}}>
          {mode === "login" ? "Need an account? Register" : "Have an account? Log in"}
        </button>
        <button type="button" onClick={onClose} style={{background:"none",border:"none",color:"#888",fontSize:12,cursor:"pointer"}}>
          Cancel
        </button>
      </form>
    </div>
  );
}
