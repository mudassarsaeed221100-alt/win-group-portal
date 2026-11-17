"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function InvitePage() {
  const [link, setLink] = useState("");
  const [exp, setExp] = useState("");
  const [left, setLeft] = useState(0);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!exp) return;
    const t = setInterval(() => setLeft(Math.max(0, Math.floor((new Date(exp).getTime() - Date.now()) / 1000))), 1000);
    return () => clearInterval(t);
  }, [exp]);

  async function make() {
    setBusy(true); setMsg("");
    const { data } = await supabase.auth.getSession();
    if (!data.session) { window.location.href = "/"; return; }
    const r = await fetch("/api/invite", { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}` } });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setMsg("❌ " + (j.error || "Link nahi bana"));
    setLink(`${window.location.origin}/join?code=${j.code}`);
    setExp(j.expires_at);
    setLeft(300);
  }

  function copy() { navigator.clipboard.writeText(link); setMsg("✅ Link copy ho gaya"); }
  const wa = `https://wa.me/?text=${encodeURIComponent("WIN GROUP join karne ka link (5 minute ke liye): " + link)}`;
  const btn = (bg: string, c = "#fff"): React.CSSProperties => ({ background: bg, color: c, border: "none", borderRadius: 10, padding: "11px 16px", fontWeight: 700, cursor: "pointer", fontSize: 14, textDecoration: "none", display: "inline-block" });

  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 26, color: "#eee", textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>🔗 Invite Link</h1>
        <p style={{ color: "#888", fontSize: 13, margin: "6px 0 18px" }}>Link sirf 5 minute aur sirf 1 banday ke liye chalta hai</p>

        {link && left > 0 ? (
          <>
            <div style={{ background: "#0a0a0a", border: "1px solid #333", borderRadius: 10, padding: 12, wordBreak: "break-all", fontSize: 13, marginBottom: 10 }}>{link}</div>
            <p style={{ color: left < 60 ? "#f87171" : "#fbbf24", marginBottom: 14 }}>⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} baqi</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button style={btn("#fff", "#000")} onClick={copy}>📋 Copy</button>
              <a href={wa} target="_blank" rel="noreferrer" style={btn("#16a34a")}>💬 WhatsApp</a>
            </div>
          </>
        ) : (
          <>
            {link && <p style={{ color: "#f87171", marginBottom: 12 }}>Purana link expire ho gaya</p>}
            <button style={btn("#fff", "#000")} disabled={busy} onClick={make}>{busy ? "Ban raha hai..." : "➕ Naya Link Banayein"}</button>
          </>
        )}

        {msg && <p style={{ marginTop: 14, fontSize: 14 }}>{msg}</p>}
        <p style={{ marginTop: 20 }}><a href="javascript:history.back()" style={{ color: "#888", fontSize: 13 }}>← Wapas</a></p>
      </div>
    </div>
  );
}
