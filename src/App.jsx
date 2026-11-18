import { useCallback, useEffect, useState } from "react";

// relative url on purpose. vite proxy (dev) and nginx (prod) route it to the backend.
const API = "/api";

// short links are served by the backend at /s/<code> on the same site
function shortUrl(code) {
  return `${window.location.origin}/s/${code}`;
}

// navigator.clipboard only works on https or localhost.
// on a plain http server ip it does not exist, so we fall back to an old trick.
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const el = document.createElement("textarea");
  el.value = text;
  el.style.position = "fixed";
  el.style.opacity = "0";
  document.body.appendChild(el);
  el.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(el);
  if (!ok) throw new Error("copy failed");
}

function readKey() {
  try {
    return localStorage.getItem("adminKey") || "";
  } catch {
    return "";
  }
}

export default function App() {
  const [links, setLinks] = useState([]);
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [adminKey, setAdminKey] = useState(readKey);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiUp, setApiUp] = useState(null);
  const [keyRequired, setKeyRequired] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const loadLinks = useCallback(async () => {
    try {
      const res = await fetch(`${API}/links`);
      if (!res.ok) throw new Error();
      setLinks(await res.json());
    } catch {
      setError("could not load links");
    }
  }, []);

  useEffect(() => {
    fetch(`${API}/health`)
      .then(async (r) => {
        setApiUp(r.ok);
        const data = await r.json().catch(() => ({}));
        if (data.keyRequired === false) setKeyRequired(false);
      })
      .catch(() => setApiUp(false));
    loadLinks();
    // refresh every 10 seconds so click counts stay current
    const t = setInterval(loadLinks, 10000);
    return () => clearInterval(t);
  }, [loadLinks]);

  function saveKey(value) {
    setAdminKey(value);
    try {
      localStorage.setItem("adminKey", value);
    } catch {
      /* storage can be blocked, the key just will not be remembered */
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ url, code: code.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "could not create link");
      setUrl("");
      setCode("");
      loadLinks();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("delete this link? the short url will stop working.")) return;
    setError("");
    const res = await fetch(`${API}/links/${id}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || "could not delete");
      return;
    }
    loadLinks();
  }

  async function handleCopy(link) {
    try {
      await copyText(shortUrl(link.code));
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError("could not copy, select the link and copy it by hand");
    }
  }

  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);

  return (
    <div className="wrap">
      <header>
        <h1>shortener</h1>
        <p className="status">
          api: {apiUp === null ? "checking..." : apiUp ? "connected" : "not reachable"}
          {" · "}
          {links.length} links · {totalClicks} clicks
        </p>
      </header>

      <form onSubmit={handleCreate} className="card">
        <label>
          long url
          <input
            type="url"
            required
            placeholder="https://example.com/a/very/long/page"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <div className="grid">
          <label>
            custom code (optional)
            <input
              placeholder="my-link"
              value={code}
              maxLength={32}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          {keyRequired && (
          <label>
            admin key
            <input
              type="password"
              placeholder="needed to create and delete"
              value={adminKey}
              onChange={(e) => saveKey(e.target.value)}
            />
          </label>
          )}
        </div>
        {error && <p className="error">{error}</p>}
        <button disabled={loading || !url.trim()}>
          {loading ? "shortening..." : "shorten"}
        </button>
      </form>

      <div className="list">
        {links.length === 0 && <p className="muted">no links yet</p>}
        {links.map((l) => (
          <div className="card link" key={l.id}>
            <div className="row">
              <a href={shortUrl(l.code)} target="_blank" rel="noreferrer" className="short">
                {shortUrl(l.code).replace(/^https?:\/\//, "")}
              </a>
              <span className="clicks">{l.clicks} clicks</span>
            </div>
            <p className="long" title={l.url}>{l.url}</p>
            <div className="row">
              <small className="muted">{new Date(l.createdAt).toLocaleString()}</small>
              <span className="actions">
                <button className="small" type="button" onClick={() => handleCopy(l)}>
                  {copiedId === l.id ? "copied" : "copy"}
                </button>
                <button className="small danger" type="button" onClick={() => handleDelete(l.id)}>
                  delete
                </button>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
