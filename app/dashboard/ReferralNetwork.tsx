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
