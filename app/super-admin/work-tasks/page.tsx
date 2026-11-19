"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function WorkTasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(true);
  const [filter, setFilter] = useState("all");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  async function headers() {
    const { data } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` };
  }
  function note(t: string, good = true) { setMsg(t); setOk(good); }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/tasks", { headers: await headers(), cache: "no-store" });
      const j = await r.json();
      if (!r.ok) note("❌ " + (j.error || "Data load nahi hua"), false);
      else { setTasks(j.tasks || []); setStaff(j.staff || []); }
    } catch { note("❌ Server se connection nahi hua", false); }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const name = (id: string) => {
    const s = staff.find((x) => x.id === id);
    return s ? `${s.first_name || ""} ${s.surname || ""}`.trim() || s.username || "Staff" : "Staff";
  };
  const toggle = (id: string) => setSel((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const allSel = staff.length > 0 && sel.length === staff.length;
  const shownStaff = staff.filter((s) => name(s.id).toLowerCase().includes(search.toLowerCase()));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return note("❌ Task ka title likhein", false);
    if (sel.length === 0) return note("❌ Kam az kam ek staff chunein", false);
    setSaving(true);
    const r = await fetch("/api/admin/tasks", {
      method: "POST", headers: await headers(),
      body: JSON.stringify({
        title, description: desc, reward_amount: reward, staff_ids: sel,
        deadline: deadline ? new Date(deadline + "T23:59:00").toISOString() : null,
      }),
    });
    const j = await r.json();
    setSaving(false);
    if (!r.ok) return note("❌ " + (j.error || "Task nahi bana"), false);
    note(`✅ Task ${sel.length} staff ko de diya gaya`);
    setTitle(""); setDesc(""); setReward(""); setDeadline(""); setSel([]);
    load();
  }

  async function setStatus(id: string, status: string) {
    const r = await fetch("/api/admin/tasks", { method: "PATCH", headers: await headers(), body: JSON.stringify({ id, status }) });
    r.ok ? load() : note("❌ Status nahi badla", false);
  }
  async function remove(id: string) {
    if (!confirm("Ye task delete karna hai?")) return;
    const r = await fetch(`/api/admin/tasks?id=${id}`, { method: "DELETE", headers: await headers() });
    r.ok ? (note("✅ Task delete ho gaya"), load()) : note("❌ Delete nahi hua", false);
  }

  const late = (t: any) => t.deadline && new Date(t.deadline) < new Date() && t.status === "active";
  const shown = tasks.filter((t) =>
    filter === "active" ? t.status === "active" && !late(t) : filter === "late" ? late(t) : filter === "inactive" ? t.status !== "active" : true);

  const card: React.CSSProperties = { background: "#1a1a1a", border: "1px solid #333", borderRadius: 14, padding: 22, marginBottom: 20 };
  const inp: React.CSSProperties = { width: "100%", padding: "12px 14px", background: "#111", border: "1px solid #3a3a3a", borderRadius: 10, color: "#fff", fontSize: 14, marginBottom: 12, boxSizing: "border-box", fontFamily: "inherit" };
  const btn = (bg: string, c = "#fff"): React.CSSProperties => ({ background: bg, color: c, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700 });

  return (
    <div style={{ color: "#eee" }}>
      {msg && (
        <div onClick={() => setMsg("")} style={{ ...card, padding: 14, cursor: "pointer", background: ok ? "#0f2e1f" : "#3a1414", borderColor: ok ? "#14532d" : "#7f1d1d", color: ok ? "#86efac" : "#fca5a5" }}>{msg}</div>
      )}

      <form onSubmit={create} style={card}>
        <h2 style={{ fontSize: 20, margin: "0 0 16px" }}>Assign New Task</h2>
        <input style={inp} placeholder="Task ka title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea style={{ ...inp, minHeight: 100 }} placeholder="Tafseel (kya karna hai)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <input style={{ ...inp, flex: 1, minWidth: 160 }} type="number" min="0" placeholder="💰 Reward (Rs.)" value={reward} onChange={(e) => setReward(e.target.value)} />
          <input style={{ ...inp, flex: 1, minWidth: 160, colorScheme: "dark" }} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, margin: "4px 0 10px" }}>
          <b>👥 Staff chunein ({sel.length} / {staff.length})</b>
          <button type="button" disabled={staff.length === 0} onClick={() => setSel(allSel ? [] : staff.map((s) => s.id))}
            style={btn(allSel ? "#333" : "#e5e7eb", allSel ? "#fff" : "#111")}>
            {allSel ? "✕ Sab hatayein" : "☑ Sab chunein"}
          </button>
        </div>
        {staff.length > 6 && <input style={inp} placeholder="🔍 Staff dhoondein" value={search} onChange={(e) => setSearch(e.target.value)} />}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: 8, maxHeight: 240, overflowY: "auto", padding: 10, background: "#111", border: "1px solid #3a3a3a", borderRadius: 10, marginBottom: 14 }}>
          {staff.length === 0 && <span style={{ color: "#888" }}>{loading ? "Load ho raha hai..." : "Team mein abhi koi staff nahi"}</span>}
          {shownStaff.map((s) => {
            const on = sel.includes(s.id);
            return (
              <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                background: on ? "#14532d" : "#1f1f1f", border: `1px solid ${on ? "#22c55e" : "#333"}`, color: "#fff", fontSize: 14 }}>
                <input type="checkbox" checked={on} onChange={() => toggle(s.id)} style={{ width: 17, height: 17, accentColor: "#22c55e" }} />
                <span>{name(s.id)}<br /><small style={{ color: "#9ca3af" }}>@{s.username || "—"}</small></span>
              </label>
            );
          })}
        </div>

        <button disabled={saving} style={{ ...btn("#e5e7eb", "#111"), padding: "12px 22px", fontSize: 14 }}>
          {saving ? "Ban raha hai..." : `✅ Assign Task${sel.length ? ` (${sel.length})` : ""}`}
        </button>
      </form>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <h2 style={{ fontSize: 20, margin: 0 }}>Assigned Tasks ({shown.length})</h2>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[["all", "Sab"], ["active", "Active"], ["late", "⏰ Late"], ["inactive", "Band"]].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} style={btn(filter === k ? "#e5e7eb" : "#262626", filter === k ? "#111" : "#ddd")}>{l}</button>
            ))}
            <button onClick={load} style={btn("#262626", "#ddd")}>↻</button>
          </div>
        </div>

        {loading ? <p style={{ color: "#888" }}>Load ho raha hai...</p> : shown.length === 0 ? <p style={{ color: "#888" }}>Koi task nahi mila.</p> :
          shown.map((t) => (
            <div key={t.id} style={{ borderTop: "1px solid #2a2a2a", padding: "14px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: 16 }}>{t.title}</b>
                <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: late(t) ? "#7f1d1d" : t.status === "active" ? "#14532d" : "#333" }}>
                  {late(t) ? "⏰ Late" : t.status === "active" ? "Active" : "Band"}
                </span>
              </div>
              {t.description && <p style={{ color: "#aaa", margin: "6px 0" }}>{t.description}</p>}
              <p style={{ fontSize: 13, color: "#999", margin: "4px 0" }}>
                💰 Rs. {t.reward_amount} · 📅 {t.deadline ? new Date(t.deadline).toLocaleDateString("en-PK") : "Koi deadline nahi"} · 📥 Submit: {t.submitted} · ✅ Approve: {t.approved}
              </p>
              <p style={{ fontSize: 13, color: "#999", margin: "4px 0 10px" }}>👥 {t.assigned?.length ? t.assigned.map(name).join(", ") : "Kisi ko nahi"}</p>
              <div style={{ display: "flex", gap: 6 }}>
                {t.status === "active"
                  ? <button style={btn("#a16207")} onClick={() => setStatus(t.id, "inactive")}>⏸ Band</button>
                  : <button style={btn("#16a34a")} onClick={() => setStatus(t.id, "active")}>▶ Active</button>}
                <button style={btn("#b91c1c")} onClick={() => remove(t.id)}>🗑 Delete</button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
