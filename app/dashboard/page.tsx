"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

import UserManagement from "./UserManagement";
import ProfileSettings from "./ProfileSettings";
import Departments from "./Departments";
import BusinessRecords from "./BusinessRecords";
import Reports from "./Reports";
import ActivityLogs from "./ActivityLogs";
import Security from "./Security";
import SystemSettings from "./SystemSettings";
import Notifications from "./Notifications";
import FlexibleWork from "./FlexibleWork";
import EarningsLedger from "./EarningsLedger";
import FounderSupport from "./FounderSupport";
import TeamOverview from "./TeamOverview";
import TeamHierarchy from "./TeamHierarchy";
import ReferralNetwork from "./ReferralNetwork";
import SuperAdminManagement from "./SuperAdminManagement";
import TeamPerformance from "./TeamPerformance";
import CompanyMembers from "./CompanyMembers";
import ProductManagement from "./ProductManagement";
import ProductSalesOrders from "./ProductSalesOrders";
import PaymentVerification from "./PaymentVerification";
import ProductDelivery from "./ProductDelivery";
import CommissionBonusManagement from "./CommissionBonusManagement";
import SecondFounderManagement from "./SecondFounderManagement";

type Item = { name: string; icon: string; href?: string };
type Group = { name: string; icon: string; items: Item[] };

const groups: Group[] = [
  { name: "Members", icon: "👥", items: [
    { name: "User Management", icon: "◈" },
    { name: "Super Admin Management", icon: "♙" },
    { name: "Company-wide Members", icon: "☷" },
    { name: "Team Overview", icon: "◫" },
    { name: "Team Hierarchy", icon: "⌘" },
    { name: "Referral Network", icon: "⇄" },
  ]},
  { name: "Paisa", icon: "💰", items: [
    { name: "Payment Verification", icon: "✓" },
    { name: "Earnings Ledger", icon: "₨" },
    { name: "Commission Report", icon: "%", href: "/commission-report" },
    { name: "Commission & Bonus Management", icon: "%" },
  ]},
  { name: "Kaam", icon: "📋", items: [
    { name: "Flexible Work", icon: "▣" },
    { name: "Team Performance", icon: "▥" },
  ]},
  { name: "Products", icon: "🛒", items: [
    { name: "Product Management", icon: "▣" },
    { name: "Product Sales & Orders", icon: "▤" },
    { name: "Product Delivery", icon: "➜" },
  ]},
  { name: "Company", icon: "🏢", items: [
    { name: "Departments", icon: "▦" },
    { name: "Business Records", icon: "▤" },
    { name: "Reports", icon: "▥" },
    { name: "Activity Logs", icon: "◷" },
  ]},
  { name: "Rabta", icon: "💬", items: [
    { name: "Notifications", icon: "◉" },
    { name: "Support Management", icon: "✉" },
    { name: "Support Chat", icon: "🆘", href: "/founder-support" },
  ]},
  { name: "Settings", icon: "⚙️", items: [
    { name: "Profile Edit", icon: "◉" },
    { name: "System Settings", icon: "⚙" },
    { name: "Security", icon: "◇" },
    { name: "Second Founder Management", icon: "◆" },
  ]},
];

const pages: Record<string, () => React.ReactNode> = {
  "Profile Edit": () => <ProfileSettings />,
  "User Management": () => <UserManagement />,
  Departments: () => <Departments />,
  "Business Records": () => <BusinessRecords />,
  Reports: () => <Reports />,
  "Activity Logs": () => <ActivityLogs />,
  Security: () => <Security />,
  "System Settings": () => <SystemSettings />,
  Notifications: () => <Notifications />,
  "Flexible Work": () => <FlexibleWork />,
  "Earnings Ledger": () => <EarningsLedger />,
  "Support Management": () => <FounderSupport />,
  "Team Overview": () => <TeamOverview />,
  "Team Hierarchy": () => <TeamHierarchy />,
  "Referral Network": () => <ReferralNetwork />,
  "Super Admin Management": () => <SuperAdminManagement />,
  "Team Performance": () => <TeamPerformance />,
  "Company-wide Members": () => <CompanyMembers />,
  "Product Management": () => <ProductManagement />,
  "Product Sales & Orders": () => <ProductSalesOrders />,
  "Payment Verification": () => <PaymentVerification />,
  "Product Delivery": () => <ProductDelivery />,
  "Commission & Bonus Management": () => <CommissionBonusManagement />,
  "Second Founder Management": () => <SecondFounderManagement />,
};

