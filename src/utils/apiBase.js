// Where the game server's HTTP API (/api/register, /api/login) lives.
// Resolution order:
//   1. VITE_API_URL           (explicit, e.g. https://api.example.com)
//   2. VITE_WS_URL            (the same server the game's websocket uses:
//                              wss://host[/path] -> https://host, ws:// -> http://)
//   3. "" (same origin)       (dev: Vite proxies /api -> localhost:3001)
// A static-only host (Cloudflare Pages/Netlify/Vercel) has no /api, so with
// neither variable set a deployed site's register/login can't reach a server.
export function resolveApiBase({ apiUrl, wsUrl } = {}) {
  const clean = (s) => (typeof s === "string" ? s.trim() : "");
  const api = clean(apiUrl);
  if (api) return api.replace(/\/+$/, "");
  const ws = clean(wsUrl);
  if (ws) {
    try {
      const u = new URL(ws);
      const proto = u.protocol === "wss:" ? "https:" : u.protocol === "ws:" ? "http:" : u.protocol;
      return `${proto}//${u.host}`;
    } catch { /* not a URL — fall through to same-origin */ }
  }
  return "";
}
