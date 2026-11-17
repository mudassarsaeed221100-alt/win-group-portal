"use client";
import { useEffect, useState } from "react";

export default function JoinPage() {
  const [code, setCode] = useState("");
  const [info, setInfo] = useState<any>(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const [f, setF] = useState({ first_name: "", surname: "", username: "", phone: "", email: "", pw: "", trx_id: "" });

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("code") || "";
    setCode(c);
    if (!c) { setErr("Invite link ke baghair account nahi ban sakta"); return; }
    fetch("/api/join?code=" + c).then((r) => r.json()).then((j) => {
      if (j.error) setErr(j.error); else setInfo(j);
    });
  }, []);

  useEffect(() => {
    if (!info?.expires_at) return;
    const t = setInterval(() => {
      setLeft(Math.max(0, Math.floor((new Date(info.expires_at).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [info]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, code }),
    });
    const j = await r.json();
    setBusy(false);
    if (!r.ok) return setErr(j.error || "Account nahi bana");
    setDone(true);
  }

  const box: React.CSSProperties = { width: "100%", maxWidth: 440, background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 26, color: "#eee" };
  const input: React.CSSProperties = { width: "100%", padding: "11px 13px", background: "#0a0a0a", border: "1px solid #333", borderRadius: 10, color: "#fff", fontSize: 14, marginBottom: 10, boxSizing: "border-box" };
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={box}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <img src="https://eubrfvhinrubkmgwmdaf.supabase.co/storage/v1/object/public/avatars/download.jpeg" alt="" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>◆ WIN GROUP: Join</h1>
        </div>

        {done ? (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 40 }}>✅</p>
            <p style={{ fontSize: 16, marginBottom: 8 }}>Aap ki request bhej di gayi hai</p>
            <p style={{ color: "#888", fontSize: 14 }}>Payment check hone ke baad aap ka account approve hoga (24 ghante ke andar). Phir aap login kar sakenge.</p>
            <a href="/" style={{ display: "inline-block", marginTop: 16, color: "#60a5fa" }}>Login page</a>
          </div>
        ) : !info ? (
          <p style={{ color: err ? "#f87171" : "#888", textAlign: "center" }}>{err || "Check ho raha hai..."}</p>
        ) : (
          <form onSubmit={submit}>
            {info.referrer && <p style={{ color: "#888", fontSize: 13, marginBottom: 10 }}>👤 Invite: <b style={{ color: "#eee" }}>{info.referrer}</b></p>}
            <p style={{ color: left < 60 ? "#f87171" : "#fbbf24", fontSize: 13, marginBottom: 12 }}>
              ⏱ Link ka waqt: {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </p>

            <div style={{ background: "#0a0a0a", border: "1px solid #14532d", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <p style={{ fontSize: 14, marginBottom: 6 }}>💳 Pehle <b>Rs. {info.settings.entry_fee}</b> Easypaisa par bhejein:</p>
              <p style={{ fontSize: 20, fontWeight: 800 }}>{info.settings.easypaisa_number}</p>
              <p style={{ color: "#888", fontSize: 13 }}>{info.settings.easypaisa_name}</p>
              <p style={{ color: "#888", fontSize: 12, marginTop: 6 }}>Phir neeche apni TRX ID likhein</p>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input style={input} placeholder="First name" value={f.first_name} onChange={set("first_name")} required />
              <input style={input} placeholder="Surname" value={f.surname} onChange={set("surname")} />
            </div>
            <input style={input} placeholder="Username (misaal: ali_123)" value={f.username} onChange={set("username")} required />
            <input style={input} placeholder="Phone" value={f.phone} onChange={set("phone")} />
            <input style={input} type="email" placeholder="Email" value={f.email} onChange={set("email")} required />
            <input style={input} type="password" placeholder="Password (kam az kam 6)" value={f.pw} onChange={set("pw")} required />
            <input style={{ ...input, borderColor: "#14532d" }} placeholder="Easypaisa TRX ID" value={f.trx_id} onChange={set("trx_id")} required />

            {err && <p style={{ color: "#f87171", fontSize: 14, marginBottom: 10 }}>❌ {err}</p>}
            <button disabled={busy || left === 0} style={{ width: "100%", padding: 13, background: "#fff", color: "#000", border: "none", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
              {left === 0 ? "Link expire ho gaya" : busy ? "Bhej rahe hain..." : "✅ Join Karein"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
