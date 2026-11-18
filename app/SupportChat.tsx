"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";

const ROLE: Record<string, string> = { staff: "Staff", admin: "Admin", super_admin: "Super Admin", founder_owner: "Founder", system: "System" };
const isClosed = (t: any) => ["resolved", "closed"].includes(t?.status);

export default function SupportChat() {
  const [me, setMe] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [tab, setTab] = useState("active");
  const [openId, setOpenId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [showNew, setShowNew] = useState(false);
  const empty = { subject: "", category: "general", priority: "normal", message: "", type: "normal" };
  const [f, setF] = useState(empty);
  const box = useRef<HTMLDivElement>(null);

  async function api(method: string, body?: any, q = "") {
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/support" + q, {
      method, cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Masla aaya");
    return j;
  }

  async function loadList() {
    try { const j = await api("GET"); setMe(j.me); setTickets(j.tickets || []); }
    catch (e: any) { setNotice("❌ " + e.message); }
  }
  async function loadChat(id: string) {
    try { const j = await api("GET", null, "?ticket=" + id); setMsgs(j.messages || []); } catch {}
  }

  useEffect(() => { loadList(); const t = setInterval(loadList, 10000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (!openId) return;
    loadChat(openId);
    const t = setInterval(() => loadChat(openId), 4000);
    return () => clearInterval(t);
  }, [openId]);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [msgs.length]);

  async function run(fn: () => Promise<any>, ok?: string) {
    try { await fn(); if (ok) setNotice(ok); } catch (e: any) { setNotice("❌ " + e.message); }
  }

  const send = () => run(async () => {
    if (!text.trim() || !openId) return;
    await api("POST", { action: "send", ticket_id: openId, message: text });
    setText(""); await loadChat(openId);
  });

  const solve = () => {
    if (!confirm("Masla hal ho gaya? Chat band ho jayegi.")) return;
    run(async () => {
      await api("POST", { action: "solve", ticket_id: openId });
      setOpenId(null); setTab("history"); await loadList();
    }, "✅ Masla hal ho gaya, chat History mein chali gayi");
  };

  const escalate = () => {
    const reason = prompt("Founder ko kyun bhejna hai? Wajah likhein:");
    if (!reason?.trim()) return;
    run(async () => {
      await api("POST", { action: "escalate", ticket_id: openId, reason });
      await loadList(); if (openId) await loadChat(openId);
    }, "⬆️ Founder ko bhej diya");
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    run(async () => {
      const j = await api("POST", { action: "create", ...f });
      setF(empty); setShowNew(false); await loadList(); setTab("active"); setOpenId(j.id);
    }, "✅ Masla bhej diya");
  };

  const cur = tickets.find((t) => t.id === openId);
  const list = tickets.filter((t) => (tab === "active" ? !isClosed(t) : isClosed(t)));
  const canCreate = me && me.role !== "founder_owner";
  const badge = (t: any) => t.escalated === "complaint" ? "⚠️ Complaint" : t.escalated === "help" ? "🆘 Founder" : "";

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <h2 style={{ margin: 0, fontSize: 22 }}>💬 Support Chat</h2>
        <p style={{ color: "#aeb4bd", fontSize: 13, margin: "6px 0 0" }}>
          {me?.role === "staff" && "Apna masla Admin ko bhejein. Admin ki shikayat ho to Complaint chunein, wo seedha Founder ko jayegi."}
          {["admin", "super_admin"].includes(me?.role) && "Team ke masle hal karein. Hal na ho to Founder ko bhejein."}
          {me?.role === "founder_owner" && "Yahan sirf Help aur Complaint wale masle aate hain."}
        </p>
      </div>

      {notice && <div style={S.notice} onClick={() => setNotice("")}>{notice}</div>}

      {!openId && (
        <div style={S.card}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <button style={S.tab(tab === "active")} onClick={() => setTab("active")}>🟢 Active ({tickets.filter((t) => !isClosed(t)).length})</button>
            <button style={S.tab(tab === "history")} onClick={() => setTab("history")}>📁 History ({tickets.filter(isClosed).length})</button>
            {canCreate && <button style={S.tab(showNew)} onClick={() => setShowNew(!showNew)}>➕ Naya Masla</button>}
          </div>

          {showNew && canCreate && (
            <form onSubmit={create} style={{ ...S.item, marginBottom: 14 }}>
              <input style={S.input} placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} required />
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select style={{ ...S.input, flex: 1 }} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
                  <option value="general">📋 General</option><option value="account">👤 Account</option>
                  <option value="team">👥 Team</option><option value="payment">💰 Payment</option><option value="technical">🔧 Technical</option>
                </select>
                <select style={{ ...S.input, flex: 1 }} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
                  <option value="normal">🔹 Normal</option><option value="high">🔸 High</option><option value="urgent">🔴 Urgent</option>
                </select>
              </div>
              {me?.role === "staff" ? (
                <select style={S.input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                  <option value="normal">Admin ko bhejein (aam masla)</option>
                  <option value="complaint">⚠️ Complaint: Founder ko (Admin ke khilaf)</option>
                </select>
              ) : <p style={{ color: "#f5d28a", fontSize: 13 }}>🆘 Ye request Founder ko jayegi</p>}
              <textarea style={{ ...S.input, minHeight: 90 }} placeholder="Masla detail mein likhein..." value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} required />
              <button style={S.btn("#e5e7eb", "#111")}>📤 Bhejein</button>
            </form>
          )}

          {list.length === 0 ? <p style={{ color: "#858995" }}>Koi chat nahi.</p> : list.map((t) => (
            <div key={t.id} style={{ ...S.item, cursor: "pointer" }} onClick={() => { setMsgs([]); setOpenId(t.id); }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <b>{t.subject}</b>
                <span style={{ fontSize: 12, color: isClosed(t) ? "#a8e6bf" : "#f5d28a" }}>{badge(t)} {isClosed(t) ? "✅ Hal" : t.status === "in_progress" ? "🔵 Jari" : "🟡 Naya"}</span>
              </div>
              <p style={{ color: "#858995", fontSize: 12, margin: "6px 0 0" }}>
                {t.mine ? "Aap" : `👤 ${t.owner_name} (${ROLE[t.owner_role] || ""})`} · {new Date(t.updated_at || t.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {openId && (
        <div style={S.card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <button style={S.btn("#22262d")} onClick={() => setOpenId(null)}>← Wapas</button>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {cur?.can_escalate && <button style={S.btn("#a16207")} onClick={escalate}>⬆️ Founder ko bhejein</button>}
              {cur?.can_solve && <button style={S.btn("#16a34a")} onClick={solve}>✅ Solve</button>}
            </div>
          </div>
          <b>{cur?.subject} {cur && badge(cur)}</b>
          <p style={{ color: "#858995", fontSize: 12, margin: "4px 0 10px" }}>
            {cur && !cur.mine ? `👤 ${cur.owner_name} (${ROLE[cur.owner_role] || ""})` : ""} {cur?.escalation_reason ? `· Wajah: ${cur.escalation_reason}` : ""}
          </p>

          <div ref={box} style={S.chat}>
            {msgs.length === 0 && <p style={{ color: "#858995" }}>Load ho raha hai...</p>}
            {msgs.map((m) => {
              if (m.sender_role === "system")
                return <div key={m.id} style={{ textAlign: "center", color: "#858995", fontSize: 12, margin: "8px 0" }}>{m.message}</div>;
              const mine = m.sender_id === me?.id;
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start", margin: "6px 0" }}>
                  <div style={{ maxWidth: "78%", background: mine ? "#14532d" : "#2a2f37", padding: "8px 12px", borderRadius: 12 }}>
                    <div style={{ fontSize: 11, color: "#aeb4bd", marginBottom: 3 }}>{mine ? "Aap" : `${m.sender_name} (${ROLE[m.sender_role] || ""})`}</div>
                    <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontSize: 14 }}>{m.message}</div>
                    <div style={{ fontSize: 10, color: "#858995", textAlign: "right", marginTop: 3 }}>{new Date(m.created_at).toLocaleString()}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {isClosed(cur) ? (
            <p style={{ color: "#a8e6bf", textAlign: "center", marginTop: 10 }}>🔒 Ye chat band hai (History)</p>
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <input style={{ ...S.input, marginBottom: 0, flex: 1 }} placeholder="Message likhein..." value={text}
                onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }} />
              <button style={S.btn("#e5e7eb", "#111")} onClick={send}>📤 Send</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const S: any = {
  wrap: { color: "#f1f3f5", display: "flex", flexDirection: "column", gap: 14, fontFamily: "Arial, sans-serif" },
  card: { background: "#17191d", border: "1px solid #30343b", borderRadius: 14, padding: 18 },
  item: { background: "#22262d", border: "1px solid #3a414b", borderRadius: 10, padding: 14, marginBottom: 10 },
  notice: { background: "#1e2a3a", border: "1px solid #2e4a6a", borderRadius: 10, padding: 12, fontSize: 14, cursor: "pointer" },
  input: { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid #3a414b", background: "#111", color: "#f1f3f5", fontSize: 14, marginBottom: 10, fontFamily: "inherit" },
  chat: { height: 380, overflowY: "auto", background: "#0d0f12", border: "1px solid #30343b", borderRadius: 10, padding: 12 },
  tab: (a: boolean) => ({ padding: "8px 14px", borderRadius: 20, border: "1px solid #3a414b", background: a ? "#e5e7eb" : "#22262d", color: a ? "#111" : "#aeb4bd", cursor: "pointer", fontSize: 13, fontWeight: 600 }),
  btn: (bg: string, c = "#fff") => ({ background: bg, color: c, border: "none", borderRadius: 8, padding: "9px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13 }),
};
