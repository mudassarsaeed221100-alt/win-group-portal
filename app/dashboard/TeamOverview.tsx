"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const ROLE_NAME: Record<string, string> = { super_admin: "Super Admin", admin: "Admin", staff: "Staff" };
const ROLE_COLOR: Record<string, string> = { super_admin: "#fbbf24", admin: "#86efac", staff: "#67e8f9" };

export default function TeamOverview() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) { setError("Please login first."); setLoading(false); return; }
    const { data: me } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (me?.role !== "founder_owner") { setError("Founder access required."); setLoading(false); return; }

    const { data, error: e } = await supabase
      .from("profiles")
      .select("id, first_name, surname, username, role, team_code, account_status, created_at")
      .neq("role", "founder_owner")
      .order("created_at", { ascending: false });
    if (e) setError(e.message); else setMembers(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const name = (m: any) => `${m.first_name || ""} ${m.surname || ""}`.trim() || m.username || "Unnamed";
  const count = (list: any[], r: string) => list.filter((m) => m.role === r).length;

  const teams = new Map<string, any[]>();
  members.forEach((m) => {
    const k = m.team_code || "__none";
    teams.set(k, [...(teams.get(k) || []), m]);
  });
  const teamList = Array.from(teams.entries()).sort((a, b) =>
    a[0] === "__none" ? 1 : b[0] === "__none" ? -1 : b[1].length - a[1].length);

  const q = search.toLowerCase();
  const list = (openTeam ? teams.get(openTeam) || [] : members).filter((m) =>
    (!q || `${name(m)} ${m.username} ${m.team_code}`.toLowerCase().includes(q)) &&
    (roleFilter === "all" || m.role === roleFilter));

  const stColor = (s: string) => (s === "pending" ? "#fbbf24" : s === "rejected" ? "#f87171" : "#86efac");
  const box: React.CSSProperties = { background: "linear-gradient(145deg,#202020,#171717)", border: "1px solid #383838", borderRadius: 9, padding: 18 };
  const inp: React.CSSProperties = { padding: "9px 12px", background: "#252525", border: "1px solid #444", borderRadius: 6, color: "#fff", fontSize: 12 };

  if (loading) return <p style={{ padding: 25, color: "#aaa" }}>Loading team overview...</p>;
  if (error) return <div style={{ padding: 25, color: "#f87171" }}>{error}</div>;

  return (
    <div style={{ color: "#e9e9e9", marginTop: 22, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>TEAM OVERVIEW</div>
          <h2 style={{ margin: 0, fontSize: 21, color: "#fff" }}>Team Overview</h2>
          <p style={{ margin: "6px 0 0", color: "#999", fontSize: 12 }}>WIN GROUP ki saari teams aur un ke members ek nazar mein.</p>
        </div>
        <button onClick={load} style={{ padding: "10px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 }}>🔄 Refresh</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 18 }}>
        {[
          ["🏷 Teams", teamList.filter(([k]) => k !== "__none").length, "#93c5fd"],
          ["Super Admins", count(members, "super_admin"), "#fbbf24"],
          ["Admins", count(members, "admin"), "#86efac"],
          ["Staff", count(members, "staff"), "#67e8f9"],
          ["👥 Total Members", members.length, "#fff"],
        ].map(([l, v, c]) => (
          <div key={l as string} style={box}>
            <div style={{ fontSize: 11, color: "#999" }}>{l}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: c as string, marginTop: 8 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, margin: "6px 0 10px" }}>TEAMS (card par click karein)</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginBottom: 18 }}>
        {teamList.map(([k, list]) => {
          const active = openTeam === k;
          const none = k === "__none";
          const sa = list.find((m) => m.role === "super_admin");
          return (
            <div key={k} onClick={() => setOpenTeam(active ? null : k)}
              style={{ ...box, cursor: "pointer", borderColor: active ? "#d1d1d1" : none ? "#a16207" : "#383838" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <b style={{ color: none ? "#fbbf24" : "#fff", fontSize: 15 }}>{none ? "⚠️ Bina Team" : `🏷 ${k}`}</b>
                <span style={{ color: "#aaa", fontSize: 12 }}>{list.length} log</span>
              </div>
              {!none && <p style={{ fontSize: 11, color: "#999", margin: "8px 0" }}>Super Admin: <b style={{ color: "#fbbf24" }}>{sa ? name(sa) : "—"}</b></p>}
              <p style={{ fontSize: 11, color: "#888", margin: 0 }}>
                SA {count(list, "super_admin")} · Admin {count(list, "admin")} · Staff {count(list, "staff")}
                {list.some((m) => m.account_status === "pending") && <span style={{ color: "#fbbf24" }}> · ⏳ {list.filter((m) => m.account_status === "pending").length}</span>}
              </p>
            </div>
          );
        })}
      </div>

      <div style={box}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
          <b style={{ color: "#fff", fontSize: 15, marginRight: "auto" }}>
            {openTeam ? (openTeam === "__none" ? "⚠️ Bina Team" : `🏷 Team ${openTeam}`) : "Saare Members"} ({list.length})
          </b>
          {openTeam && <button onClick={() => setOpenTeam(null)} style={{ ...inp, cursor: "pointer" }}>✕ Sab dikhayein</button>}
          <input style={inp} placeholder="🔍 Naam ya username" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select style={inp} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">All Roles</option><option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option><option value="staff">Staff</option>
          </select>
        </div>

        {list.length === 0 ? <p style={{ color: "#888", textAlign: "center", padding: 25 }}>Koi member nahi mila.</p> : (
          <div style={{ display: "grid", gap: 8 }}>
            {list.map((m) => {
              const st = m.account_status || "active";
              return (
                <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "12px 14px", background: "#1b1b1b", border: "1px solid #2c2c2c", borderRadius: 8 }}>
                  <div>
                    <b style={{ color: "#fff", fontSize: 13 }}>{name(m)}</b>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 3 }}>@{m.username || "—"} · Team: {m.team_code || "—"} · {new Date(m.created_at).toLocaleDateString("en-PK")}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ROLE_COLOR[m.role] || "#ccc", border: "1px solid #333", padding: "3px 9px", borderRadius: 4 }}>{ROLE_NAME[m.role] || m.role}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: stColor(st), textTransform: "capitalize" }}>{st}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
