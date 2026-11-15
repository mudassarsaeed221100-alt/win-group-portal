"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState("dashboard");
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const [fn, setFn] = useState("");
  const [sn, setSn] = useState("");
  const [ph, setPh] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");

  async function load() {
    setLoading(true);
    setMsg("");
    const { data: s } = await supabase.auth.getSession();
    const token = s.session?.access_token || "";
    const uid = s.session?.user?.id;
    const h = { Authorization: `Bearer ${token}` };

    if (uid) {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", uid).single();
      if (p) {
        setMe(p);
        setFn(p.first_name || ""); setSn(p.surname || ""); setPh(p.phone || "");
        if (p.team_code) {
          const { data: m } = await supabase
            .from("team_messages")
            .select("id, content, created_at")
            .eq("team_code", p.team_code)
            .is("receiver_id", null)
            .order("created_at", { ascending: false })
            .limit(5);
          setNews(m || []);
        }
      }
    }

    const [r1, r2, r3] = await Promise.all([
      fetch("/api/admin/stats", { headers: h }),
      fetch("/api/admin/tasks", { headers: h }),
      fetch("/api/admin/submissions", { headers: h }),
    ]);
    const j1 = await r1.json(); const j2 = await r2.json(); const j3 = await r3.json();
    if (!r1.ok) setMsg("❌ " + (j1.error || "Data load nahi hua"));
    setStats(j1);
    setTasks(j2.tasks || []);
    setSubs(j3.submissions || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function saveProfile() {
    if (!me) return;
    const { error } = await supabase.from("profiles")
      .update({ first_name: fn, surname: sn, phone: ph }).eq("id", me.id);
    setMsg(error ? "❌ " + error.message : "✅ Profile save ho gayi");
    if (!error) load();
  }

  async function changePassword() {
    if (pw1.length < 6) return setMsg("❌ Password kam az kam 6 characters ka ho");
    if (pw1 !== pw2) return setMsg("❌ Dono password ek jaise nahi");
    const { error } = await supabase.auth.updateUser({ password: pw1 });
    setMsg(error ? "❌ " + error.message : "✅ Password badal gaya");
    if (!error) { setPw1(""); setPw2(""); }
  }

  const staff: any[] = stats?.staff || [];
  const earnings: any[] = stats?.earnings || [];
  const now = new Date();
  const pendingSubs = subs.filter((s) => s.status === "pending");
  const activeTasks = tasks.filter((t) => t.status === "active");
  const lateTasks = activeTasks.filter((t) => t.deadline && new Date(t.deadline) < now);
  const totalEarn = earnings.reduce((a, e) => a + Number(e.amount || 0), 0);
  const unpaid = earnings.filter((e) => e.payment_status !== "paid").reduce((a, e) => a + Number(e.amount || 0), 0);
  const nm = (s: any) => `${s.first_name || ""} ${s.surname || ""}`.trim() || s.username || "—";
  const found = search ? staff.filter((s) => nm(s).toLowerCase().includes(search.toLowerCase())) : [];

  const card: React.CSSProperties = { background: "#111", border: "1px solid #2a2a2a", borderRadius: 14, padding: 18 };
  const input: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "#0a0a0a", border: "1px solid #333", borderRadius: 10, color: "#fff", marginBottom: 10, fontSize: 14 };
  const btn = (bg: string): React.CSSProperties => ({ background: bg, color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontSize: 14, marginRight: 6 });

  const modules = [
    ["👤", "Create Staff", "/super-admin/create-staff"],
    ["👥", "Team Management", "/super-admin/team-management"],
    ["📋", "Work Tasks", "/super-admin/work-tasks"],
    ["📥", "Submissions", "/super-admin/submissions"],
    ["💵", "Staff Earnings", "/super-admin/staff-earnings"],
    ["📈", "Staff Performance", "/super-admin/staff-performance"],
    ["💬", "Team Communication", "/super-admin/team-communication"],
  ];

  return (
    <div style={{ color: "#eee" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[["dashboard", "🏠 Dashboard"], ["profile", "✏️ Profile Edit"], ["settings", "⚙️ Settings"]].map(([k, l]) => (
          <button key={k} style={btn(tab === k ? "#444" : "#1f1f1f")} onClick={() => { setTab(k); setMsg(""); }}>{l}</button>
        ))}
        <button style={btn("#1f1f1f")} onClick={load}>↻ Refresh</button>
      </div>

      {msg && <div style={{ ...card, marginBottom: 16 }}>{msg}</div>}

      {tab === "dashboard" && (
        <>
          <div style={{ ...card, marginBottom: 18, background: "linear-gradient(135deg,#1a1a1a,#0a0a0a)" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>👋 Khush aamdeed, {me ? nm(me) : "..."}</h1>
            <p style={{ color: "#888", marginTop: 6 }}>
              Role: <b>{me?.role || "—"}</b> &nbsp; | &nbsp; Team Code: <b>{me?.team_code || "—"}</b>
            </p>
          </div>

          {(pendingSubs.length > 0 || lateTasks.length > 0) && (
            <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
              {pendingSubs.length > 0 && (
                <Link href="/super-admin/submissions" style={{ ...card, borderColor: "#a16207", color: "#fbbf24", textDecoration: "none" }}>
                  ⏳ {pendingSubs.length} submissions review ka intezar kar rahi hain →
                </Link>
              )}
              {lateTasks.length > 0 && (
                <Link href="/super-admin/work-tasks" style={{ ...card, borderColor: "#7f1d1d", color: "#f87171", textDecoration: "none" }}>
                  ⏰ {lateTasks.length} tasks ki deadline guzar chuki hai →
                </Link>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
            {[["👥 Staff", staff.length], ["📋 Active Tasks", activeTasks.length], ["⏳ Pending Review", pendingSubs.length],
              ["💰 Total Kamai", "Rs. " + totalEarn.toLocaleString()], ["🕒 Unpaid", "Rs. " + unpaid.toLocaleString()]].map(([l, v]) => (
              <div key={l as string} style={card}>
                <div style={{ color: "#888", fontSize: 13 }}>{l}</div>
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{loading ? "..." : v}</div>
              </div>
            ))}
          </div>

          <div style={{ ...card, marginBottom: 18 }}>
            <input style={{ ...input, marginBottom: 0 }} placeholder="🔍 Staff dhoondein" value={search} onChange={(e) => setSearch(e.target.value)} />
            {search && (
              <div style={{ marginTop: 10 }}>
                {found.length === 0 ? <p style={{ color: "#777" }}>Koi nahi mila</p> :
                  found.map((s) => <p key={s.id} style={{ padding: "6px 0", borderBottom: "1px solid #1a1a1a" }}>👤 {nm(s)} <span style={{ color: "#777" }}>@{s.username}</span></p>)}
              </div>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, marginBottom: 18 }}>
            {modules.map(([i, l, href]) => (
              <Link key={href} href={href} style={{ ...card, color: "#eee", textDecoration: "none" }}>
                <div style={{ fontSize: 26 }}>{i}</div>
                <div style={{ fontWeight: 600, marginTop: 6 }}>{l}</div>
              </Link>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12 }}>
            <div style={card}>
              <b>📋 Naye Tasks</b>
              {tasks.slice(0, 5).map((t) => (
                <p key={t.id} style={{ fontSize: 13, padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                  {t.title} <span style={{ color: "#777" }}>· Rs. {t.reward_amount}</span>
                </p>
              ))}
              {tasks.length === 0 && <p style={{ color: "#777", fontSize: 13, marginTop: 8 }}>Koi task nahi</p>}
            </div>
            <div style={card}>
              <b>📥 Nayi Submissions</b>
              {subs.slice(0, 5).map((s) => (
                <p key={s.id} style={{ fontSize: 13, padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                  {s.staff_name} · {s.task_title} <span style={{ color: "#777" }}>({s.status})</span>
                </p>
              ))}
              {subs.length === 0 && <p style={{ color: "#777", fontSize: 13, marginTop: 8 }}>Koi submission nahi</p>}
            </div>
            <div style={card}>
              <b>📢 Announcements</b>
              {news.map((n) => (
                <p key={n.id} style={{ fontSize: 13, padding: "8px 0", borderBottom: "1px solid #1a1a1a" }}>
                  {n.content} <span style={{ color: "#777" }}>· {new Date(n.created_at).toLocaleDateString()}</span>
                </p>
              ))}
              {news.length === 0 && <p style={{ color: "#777", fontSize: 13, marginTop: 8 }}>Koi announcement nahi</p>}
            </div>
          </div>
        </>
      )}

      {tab === "profile" && (
        <div style={{ ...card, maxWidth: 500 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>✏️ Profile Edit</h2>
          <input style={input} placeholder="First name" value={fn} onChange={(e) => setFn(e.target.value)} />
          <input style={input} placeholder="Surname" value={sn} onChange={(e) => setSn(e.target.value)} />
          <input style={input} placeholder="Phone" value={ph} onChange={(e) => setPh(e.target.value)} />
          <input style={{ ...input, opacity: 0.6 }} value={me?.email || ""} disabled />
          <button style={btn("#16a34a")} onClick={saveProfile}>💾 Save</button>
        </div>
      )}

      {tab === "settings" && (
        <div style={{ display: "grid", gap: 12, maxWidth: 500 }}>
          <div style={card}>
            <b>🔒 Team Code</b>
            <p style={{ fontSize: 22, fontWeight: 700, margin: "8px 0" }}>{me?.team_code || "—"}</p>
            <p style={{ color: "#888", fontSize: 13 }}>Team Code Founder deta hai, aap ise badal nahi sakte.</p>
          </div>
          <div style={card}>
            <h2 style={{ fontSize: 18, marginBottom: 12 }}>🔑 Password Badlein</h2>
            <input style={input} type="password" placeholder="Naya password" value={pw1} onChange={(e) => setPw1(e.target.value)} />
            <input style={input} type="password" placeholder="Dobara likhein" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            <button style={btn("#16a34a")} onClick={changePassword}>✅ Password Badlein</button>
          </div>
        </div>
      )}
    </div>
  );
                  }