export default function Dashboard() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [activeMenu, setActiveMenu] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [openGroups, setOpenGroups] = useState<string[]>([]);
  const [sideOpen, setSideOpen] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [stats, setStats] = useState({ members: 0, payments: 0, withdrawals: 0, departments: 0 });

  const displayName = (firstName + " " + surname).trim() || "Founder";

  useEffect(() => {
    function onResize() {
      const m = window.innerWidth <= 900;
      setMobile(m);
      setSideOpen(!m);
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) { router.replace("/"); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, surname, avatar_url, role")
        .eq("id", user.id)
        .single();

      if (error || !data || data.role !== "founder_owner") { router.replace("/"); return; }

      setFirstName(data.first_name || "");
      setSurname(data.surname || "");
      setAvatarUrl(data.avatar_url || "");
      setLoading(false);
      loadStats();
    }
    loadProfile();
  }, [router]);

  async function loadStats() {
    const count = async (table: string, col?: string, vals?: string[]) => {
      let q = supabase.from(table).select("id", { count: "exact", head: true });
      if (col && vals) q = q.in(col, vals);
      const { count: c } = await q;
      return c || 0;
    };
    const [members, payments, withdrawals, departments] = await Promise.all([
      count("profiles"),
      count("profiles", "account_status", ["pending"]),
      count("withdrawal_requests", "status", ["pending", "approved"]),
      count("departments"),
    ]);
    setStats({ members, payments, withdrawals, departments });
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  function openPage(item: Item) {
    if (item.href) { window.location.href = item.href; return; }
    setActiveMenu(item.name);
    setProfileMenuOpen(false);
    if (mobile) setSideOpen(false);
    if (item.name === "Overview") loadStats();
  }

  function toggleGroup(name: string) {
    setOpenGroups((p) => (p.includes(name) ? p.filter((g) => g !== name) : [...p, name]));
  }

  const activeGroup = groups.find((g) => g.items.some((i) => i.name === activeMenu))?.name;

  function ProfileAvatar({ size }: { size: number }) {
    return (
      <div style={{
        position: "relative", width: size, height: size, minWidth: size, borderRadius: "50%",
        overflow: "hidden", border: "2px solid white", background: "linear-gradient(145deg,#f1f1f1,#8c8c8c)",
        color: "#101010", fontWeight: "bold", fontSize: size > 40 ? 20 : 15, lineHeight: size - 4 + "px", textAlign: "center",
      }}>
        {avatarUrl
          ? <img src={avatarUrl} alt="Founder" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          : firstName.charAt(0).toUpperCase() || "F"}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="loading">
        <div className="loading-diamond">◆</div>
        <h2>WIN GROUP</h2>
        <p>Preparing Founder Portal...</p>
        <style jsx>{`
          .loading { min-height: 100vh; background: #090909; color: #e8e8e8; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: Arial, sans-serif; }
          .loading-diamond { color: #dedede; font-size: 42px; margin-bottom: 12px; }
          h2 { letter-spacing: 5px; margin: 0; }
          p { color: #888; font-size: 13px; }
        `}</style>
      </main>
    );
  }

  const cards: [string, number | string, string, string, string?][] = [
    ["Total Members", stats.members, "Registered accounts", "◈", "User Management"],
    ["Pending Payments", stats.payments, "Approve hone ka intezar", "✓", "Payment Verification"],
    ["Pending Withdrawals", stats.withdrawals, "Paise bhejna baqi", "₨", "Earnings Ledger"],
    ["Departments", stats.departments, "Company departments", "▦", "Departments"],
  ];

  return (
    <main className="layout">
      {mobile && sideOpen && <div className="overlay" onClick={() => setSideOpen(false)} />}

      {sideOpen && (
        <aside className={mobile ? "sidebar mobile" : "sidebar"}>
          <div className="brand">
            <div className="brand-symbol">◆</div>
            <h2>WIN GROUP</h2>
            <span>WOLF INDEPENDENT NATIONAL GROUP</span>
            <div className="brand-line" />
            <small>FOUNDER CONTROL CENTER</small>
          </div>

          <div className="profile">
            <ProfileAvatar size={43} />
            <div className="profile-info">
              <strong>{displayName}</strong>
              <small>Founder / Owner</small>
              <span className="online-indicator"><i /> System Owner</span>
            </div>
          </div>

          <p className="menu-title">MAIN NAVIGATION</p>

          <nav>
            <button className={activeMenu === "Overview" ? "menu active" : "menu"} onClick={() => openPage({ name: "Overview", icon: "🏠" })}>
              <span className="menu-icon">🏠</span><span>Dashboard</span>
            </button>

            {groups.map((g) => {
              const open = openGroups.includes(g.name) || activeGroup === g.name;
              return (
                <div key={g.name}>
                  <button className={activeGroup === g.name ? "menu group-active" : "menu"} onClick={() => toggleGroup(g.name)}>
                    <span className="menu-icon">{g.icon}</span>
                    <span>{g.name}</span>
                    <span className="folder-arrow">{open ? "▾" : "▸"}</span>
                  </button>
                  {open && (
                    <div className="submenu">
                      {g.items.map((i) => (
                        <button key={i.name} className={activeMenu === i.name ? "menu sub active" : "menu sub"} onClick={() => openPage(i)}>
                          <span className="menu-icon">{i.icon}</span>
                          <span>{i.name}</span>
                          {i.href && <span className="ext">↗</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="sidebar-bottom">
            <div className="authority-card">
              <span className="authority-icon">◆</span>
              <div><strong>Founder Authority</strong><small>Full System Access</small></div>
            </div>
            <button className="logout" onClick={logout}><span>↪</span> Logout</button>
          </div>
        </aside>
      )}

      <section className="content">
        <header className="topbar">
          <div className="left">
            <button className="burger" onClick={() => setSideOpen(!sideOpen)} aria-label="Menu">☰</button>
            <div>
              <div className="heading-label">WIN GROUP / FOUNDER{activeGroup ? " / " + activeGroup.toUpperCase() : ""}</div>
              <h1>{activeMenu === "Overview" ? "Dashboard" : activeMenu}</h1>
            </div>
          </div>

          <div className="top-profile-area">
            <div className="top-profile">
              <button className="refresh-btn" onClick={() => { setRefreshKey(refreshKey + 1); loadStats(); }}>↻ Refresh</button>
              <div className="top-status"><i /> System Active</div>
              <button className="profile-trigger" onClick={() => setProfileMenuOpen(!profileMenuOpen)}>
                <ProfileAvatar size={36} />
                <div className="top-user"><strong>{displayName}</strong><small>Founder / Owner</small></div>
                <span className="dropdown-arrow">{profileMenuOpen ? "▲" : "▼"}</span>
              </button>
            </div>

            {profileMenuOpen && (
              <div className="profile-dropdown">
                <button onClick={() => openPage({ name: "Profile Edit", icon: "" })}><span>◉</span> Profile Edit</button>
                <button onClick={() => openPage({ name: "Security", icon: "" })}><span>◇</span> Security</button>
                <button className="dropdown-logout" onClick={logout}><span>↪</span> Logout</button>
              </div>
            )}
          </div>
        </header>

        <div key={refreshKey}>
          {pages[activeMenu] ? pages[activeMenu]() : (
            <>
              <div className="welcome">
                <div>
                  <div className="welcome-label">◆ &nbsp; FOUNDER CONTROL CENTER</div>
                  <h2>Welcome, {displayName}</h2>
                  <p>Your organization. Your authority. Manage the entire WIN GROUP system from one secure control center.</p>
                  <div className="welcome-tag">FOUNDER / OWNER</div>
                </div>
                <div className="welcome-emblem">
                  <div className="emblem-outer"><div className="emblem-inner">◆</div></div>
                  <span>WIN GROUP</span>
                </div>
              </div>

              <div className="section-title">
                <div><span>ORGANIZATION</span><h3>Company Overview</h3></div>
                <div className="overview-status"><i /> Live Data</div>
              </div>

              <div className="stats">
                {cards.map(([label, value, note, symbol, go]) => (
                  <div className={"stat-card" + (Number(value) > 0 && label.startsWith("Pending") ? " alert" : "")} key={label}
                    onClick={() => go && openPage({ name: go, icon: "" })}>
                    <div className="stat-top"><span>{label}</span><div className="stat-icon">{symbol}</div></div>
                    <h2>{value}</h2>
                    <small>{note}</small>
                  </div>
                ))}
              </div>

              <div className="section-title">
                <div><span>QUICK ACCESS</span><h3>Shortcuts</h3></div>
              </div>
              <div className="quick">
                {[
                  { name: "Payment Verification", icon: "✓" },
                  { name: "Earnings Ledger", icon: "₨" },
                  { name: "Commission Report", icon: "%", href: "/commission-report" },
                  { name: "Support Chat", icon: "🆘", href: "/founder-support" },
                  { name: "User Management", icon: "◈" },
                  { name: "Notifications", icon: "◉" },
                ].map((i) => (
                  <button key={i.name} className="quick-btn" onClick={() => openPage(i)}>
                    <span>{i.icon}</span>{i.name}
                  </button>
                ))}
              </div>

              <div className="section-title">
                <div><span>COMPANY HIERARCHY</span><h3>Management Structure</h3></div>
              </div>
              <div className="panel">
                <div className="hierarchy">
                  {[
                    ["◆", "Founder / Owner", "Ultimate System Authority"],
                    ["◈", "Super Admin", "Manages Own Team"],
                    ["◇", "Admin", "Manages Assigned Team"],
                    ["○", "Staff", "Performs Assigned Work"],
                  ].map(([symbol, title, note], index) => (
                    <div key={title}>
                      <div className={index === 0 ? "level founder" : "level"}>
                        <span className="level-symbol">{symbol}</span>
                        <div><strong>{title}</strong><small>{note}</small></div>
                        {index === 0 && <span className="level-access">FULL ACCESS</span>}
                      </div>
                      {index !== 3 && <div className="hierarchy-line" />}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <style jsx>{`
        * { box-sizing: border-box; }
        .layout { min-height: 100vh; display: flex; background: #101010; color: #e9e9e9; font-family: Arial, sans-serif; }
        .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 40; }

        .sidebar { width: 270px; height: 100vh; position: sticky; top: 0; overflow-y: auto; background: linear-gradient(180deg,#080808,#141414); padding: 22px 15px; display: flex; flex-direction: column; flex-shrink: 0; border-right: 1px solid #343434; }
        .sidebar.mobile { position: fixed; left: 0; top: 0; z-index: 50; box-shadow: 8px 0 30px #000a; }
        .brand { text-align: center; padding: 5px 5px 18px; border-bottom: 1px solid #333; }
        .brand-symbol { color: #dedede; font-size: 26px; margin-bottom: 6px; }
        .brand h2 { margin: 0 0 8px; font-size: 21px; letter-spacing: 4px; color: white; }
        .brand span { display: block; color: #999; font-size: 8px; letter-spacing: 1.5px; }
        .brand-line { height: 1px; width: 65px; background: #a8a8a8; margin: 12px auto; }
        .brand small { color: #c7c7c7; font-size: 9px; letter-spacing: 2px; }

        .profile { display: flex; align-items: center; gap: 12px; padding: 18px 5px; border-bottom: 1px solid #292929; }
        .profile-info { min-width: 0; }
        .profile strong, .profile small { display: block; }
        .profile strong { font-size: 12px; color: white; overflow-wrap: anywhere; }
        .profile small { color: #a6a6a6; margin-top: 4px; font-size: 11px; }
        .online-indicator { display: flex; align-items: center; gap: 6px; color: #bdbdbd; font-size: 10px; margin-top: 6px; }
        .online-indicator i, .top-status i, .overview-status i { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #79c99a; box-shadow: 0 0 8px #79c99a80; }

        .menu-title { color: #777; font-size: 9px; letter-spacing: 2px; padding-left: 9px; margin: 18px 0 10px; }
        nav { display: grid; gap: 4px; }
        .menu { display: flex; gap: 11px; align-items: center; padding: 11px 12px; border: 1px solid transparent; border-radius: 7px; color: #b9b9b9; background: transparent; text-align: left; cursor: pointer; font-size: 12px; width: 100%; }
        .menu:hover { background: #242424; color: white; }
        .menu.active { color: white; background: linear-gradient(100deg,#303030,#1c1c1c); border-color: #555; box-shadow: inset 3px 0 #d1d1d1; }
        .menu.group-active { color: white; }
        .menu-icon { width: 19px; text-align: center; font-size: 14px; color: #d0d0d0; }
        .folder-arrow, .ext { margin-left: auto; font-size: 12px; color: #888; }
        .submenu { padding-left: 14px; margin: 2px 0 6px; border-left: 1px solid #2c2c2c; margin-left: 20px; display: grid; gap: 2px; }
        .menu.sub { font-size: 11px; padding: 9px 9px; }

        .sidebar-bottom { margin-top: auto; padding-top: 18px; }
        .authority-card { display: flex; gap: 11px; align-items: center; padding: 12px 10px; margin-bottom: 12px; background: #1b1b1b; border: 1px solid #383838; border-radius: 8px; }
        .authority-icon { font-size: 19px; color: #d7d7d7; }
        .authority-card strong, .authority-card small { display: block; }
        .authority-card strong { font-size: 11px; color: #eee; }
        .authority-card small { color: #929292; font-size: 10px; margin-top: 3px; }
        .logout { width: 100%; background: #e3e3e3; color: #111; border: none; padding: 12px; border-radius: 7px; cursor: pointer; font-weight: bold; font-size: 12px; }
        .logout:hover { background: white; }

        .content { flex: 1; min-width: 0; padding: 24px 32px; background: radial-gradient(ellipse at 85% 0%,#242424 0%,transparent 38%),#101010; }
        .topbar { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #353535; padding-bottom: 18px; gap: 15px; }
        .left { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .burger { width: 42px; height: 42px; flex-shrink: 0; background: #1c1c1c; color: #fff; border: 1px solid #444; border-radius: 9px; font-size: 20px; cursor: pointer; }
        .burger:hover { background: #2a2a2a; border-color: #777; }
        .heading-label { color: #999; font-size: 9px; letter-spacing: 2px; margin-bottom: 7px; }
        .topbar h1 { font-size: 23px; margin: 0; color: white; overflow-wrap: anywhere; }
        .top-profile-area { position: relative; }
        .top-profile { display: flex; align-items: center; gap: 10px; }
        .refresh-btn { background: #1c1c1c; color: #e9e9e9; border: 1px solid #444; border-radius: 7px; padding: 8px 12px; cursor: pointer; font-size: 12px; font-weight: bold; white-space: nowrap; }
        .top-status { display: flex; align-items: center; gap: 7px; color: #a9a9a9; font-size: 10px; }
        .profile-trigger { display: flex; align-items: center; gap: 10px; border: 1px solid transparent; background: transparent; color: white; padding: 5px 8px; border-radius: 8px; cursor: pointer; }
        .profile-trigger:hover { background: #252525; border-color: #444; }
        .top-user strong, .top-user small { display: block; text-align: left; }
        .top-user strong { font-size: 11px; }
        .top-user small { color: #888; font-size: 10px; margin-top: 3px; }
        .dropdown-arrow { color: #aaa; font-size: 9px; }
        .profile-dropdown { position: absolute; z-index: 30; top: calc(100% + 10px); right: 0; width: 200px; padding: 8px; background: #1c1c1c; border: 1px solid #484848; border-radius: 9px; box-shadow: 0 12px 30px #0009; }
        .profile-dropdown button { display: flex; gap: 10px; width: 100%; border: none; background: transparent; color: #ddd; padding: 10px; border-radius: 6px; text-align: left; cursor: pointer; font-size: 12px; }
        .profile-dropdown button:hover { background: #333; color: white; }
        .dropdown-logout { border-top: 1px solid #383838 !important; color: #f0a0a0 !important; }

        .welcome { display: flex; justify-content: space-between; align-items: center; gap: 20px; background: radial-gradient(circle at 85% 45%,#55555555,transparent 32%),linear-gradient(115deg,#292929,#111 72%); border: 1px solid #555; border-radius: 12px; padding: 28px; margin-top: 24px; overflow: hidden; }
        .welcome-label { color: #c7c7c7; font-size: 9px; letter-spacing: 2px; margin-bottom: 12px; }
        .welcome h2 { margin: 0 0 10px; font-size: 26px; color: white; overflow-wrap: anywhere; }
        .welcome p { color: #b6b6b6; margin: 0; font-size: 12px; line-height: 1.8; max-width: 510px; }
        .welcome-tag { display: inline-block; margin-top: 15px; border: 1px solid #777; color: #e2e2e2; padding: 6px 12px; font-size: 9px; letter-spacing: 1.5px; border-radius: 4px; }
        .welcome-emblem { min-width: 130px; text-align: center; }
        .emblem-outer { width: 85px; height: 85px; border: 1px solid #8c8c8c; transform: rotate(45deg); margin: 0 auto 18px; display: grid; place-items: center; }
        .emblem-inner { width: 60px; height: 60px; border: 1px solid #d0d0d0; display: grid; place-items: center; color: white; font-size: 30px; transform: rotate(-45deg); }
        .welcome-emblem span { color: #e7e7e7; font-size: 11px; letter-spacing: 2px; }

        .section-title { display: flex; justify-content: space-between; align-items: end; gap: 12px; margin: 28px 0 14px; }
        .section-title span { color: #929292; font-size: 9px; letter-spacing: 2px; }
        .section-title h3 { margin: 6px 0 0; font-size: 17px; color: #f0f0f0; }
        .overview-status { color: #aaa; font-size: 10px; display: flex; align-items: center; gap: 7px; }

        .stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }
        .stat-card, .panel { background: linear-gradient(145deg,#202020,#171717); border: 1px solid #383838; border-radius: 9px; padding: 18px; }
        .stat-card { transition: .2s; cursor: pointer; }
        .stat-card:hover { border-color: #777; transform: translateY(-2px); }
        .stat-card.alert { border-color: #a16207; }
        .stat-card.alert h2 { color: #fbbf24; }
        .stat-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .stat-card span { color: #aaa; font-size: 11px; }
        .stat-icon { width: 31px; height: 31px; display: grid; place-items: center; border: 1px solid #505050; border-radius: 7px; color: #e0e0e0; font-size: 15px; }
        .stat-card h2 { font-size: 27px; margin: 14px 0 5px; color: white; }
        .stat-card small { color: #858585; font-size: 10px; }

        .quick { display: grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap: 10px; }
        .quick-btn { display: flex; align-items: center; gap: 10px; padding: 14px; background: #191919; border: 1px solid #383838; border-radius: 9px; color: #ddd; cursor: pointer; font-size: 12px; text-align: left; }
        .quick-btn:hover { border-color: #777; color: white; background: #222; }
        .quick-btn span { font-size: 16px; }

        .panel { color: #bcbcbc; font-size: 12px; margin-bottom: 20px; }
        .hierarchy { display: grid; max-width: 590px; margin: 5px auto; }
        .level { display: flex; align-items: center; gap: 13px; background: #202020; border: 1px solid #424242; border-radius: 7px; padding: 12px 15px; color: #ededed; }
        .level.founder { background: linear-gradient(110deg,#414141,#202020); border-color: #a0a0a0; }
        .level-symbol { color: #d6d6d6; font-size: 20px; width: 24px; text-align: center; }
        .level strong, .level small { display: block; }
        .level strong { font-size: 12px; }
        .level small { font-size: 10px; color: #a0a0a0; margin-top: 3px; }
        .level-access { margin-left: auto; border: 1px solid #858585; border-radius: 4px; padding: 4px 7px; color: #eee; font-size: 8px; letter-spacing: 1px; }
        .hierarchy-line { height: 14px; width: 1px; background: #777; margin: 0 auto; }

        @media (max-width: 1050px) { .stats { grid-template-columns: repeat(2,minmax(0,1fr)); } .content { padding: 22px; } }
        @media (max-width: 700px) {
          .content { padding: 15px; }
          .topbar h1 { font-size: 18px; }
          .top-status, .top-user { display: none; }
          .refresh-btn { padding: 7px 9px; font-size: 11px; }
          .welcome { padding: 20px 16px; }
          .welcome h2 { font-size: 20px; }
          .welcome-emblem { display: none; }
          .stats { gap: 9px; }
          .stat-card { padding: 13px; }
          .stat-card h2 { font-size: 22px; }
        }
      `}</style>
    </main>
  );
}
