"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const ROLE_NAME: Record<string, string> = { founder_owner: "Founder", super_admin: "Super Admin", admin: "Admin", staff: "Staff" };
const ROLE_COLOR: Record<string, [string, string]> = {
  founder_owner: ["#8b5cf620", "#d8b4fe"], super_admin: ["#f59e0b20", "#fbbf24"],
  admin: ["#10b98120", "#86efac"], staff: ["#06b6d420", "#67e8f9"],
};
const empty = { first_name: "", surname: "", username: "", email: "", pw: "", phone: "", role: "staff", team_code: "" };

export default function CompanyMembers() {
  const [members, setMembers] = useState<any[]>([]);
  const [f, setF] = useState(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(true);
  const per = 10;

  async function api(method: string, body?: any, q = "") {
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/founder/members" + q, {
      method, cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Masla aaya");
    return j;
  }

  function note(t: string, good = true) { setMsg(t); setOk(good); }

  async function load() {
    try { const j = await api("GET"); setMembers(j.members || []); }
    catch (e: any) { note(e.message, false); }
  }
  useEffect(() => { load(); }, []);

  const name = (m: any) => `${m?.first_name || ""} ${m?.surname || ""}`.trim() || m?.username || "—";
  const refName = (id: string | null) => (id ? name(members.find((x) => x.id === id)) : "No Referrer");
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value });

  function reset() { setF(empty); setEditingId(null); }

  function edit(m: any) {
    if (m.role === "founder_owner") return note("Founder ka account yahan se edit nahi hota", false);
    setEditingId(m.id);
    setF({ ...empty, first_name: m.first_name || "", surname: m.surname || "", username: m.username || "", email: m.email || "",
      phone: m.phone || "", role: m.role, team_code: m.team_code || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    setLoading(true);
    try {
      if (editingId) {
        await api("PATCH", { id: editingId, first_name: f.first_name, surname: f.surname, phone: f.phone, role: f.role, team_code: f.team_code });
        note("✅ Member update ho gaya");
      } else {
        await api("POST", f);
        note("✅ Naya member ban gaya. Ab wo is email aur password se login kar sakta hai.");
      }
      reset(); load();
    } catch (e: any) { note(e.message, false); }
    setLoading(false);
  }

  async function remove(m: any) {
    if (!confirm(`${name(m)} ka account (login samet) hamesha ke liye delete karna hai?`)) return;
    try {
      await api("DELETE", null, "?id=" + m.id);
      note("✅ Member delete ho gaya");
      if (selected?.id === m.id) setSelected(null);
      if (editingId === m.id) reset();
      load();
    } catch (e: any) { note(e.message, false); }
  }

  async function changeRole(m: any, r: string) {
    if (!confirm(`${name(m)} ka role ${ROLE_NAME[r]} karna hai?`)) return;
    try { await api("PATCH", { id: m.id, role: r }); note("✅ Role badal gaya"); setSelected({ ...m, role: r }); load(); }
    catch (e: any) { note(e.message, false); }
  }

  const q = search.trim().toLowerCase();
  const filtered = members.filter((m) =>
    (!q || `${name(m)} ${m.username} ${m.email} ${m.phone} ${m.team_code}`.toLowerCase().includes(q)) &&
    (roleFilter === "all" || m.role === roleFilter) &&
    (statusFilter === "all" || (m.account_status || "active") === statusFilter));
  const pages = Math.ceil(filtered.length / per);
  const shown = filtered.slice((page - 1) * per, page * per);
  const cnt = (r: string) => members.filter((m) => m.role === r).length;

  const box: React.CSSProperties = { background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: 20, marginBottom: 20 };
  const inp: React.CSSProperties = { width: "100%", padding: "9px 12px", background: "#252525", border: "1px solid #444", borderRadius: 6, color: "#fff", fontSize: 12, boxSizing: "border-box" };
  const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "#aaa", marginBottom: 4 };
  const btn = (bg: string, c = "#fff"): React.CSSProperties => ({ padding: "6px 10px", background: bg, color: c, border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: "bold" });
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12 };
  const stColor = (s: string) => (s === "pending" ? "#fbbf24" : s === "rejected" ? "#f87171" : "#86efac");

  return (
    <div style={{ padding: 20, color: "#e9e9e9" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>COMPANY MEMBERS</div>
          <h2 style={{ margin: 0, fontSize: 22, color: "#fff" }}>Company-wide Member Management</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: 12 }}>Company ke tamam accounts aur team members ka complete management.</p>
        </div>
        <button style={{ ...btn("#2563eb"), padding: "10px 16px", fontSize: 12 }} onClick={load}>🔄 Refresh</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginBottom: 20 }}>
        {[["Total Members", members.length, "#3b82f6"], ["Super Admins", cnt("super_admin"), "#f59e0b"], ["Admins", cnt("admin"), "#10b981"],
          ["Staff", cnt("staff"), "#06b6d4"], ["⏳ Pending", members.filter((m) => m.account_status === "pending").length, "#fbbf24"]].map(([l, v, c]) => (
          <div key={l as string} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 11, color: "#888" }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: "bold", color: c as string, marginTop: 6 }}>{v}</div>
          </div>
        ))}
      </div>

      {msg && (
        <div onClick={() => setMsg("")} style={{ padding: "12px 16px", background: ok ? "#064e3b" : "#7f1d1d", color: ok ? "#86efac" : "#fca5a5", borderRadius: 6, marginBottom: 16, fontSize: 12, cursor: "pointer" }}>
          {msg}
        </div>
      )}

      <div style={box}>
        <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>{editingId ? "EDIT MEMBER" : "ADD NEW MEMBER"}</div>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#fff" }}>{editingId ? "Edit Member Details" : "Add New Company Member"}</h3>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={grid2}>
            <div><label style={lbl}>First Name *</label><input style={inp} value={f.first_name} onChange={set("first_name")} /></div>
            <div><label style={lbl}>Surname</label><input style={inp} value={f.surname} onChange={set("surname")} /></div>
          </div>
          <div style={grid2}>
            <div><label style={lbl}>Username * {editingId && "🔒"}</label>
              <input style={{ ...inp, opacity: editingId ? 0.5 : 1 }} value={f.username} onChange={set("username")} disabled={!!editingId} placeholder="misaal: ali_123" /></div>
            <div><label style={lbl}>Email * {editingId && "🔒"}</label>
              <input style={{ ...inp, opacity: editingId ? 0.5 : 1 }} type="email" value={f.email} onChange={set("email")} disabled={!!editingId} /></div>
          </div>
          <div style={grid2}>
            {!editingId && <div><label style={lbl}>Password * (kam az kam 6)</label><input style={inp} type="text" value={f.pw} onChange={set("pw")} /></div>}
            <div><label style={lbl}>Phone</label><input style={inp} value={f.phone} onChange={set("phone")} placeholder="03XXXXXXXXX" /></div>
          </div>
          <div style={grid2}>
            <div><label style={lbl}>Role *</label>
              <select style={inp} value={f.role} onChange={set("role")}>
                <option value="staff">Staff</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option>
              </select></div>
            <div><label style={lbl}>Team Code</label><input style={inp} value={f.team_code} onChange={set("team_code")} /></div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button disabled={loading} style={{ ...btn("#2563eb"), padding: "10px 16px", fontSize: 12, opacity: loading ? 0.6 : 1 }} onClick={save}>
            {loading ? "Saving..." : editingId ? "Update Member" : "Add Member"}
          </button>
          {editingId && <button style={{ ...btn("#444"), padding: "10px 16px", fontSize: 12 }} onClick={reset}>Cancel</button>}
        </div>
      </div>

      <div style={box}>
        <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#fff" }}>Company Members ({filtered.length})</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 16 }}>
          <input style={inp} placeholder="🔍 Naam, email, phone, team" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <select style={inp} value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="all">All Roles</option><option value="founder_owner">Founder</option><option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option><option value="staff">Staff</option>
          </select>
          <select style={inp} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option><option value="active">Active</option><option value="pending">Pending</option><option value="rejected">Rejected</option>
          </select>
          <button style={{ ...btn("#444"), fontSize: 12 }} onClick={() => { setSearch(""); setRoleFilter("all"); setStatusFilter("all"); setPage(1); }}>Clear</button>
        </div>

        {shown.length === 0 ? <div style={{ textAlign: "center", color: "#888", padding: 40 }}>Koi member record nahi mila.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 850 }}>
              <thead><tr style={{ background: "#252525" }}>
                {["Member", "Role", "Status", "Phone", "Team", "Joined", "Actions"].map((h) => <th key={h} style={{ padding: 12, textAlign: "left", color: "#aaa" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {shown.map((m) => {
                  const [bg, c] = ROLE_COLOR[m.role] || ["#333", "#ccc"];
                  const st = m.account_status || "active";
                  const isF = m.role === "founder_owner";
                  return (
                    <tr key={m.id} style={{ borderBottom: "1px solid #333" }}>
                      <td style={{ padding: 12 }}>
                        <div style={{ color: "#fff", fontWeight: "bold" }}>{name(m)}</div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>@{m.username || "—"} · {m.email || "—"}</div>
                      </td>
                      <td style={{ padding: 12 }}><span style={{ padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: "bold", background: bg, color: c }}>{ROLE_NAME[m.role] || m.role}</span></td>
                      <td style={{ padding: 12, color: stColor(st), fontWeight: "bold", textTransform: "capitalize" }}>{st}</td>
                      <td style={{ padding: 12, color: "#aaa" }}>{m.phone || "—"}{m.phone_verified && <span style={{ color: "#10b981" }}> ✓</span>}</td>
                      <td style={{ padding: 12, color: "#aaa" }}>{m.team_code || "—"}</td>
                      <td style={{ padding: 12, color: "#aaa", fontSize: 11 }}>{new Date(m.created_at).toLocaleDateString("en-PK")}</td>
                      <td style={{ padding: 12 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {!isF && <button style={btn("#2563eb")} onClick={() => edit(m)}>✏️ Edit</button>}
                          <button style={btn("#444")} onClick={() => setSelected(m)}>👁️ View</button>
                          {!isF && <button style={btn("#7f1d1d", "#fca5a5")} onClick={() => remove(m)}>🗑️ Delete</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
            <button style={btn("#444")} disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button key={p} style={btn(page === p ? "#2563eb" : "#333")} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button style={btn("#444")} disabled={page === pages} onClick={() => setPage(page + 1)}>Next →</button>
          </div>
        )}
      </div>

      {selected && (
        <div style={box}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Member Details</h3>
            <button style={btn("#444")} onClick={() => setSelected(null)}>Close</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 16 }}>
            {[["Full Name", name(selected)], ["Role", ROLE_NAME[selected.role] || selected.role], ["Status", selected.account_status || "active"],
              ["Username", selected.username || "—"], ["Email", selected.email || "—"], ["Phone", selected.phone || "—"],
              ["Team Code", selected.team_code || "—"], ["Referred By", refName(selected.referred_by)],
              ["Joined", new Date(selected.created_at).toLocaleString("en-PK")]].map(([l, v]) => (
              <div key={l}><div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{l}</div><div style={{ fontSize: 13, color: "#fff", fontWeight: "bold", wordBreak: "break-all" }}>{v}</div></div>
            ))}
          </div>
          {selected.role !== "founder_owner" && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #333" }}>
              <div style={{ fontSize: 11, color: "#888", marginBottom: 8, fontWeight: "bold" }}>Change Role:</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["staff", "admin", "super_admin"].map((r) => (
                  <button key={r} disabled={selected.role === r} onClick={() => changeRole(selected, r)}
                    style={{ ...btn(selected.role === r ? "#333" : "#2563eb", selected.role === r ? "#888" : "#fff") }}>{ROLE_NAME[r]}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
