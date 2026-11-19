"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

const ROLE_NAME: Record<string, string> = { founder_owner: "Founder", super_admin: "Super Admin", admin: "Admin", staff: "Staff" };
const ROLE_COLOR: Record<string, string> = { founder_owner: "#d8b4fe", super_admin: "#fbbf24", admin: "#86efac", staff: "#67e8f9" };

export default function ReferralNetwork() {
  const [members, setMembers] = useState<any[]>([]);
  const [bonus, setBonus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Login session nahi mili.");
      const { data: me } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
      if (me?.role !== "founder_owner") throw new Error("Sirf Founder is module ko access kar sakta hai.");

      const { data, error: e } = await supabase
        .from("profiles")
        .select("id, username, first_name, surname, role, team_code, referred_by, account_status, created_at")
        .order("created_at", { ascending: true });
      if (e) throw e;
      setMembers(data || []);

      const { data: s } = await supabase.auth.getSession();
      const r = await fetch("/api/commissions", { headers: { Authorization: `Bearer ${s.session?.access_token || ""}` }, cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        const b: Record<string, number> = {};
        (j.list || []).filter((c: any) => c.share === "Direct Referrer").forEach((c: any) => {
          b[c.recipient_id] = (b[c.recipient_id] || 0) + Number(c.amount || 0);
        });
        setBonus(b);
      }
    } catch (err: any) {
      setError(err.message || "Referral data load nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const map = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const children = useMemo(() => {
    const c: Record<string, any[]> = {};
    members.forEach((m) => { if (m.referred_by) c[m.referred_by] = [...(c[m.referred_by] || []), m]; });
    return c;
  }, [members]);

  const name = (m: any) => (m ? `${m.first_name || ""} ${m.surname || ""}`.trim() || m.username || "Unnamed" : "Unknown");
  const money = (n: number) => "Rs. " + Number(n || 0).toLocaleString("en-PK");
  const toggle = (id: string) => setOpen((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const totalRef = members.filter((m) => m.referred_by).length;
  const noRef = members.filter((m) => m.role !== "founder_owner" && !m.referred_by).length;
  const totalBonus = Object.values(bonus).reduce((a, b) => a + b, 0);
  const top = Object.entries(children).sort((a, b) => b[1].length - a[1].length).slice(0, 10);
  const roots = members.filter((m) => !m.referred_by || !map.has(m.referred_by));

  const q = search.trim().toLowerCase();
  const found = q ? members.filter((m) =>
    `${name(m)} ${m.username} ${m.team_code} ${name(map.get(m.referred_by))}`.toLowerCase().includes(q)) : [];

  const box: React.CSSProperties = { background: "linear-gradient(145deg,#202020,#171717)", border: "1px solid #383838", borderRadius: 9, padding: 18, marginBottom: 16 };
  const tag = (r: string): React.CSSProperties => ({ fontSize: 10, fontWeight: 700, color: ROLE_COLOR[r] || "#ccc", border: "1px solid #333", padding: "2px 7px", borderRadius: 4 });

  function Node({ m, depth }: { m: any; depth: number }) {
    const kids = children[m.id] || [];
    const isOpen = open.includes(m.id);
    return (
      <div style={{ marginLeft: depth ? 18 : 0, borderLeft: depth ? "1px solid #333" : "none", paddingLeft: depth ? 10 : 0 }}>
        <div onClick={() => kids.length && toggle(m.id)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", margin: "4px 0", background: "#1b1b1b", border: "1px solid #2c2c2c", borderRadius: 7, cursor: kids.length ? "pointer" : "default", flexWrap: "wrap" }}>
          <span style={{ color: "#888", width: 14 }}>{kids.length ? (isOpen ? "▾" : "▸") : "•"}</span>
          <b style={{ color: "#fff", fontSize: 13 }}>{name(m)}</b>
          <span style={tag(m.role)}>{ROLE_NAME[m.role] || m.role}</span>
          <span style={{ fontSize: 11, color: "#888" }}>Team: {m.team_code || "—"}</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "#93c5fd" }}>👥 {kids.length}</span>
          {bonus[m.id] ? <span style={{ fontSize: 11, color: "#86efac" }}>🎁 {money(bonus[m.id])}</span> : null}
        </div>
        {isOpen && kids.map((k) => <Node key={k.id} m={k} depth={depth + 1} />)}
      </div>
    );
  }

  if (loading) return <p style={{ padding: 25, color: "#aaa" }}>Referral data load ho raha hai...</p>;

  return (
    <div style={{ color: "#e9e9e9", marginTop: 22, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{
