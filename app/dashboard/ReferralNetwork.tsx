"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const RN: Record<string, string> = { founder_owner: "Founder", super_admin: "Super Admin", admin: "Admin", staff: "Staff" };
const RC: Record<string, string> = { founder_owner: "#d8b4fe", super_admin: "#fbbf24", admin: "#86efac", staff: "#67e8f9" };

export default function ReferralNetwork() {
  const [members, setMembers] = useState<any[]>([]);
  const [bonus, setBonus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string[]>([]);

  async function load() {
    setLoading(true); setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Login session nahi mili.");
      const { data: me } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
      if (me?.role !== "founder_owner") throw new Error("Sirf Founder is module ko access kar sakta hai.");
      const { data, error: e } = await supabase.from("profiles")
        .select("id, username, first_name, surname, role, team_code, referred_by, created_at")
        .order("created_at", { ascending: true });
      if (e) throw e;
      setMembers(data || []);
      const { data: s } = await supabase.auth.getSession();
      const r = await fetch("/api/commissions", { headers: { Authorization: `Bearer ${s.session?.access_token || ""}` }, cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        const b: Record<string, number> = {};
        (j.list || []).filter((c: any) => c.share === "Direct Referrer")
          .forEach((c: any) => { b[c.recipient_id] = (b[c.recipient_id] || 0) + Number(c.amount || 0); });
        setBonus(b);
      }
    } catch (err: any) { setError(err.message || "Data load nahi hua."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const map = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const kidsOf = useMemo(() => {
    const c: Record<string, any[]> = {};
    members.forEach((m) => { if (m.referred_by) c[m.referred_by] = [...(c[m.referred_by] || []), m]; });
    return c;
  }, [members]);

  const name = (m: any) => (m ? `${m.first_name || ""} ${m.surname || ""}`.trim() || m.username || "Unnamed" : "—");
  const money = (n: number) => "Rs. " + Number(n || 0).toLocaleString("en-PK");
  const toggle = (id: string) => setOpen((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const top = Object.entries(kidsOf).sort((a, b) => b[1].length - a[1].length).slice(0, 10);
  const roots = members.filter((m) => !m.referred_by || !map.has(m.referred_by));
  const q = search.trim().toLowerCase();
  const found = q ? members.filter((m) => `${name(m)} ${m.username} ${m.team_code}`.toLowerCase().includes(q)) : [];
  const totalBonus = Object.values(bonus).reduce((a, b) => a + b, 0);

  const box: React.CSSProperties = { background: "#1a1a1a", border: "1px solid #383838", borderRadius: 9, padding: 18, marginBottom: 16 };
  const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", margin: "4px 0", background: "#1f1f1f", border: "1px solid #2c2c2c", borderRadius: 7, flexWrap: "wrap", fontSize: 12 };
  const tag = (r: string): React.CSSProperties => ({ fontSize: 10, fontWeight: 700, color: RC[r] || "#ccc", border: "1px solid #333", padding: "2px 7px", borderRadius: 4 });
    function Node({ m, d }: { m: any; d: number }) {
    const kids = kidsOf[m.id] || [];
    const isOpen = open.includes(m.id);
    return (
      <div style={{ marginLeft: d ? 18 : 0, borderLeft: d ? "1px solid #333" : "none", paddingLeft: d ? 10 : 0 }}>
        <div style={{ ...row, cursor: kids.length ? "pointer" : "default" }} onClick={() => kids.length && toggle(m.id)}>
          <span style={{ color: "#888" }}>{kids.length ? (isOpen ? "▾" : "▸") : "•"}</span>
          <b style={{ color: "#fff" }}>{name(m)}</b>
          <span style={tag(m.role)}>{RN[m.role] || m.role}</span>
          <span style={{ color: "#888" }}>Team: {m.team_code || "—"}</span>
          <span style={{ marginLeft: "auto", color: "#93c5fd" }}>👥 {kids.length}</span>
          {bonus[m.id] ? <span style={{ color: "#86efac" }}>🎁 {money(bonus[m.id])}</span> : null}
        </div>
        {isOpen && kids.map((k) => <Node key={k.id} m={k} d={d + 1} />)}
      </div>
    );
  }

  if (loading) return <p style={{ padding: 25, color: "#aaa" }}>Load ho raha hai...</p>;

  return (
    <div style={{ color: "#e9e9e9", marginTop: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 21, color: "#fff" }}>Referral Network</h2>
        <button onClick={load} style={{ padding: "9px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>🔄 Refresh</button>
      </div>

      {error && <div style={{ ...box, color: "#fca5a5" }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 16 }}>
        {[["👥 Members", members.length], ["🔗 Referrals", members.filter((m) => m.referred_by).length],
          ["⚠️ Bina Referrer", members.filter((m) => m.role !== "founder_owner" && !m.referred_by).length],
          ["🎁 Bonus diya", money(totalBonus)]].map(([l, v]) => (
          <div key={l as string} style={{ ...box, marginBottom: 0 }}>
            <div style={{ fontSize: 11, color: "#999" }}>{l}</div>
            <div style={{ fontSize: 21, fontWeight: 700, color: "#fff", marginTop: 6 }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={box}>
        <b style={{ color: "#fff" }}>🏆 Top Referrers</b>
        {top.length === 0 && <p style={{ color: "#888", fontSize: 12 }}>Abhi koi referral nahi.</p>}
        {top.map(([id, kids], i) => (
          <div key={id} style={row}>
            <span>{i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}</span>
            <b style={{ color: "#fff" }}>{name(map.get(id))}</b>
            <span style={{ marginLeft: "auto", color: "#93c5fd" }}>{kids.length} log</span>
            <span style={{ color: "#86efac" }}>🎁 {money(bonus[id] || 0)}</span>
          </div>
        ))}
      </div>

      <div style={box}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <b style={{ color: "#fff", marginRight: "auto" }}>{q ? "🔍 Search" : "🌳 Network Tree"}</b>
          <button onClick={() => setOpen(members.map((m) => m.id))} style={{ ...tag("staff"), background: "#1f1f1f", cursor: "pointer" }}>Sab kholein</button>
          <button onClick={() => setOpen([])} style={{ ...tag("staff"), background: "#1f1f1f", cursor: "pointer" }}>Sab band</button>
          <input placeholder="🔍 Naam ya team" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ padding: "7px 10px", background: "#252525", border: "1px solid #444", borderRadius: 6, color: "#fff", fontSize: 12 }} />
        </div>
        {q
          ? found.map((m) => (
              <div key={m.id} style={row}>
                <b style={{ color: "#fff" }}>{name(m)}</b><span style={tag(m.role)}>{RN[m.role] || m.role}</span>
                <span style={{ color: "#888" }}>Referrer: {name(map.get(m.referred_by))} · Joday: {(kidsOf[m.id] || []).length}</span>
              </div>
            ))
          : roots.map((m) => <Node key={m.id} m={m} d={0} />)}
      </div>
    </div>
  );
}
