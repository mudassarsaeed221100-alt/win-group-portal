"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const roles = [
  { label: "📢 Sab ko", value: "all" },
  { label: "Super Admin", value: "super_admin" },
  { label: "Admin", value: "admin" },
  { label: "Staff", value: "staff" },
];

const types = [
  { label: "Information", value: "info", color: "#3b82f6" },
  { label: "Success", value: "success", color: "#10b981" },
  { label: "Warning", value: "warning", color: "#f59e0b" },
  { label: "Urgent", value: "urgent", color: "#ef4444" },
];

const toArr = (r: any): string[] =>
  Array.isArray(r) ? r : r ? String(r).split(/[,{}"\s]+/).filter(Boolean) : [];

export default function Notifications() {
  const [list, setList] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [sel, setSel] = useState<string[]>(["all"]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [ok, setOk] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const per = 10;

  useEffect(() => { load(); }, []);

  function show(m: string, good = true) {
    setNotice(m); setOk(good);
    setTimeout(() => setNotice(""), 4000);
  }

  async function load() {
    const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
    if (error) return show(error.message, false);
    setList(data || []);
  }

  function toggleRole(v: string) {
    if (v === "all") return setSel(["all"]);
    const rest = sel.filter((x) => x !== "all");
    const next = rest.includes(v) ? rest.filter((x) => x !== v) : [...rest, v];
    setSel(next.length ? next : ["all"]);
  }

  function reset() {
    setTitle(""); setMessage(""); setType("info"); setSel(["all"]); setEditingId(null);
  }

  async function save() {
    if (!title.trim() || !message.trim()) return show("Title aur message dono zaroori hain.", false);
    setLoading(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const uid = s.session?.user?.id;
      if (!uid) throw new Error("Session expire ho gaya. Dobara login karein.");
      const rec = {
        title: title.trim(),
        message: message.trim(),
        notification_type: type,
        recipient_roles: sel,
        updated_at: new Date().toISOString(),
      };
      const r = editingId
        ? await supabase.from("notifications").update(rec).eq("id", editingId)
        : await supabase.from("notifications").insert({ ...rec, status: "active", created_by: uid });
      if (r.error) throw r.error;
      show(editingId ? "✅ Notification update ho gayi." : "✅ Notification bhej di gayi.");
      reset(); load();
    } catch (e: any) { show(e.message || "Save nahi hua", false); }
    setLoading(false);
  }

  function edit(n: any) {
    setEditingId(n.id); setTitle(n.title); setMessage(n.message); setType(n.notification_type || "info");
    const r = toArr(n.recipient_roles); setSel(r.length ? r : ["all"]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggleStatus(n: any) {
    const st = n.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("notifications").update({ status: st, updated_at: new Date().toISOString() }).eq("id", n.id);
    if (error) return show(error.message, false);
    show(st === "active" ? "✅ Active ho gayi" : "⏸ Band ho gayi"); load();
  }

  async function remove(ids: string[]) {
    if (!ids.length || !confirm(`${ids.length} notification delete karni hai?`)) return;
    const { error } = await supabase.from("notifications").delete().in("id", ids);
    if (error) return show(error.message, false);
    show("✅ Delete ho gayi"); setPicked(new Set()); if (editingId && ids.includes(editingId)) reset(); load();
  }

  const q = search.toLowerCase();
  const filtered = list.filter((n) =>
    (!q || `${n.title} ${n.message}`.toLowerCase().includes(q)) &&
    (typeFilter === "all" || n.notification_type === typeFilter) &&
    (statusFilter === "all" || n.status === statusFilter));
  const pages = Math.ceil(filtered.length / per);
  const shown = filtered.slice((page - 1) * per, page * per);
  const color = (t: string) => types.find((x) => x.value === t)?.color || "#888";
  const roleName = (v: string) => roles.find((x) => x.value === v)?.label || v;

  const box: React.CSSProperties = { background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: 20, marginBottom: 20 };
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#252525", border: "1px solid #444", borderRadius: 6, color: "#fff", fontSize: 12, boxSizing: "border-box", fontFamily: "Arial, sans-serif" };
  const btn = (bg: string, c = "#fff"): React.CSSProperties => ({ padding: "6px 12px", background: bg, color: c, border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: "bold" });

  return (
    <div style={{ padding: 20, color: "#e9e9e9" }}>
      <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>COMMUNICATION CENTER</div>
      <h2 style={{ margin: 0, fontSize: 22, color: "#fff" }}>Notifications Center</h2>
      <p style={{ margin: "6px 0 16px", color: "#aaa", fontSize: 12 }}>Announcement bhejein. Ye chune hue roles ke portal mein nazar aayegi.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
        {[["Total", list.length, "#3b82f6"], ["Active", list.filter((n) => n.status === "active").length, "#10b981"],
          ["Band", list.filter((n) => n.status !== "active").length, "#888"], ["Urgent", list.filter((n) => n.notification_type === "urgent").length, "#ef4444"]].map(([l, v, c]) => (
          <div key={l as string} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: "#888" }}>{l}</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: c as string, marginTop: 6 }}>{v}</div>
          </div>
        ))}
      </div>

      {notice && <div style={{ padding: "12px 16px", background: ok ? "#064e3b" : "#7f1d1d", color: ok ? "#86efac" : "#fca5a5", borderRadius: 6, marginBottom: 16, fontSize: 12 }}>{notice}</div>}

      <div style={box}>
        <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#fff" }}>{editingId ? "Edit Notification" : "Nayi Notification"}</h3>
        <div style={{ display: "grid", gap: 12 }}>
          <input style={inp} placeholder="Title *" value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea style={inp} rows={4} placeholder="Message *" value={message} onChange={(e) => setMessage(e.target.value)} />
          <select style={inp} value={type} onChange={(e) => setType(e.target.value)}>
            {types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <div>
            <div style={{ fontSize: 11, color: "#aaa", marginBottom: 8, fontWeight: "bold" }}>Kis ko bhejni hai</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
              {roles.map((r) => (
                <label key={r.value} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: 8, borderRadius: 6, border: "1px solid #444", fontSize: 12, background: sel.includes(r.value) ? "#2563eb" : "#252525" }}>
                  <input type="checkbox" checked={sel.includes(r.value)} onChange={() => toggleRole(r.value)} />{r.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button disabled={loading} style={{ ...btn("#2563eb"), padding: "10px 16px", fontSize: 12, opacity: loading ? 0.6 : 1 }} onClick={save}>
            {loading ? "Saving..." : editingId ? "Update" : "📤 Bhejein"}
          </button>
          {editingId && <button style={{ ...btn("#444"), padding: "10px 16px", fontSize: 12 }} onClick={reset}>Cancel</button>}
        </div>
      </div>

      <div style={box}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 14 }}>
          <input style={inp} placeholder="🔍 Search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select style={inp} value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="all">All Types</option>{types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select style={inp} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option><option value="active">Active</option><option value="inactive">Band</option>
          </select>
          {picked.size > 0 && <button style={btn("#7f1d1d", "#fca5a5")} onClick={() => remove([...picked])}>🗑 Delete {picked.size}</button>}
        </div>

        {shown.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Abhi koi notification nahi hai.</div> :
          shown.map((n) => (
            <div key={n.id} style={{ padding: "14px 0", borderTop: "1px solid #262626", display: "flex", gap: 12 }}>
              <input type="checkbox" checked={picked.has(n.id)} onChange={() => { const s = new Set(picked); s.has(n.id) ? s.delete(n.id) : s.add(n.id); setPicked(s); }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <b style={{ color: "#fff", fontSize: 13 }}>{n.title}</b>
                  <div style={{ display: "flex", gap: 6 }}>
                    <span style={{ padding: "3px 9px", borderRadius: 4, fontSize: 10, fontWeight: "bold", background: color(n.notification_type) + "20", color: color(n.notification_type) }}>{n.notification_type}</span>
                    <span style={{ padding: "3px 9px", borderRadius: 4, fontSize: 10, fontWeight: "bold", background: n.status === "active" ? "#064e3b" : "#333", color: n.status === "active" ? "#86efac" : "#aaa" }}>{n.status === "active" ? "ACTIVE" : "BAND"}</span>
                  </div>
                </div>
                <p style={{ margin: "6px 0", fontSize: 12, color: "#aaa", whiteSpace: "pre-wrap" }}>{n.message}</p>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
                  👥 {(toArr(n.recipient_roles).length ? toArr(n.recipient_roles) : ["all"]).map(roleName).join(", ")} · {new Date(n.created_at).toLocaleString("en-PK")}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={btn("#2563eb")} onClick={() => edit(n)}>Edit</button>
                  <button style={btn("#444")} onClick={() => toggleStatus(n)}>{n.status === "active" ? "Band karein" : "Active karein"}</button>
                  <button style={btn("#7f1d1d", "#fca5a5")} onClick={() => remove([n.id])}>Delete</button>
                </div>
              </div>
            </div>
          ))}

        {pages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button key={p} style={btn(page === p ? "#2563eb" : "#333")} onClick={() => setPage(p)}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
