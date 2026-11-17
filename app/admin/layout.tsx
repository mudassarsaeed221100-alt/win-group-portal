"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const links = [
  ["🏠", "Dashboard", "/admin"],
  ["👤", "Create Staff", "/admin/create-staff"],
  ["👥", "Team Management", "/admin/team-management"],
  ["📋", "Work Tasks", "/admin/work-tasks"],
  ["📥", "Submissions", "/admin/submissions"],
  ["💵", "Staff Earnings", "/admin/staff-earnings"],
  ["📈", "Staff Performance", "/admin/staff-performance"],
  ["💬", "Team Communication", "/admin/team-communication"],
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [me, setMe] = useState<any>(null);
  const [menu, setMenu] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const r = () => setMobile(window.innerWidth <= 900);
    r(); window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return router.replace("/");
      const { data: p } = await supabase.from("profiles").select("*").eq("id", uid).single();
      if (!p) return router.replace("/");
      if (p.role === "super_admin") return router.replace("/super-admin");
      if (p.role === "founder_owner") return router.replace("/dashboard");
      if (p.role !== "admin") return router.replace("/staff");
      setMe(p);
    })();
  }, []);

  useEffect(() => setMenu(false), [path]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (!me) return <div style={{ minHeight: "100vh", background: "#000", color: "#888", padding: 40 }}>Check ho raha hai...</div>;

  const name = `${me.first_name || ""} ${me.surname || ""}`.trim() || me.username;
  const showSide = !mobile || menu;

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#eee", display: "flex" }}>
      {mobile && menu && <div onClick={() => setMenu(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 40 }} />}

      {showSide && (
        <aside style={{ width: 250, background: "#0a0a0a", borderRight: "1px solid #1f1f1f", padding: 18, position: mobile ? "fixed" : "sticky", top: 0, height: "100vh", overflowY: "auto", zIndex: 50, boxSizing: "border-box" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>◆ WIN GROUP</h2>
          <div style={{ background: "#111", border: "1px solid #222", borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <b>{name}</b>
            <p style={{ color: "#888", fontSize: 12, marginTop: 4 }}>🧑💼 Admin · Team: {me.team_code || "—"}</p>
          </div>
          {links.map(([i, l, href]) => (
            <a key={href} href={href} style={{ display: "block", padding: "10px 12px", borderRadius: 10, marginBottom: 4, textDecoration: "none", fontSize: 14, color: path === href ? "#fff" : "#aaa", background: path === href ? "#1f1f1f" : "transparent" }}>
              {i} &nbsp;{l}
            </a>
          ))}
          <button onClick={logout} style={{ width: "100%", marginTop: 16, padding: 10, background: "#7f1d1d", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer" }}>🚪 Logout</button>
        </aside>
      )}

      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderBottom: "1px solid #1f1f1f" }}>
          {mobile && <button onClick={() => setMenu(!menu)} style={{ background: "#1f1f1f", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 18, cursor: "pointer" }}>☰</button>}
          <b>🧑💼 Admin Portal</b>
          <span style={{ marginLeft: "auto", color: "#4ade80", fontSize: 13 }}>● System Active</span>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </main>
    </div>
  );
}
