
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import UserManagement from "./UserManagement";
import ProfileSettings from "./ProfileSettings";

const menuItems = [
  "Overview",
  "User Management",
  "Departments",
  "Business Records",
  "Reports",
  "Activity Logs",
  "Security",
  "System Settings",
];

const menuIcons: Record<string, string> = {
  Overview: "◆",
  "User Management": "◈",
  Departments: "▦",
  "Business Records": "▤",
  Reports: "▥",
  "Activity Logs": "◷",
  Security: "◇",
  "System Settings": "⚙",
};

const profileItems = [
  "Profile Edit",
  "Change Mobile Number",
  "Change Email",
  "Change Username",
  "Change Password",
  "Forgot Password",
];

export default function Dashboard() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [activeMenu, setActiveMenu] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  const displayName = `${firstName} ${surname}`.trim() || "Founder";

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, surname, role")
        .eq("id", user.id)
        .single();

      if (error || !data || data.role !== "founder_owner") {
        router.replace("/");
        return;
      }

      setFirstName(data.first_name || "");
      setSurname(data.surname || "");
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  function openProfilePage(item: string) {
    setActiveMenu(item);
    setProfileMenuOpen(false);
    setProfileSettingsOpen(true);
  }

  if (loading) {
    return (
      <main className="loading">
        <div className="loading-diamond">◆</div>
        <h2>WIN GROUP</h2>
        <p>Preparing Founder Portal...</p>
        <style jsx>{`
          .loading {
            min-height: 100vh;
            background: #090909;
            color: #e8e8e8;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-family: Arial, sans-serif;
          }
          .loading-diamond {
            color: #dedede;
            font-size: 42px;
            margin-bottom: 12px;
          }
          h2 { letter-spacing: 5px; margin: 0; }
          p { color: #888; font-size: 13px; }
        `}</style>
      </main>
    );
  }

  return (
    <main className="layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-symbol">◆</div>
          <h2>WIN GROUP</h2>
          <span>WOLF INDEPENDENT</span>
          <span>NATIONAL GROUP</span>
          <div className="brand-line" />
          <small>FOUNDER CONTROL CENTER</small>
        </div>

        <div className="profile">
          <div className="avatar">
            {firstName.charAt(0).toUpperCase() || "F"}
          </div>
          <div className="profile-info">
            <strong>{displayName}</strong>
            <small>Founder / Owner</small>
            <span className="online-indicator">
              <i />
              System Owner
            </span>
          </div>
        </div>

        <p className="menu-title">MAIN NAVIGATION</p>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item}
              className={activeMenu === item ? "menu active" : "menu"}
              onClick={() => {
                setActiveMenu(item);
                setProfileMenuOpen(false);
              }}
            >
              <span className="menu-icon">{menuIcons[item]}</span>
              <span>{item}</span>
              {activeMenu === item && <span className="active-mark">◆</span>}
            </button>
          ))}
        </nav>

        <div className="profile-settings-menu">
          <button
            className={profileItems.includes(activeMenu) ? "menu active" : "menu"}
            onClick={() => setProfileSettingsOpen(!profileSettingsOpen)}
          >
            <span className="menu-icon">⚙</span>
            <span>Profile Settings</span>
            <span className="folder-arrow">
              {profileSettingsOpen ? "−" : "+"}
            </span>
          </button>

          {profileSettingsOpen && (
            <div className="profile-submenu">
              {profileItems.map((item) => (
                <button
                  key={item}
                  className={activeMenu === item ? "menu active" : "menu"}
                  onClick={() => openProfilePage(item)}
                >
                  <span>{item}</span>
                  {activeMenu === item && <span className="active-mark">◆</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="authority-card">
            <span className="authority-icon">◆</span>
            <div>
              <strong>Founder Authority</strong>
              <small>Full System Access</small>
            </div>
          </div>

          <button className="logout" onClick={logout}>
            <span>↪</span> Logout
          </button>

          <div className="sidebar-footer">
            WIN GROUP MANAGEMENT
            <span>SECURE FOUNDER PORTAL</span>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="page-heading">
            <div className="heading-label">WIN GROUP / FOUNDER</div>
            <h1>{activeMenu}</h1>
            <p>Founder / Owner Management Portal</p>
          </div>

          <div className="top-profile-area">
            <div className="top-profile">
              <div className="top-status"><i /> System Active</div>
              <button
                className="profile-trigger"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                aria-label="Open profile menu"
              >
                <div className="top-avatar">
                  {firstName.charAt(0).toUpperCase() || "F"}
                </div>
                <div className="top-user">
                  <strong>{displayName}</strong>
                  <small>Founder / Owner</small>
                </div>
                <span className="dropdown-arrow">
                  {profileMenuOpen ? "▲" : "▼"}
                </span>
              </button>
            </div>

            {profileMenuOpen && (
              <div className="profile-dropdown">
                <div className="dropdown-heading">
                  <strong>{displayName}</strong>
                  <small>Founder / Owner</small>
                </div>
                <button onClick={() => openProfilePage("Profile Edit")}>
                  <span>◉</span> Profile Edit
                </button>
                <button
                  onClick={() => {
                    setProfileSettingsOpen(true);
                    setActiveMenu("Change Password");
                    setProfileMenuOpen(false);
                  }}
                >
                  <span>◇</span> Profile Settings
                </button>
                <button className="dropdown-logout" onClick={logout}>
                  <span>↪</span> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {activeMenu === "Profile Edit" ? (
          <ProfileSettings />
        ) : activeMenu === "User Management" ? (
          <UserManagement />
        ) : activeMenu === "Overview" ? (
          <>
            <div className="welcome">
              <div className="welcome-content">
                <div className="welcome-label">◆ &nbsp; FOUNDER CONTROL CENTER</div>
                <h2>Welcome, {displayName}</h2>
                <p>
                  Your organization. Your authority. Manage the entire WIN GROUP
                  system from one secure control center.
                </p>
                <div className="welcome-tag">FOUNDER / OWNER</div>
              </div>
              <div className="welcome-emblem">
                <div className="emblem-outer">
                  <div className="emblem-inner">◆</div>
                </div>
                <span>WIN GROUP</span>
                <small>EST. MANAGEMENT</small>
              </div>
            </div>

            <div className="section-title">
              <div>
                <span>ORGANIZATION</span>
                <h3>Company Overview</h3>
              </div>
              <div className="overview-status"><i /> Portal Connected</div>
            </div>

            <div className="stats">
              {[
                ["Total Users", "0", "Registered accounts", "◈"],
                ["Departments", "0", "Company departments", "▦"],
                ["Business Records", "0", "Company records", "▤"],
                ["System Status", "Active", "Portal connected", "◇"],
              ].map(([label, value, note, symbol]) => (
                <div className="stat-card" key={label}>
                  <div className="stat-top">
                    <span>{label}</span>
                    <div className="stat-icon">{symbol}</div>
                  </div>
                  <h2 className={value === "Active" ? "online-text" : ""}>{value}</h2>
                  <small>{note}</small>
                </div>
              ))}
            </div>

            <div className="section-title structure-title">
              <div>
                <span>COMPANY HIERARCHY</span>
                <h3>Management Structure</h3>
              </div>
            </div>

            <div className="panel">
              <div className="hierarchy">
                {[
                  ["◆", "Founder / Owner", "Ultimate System Authority"],
                  ["◈", "Super Admin", "Complete Access to Own Team"],
                  ["◇", "Admin", "Reports to Super Admin"],
                  ["○", "Staff", "Reports to Admin"],
                ].map(([symbol, title, note], index) => (
                  <div key={title}>
                    <div className={index === 0 ? "level founder" : "level"}>
                      <span className="level-symbol">{symbol}</span>
                      <div>
                        <strong>{title}</strong>
                        <small>{note}</small>
                      </div>
                      {index === 0 && <span className="level-access">FULL ACCESS</span>}
                    </div>
                    {index !== 3 && <div className="hierarchy-line" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="section-title">
              <div>
                <span>OWNER PRIVILEGES</span>
                <h3>Founder Authority</h3>
              </div>
            </div>

            <div className="panel authority-panel">
              <div className="authority-heading">
                <div className="authority-large">◆</div>
                <div>
                  <h3>Complete Organization Control</h3>
                  <p>
                    Founder / Owner has final authority over all teams, accounts
                    and company operations.
                  </p>
                </div>
              </div>
              <div className="authority-grid">
                <div>◆ &nbsp; Manage all teams</div>
                <div>◆ &nbsp; Control user permissions</div>
                <div>◆ &nbsp; Approve sensitive actions</div>
                <div>◆ &nbsp; Manage payments</div>
                <div>◆ &nbsp; Monitor company reports</div>
                <div>◆ &nbsp; Control system security</div>
              </div>
            </div>
          </>
        ) : profileItems.includes(activeMenu) ? (
          <div className="panel coming">
            <div className="coming-icon">◆</div>
            <span>FOUNDER PROFILE SETTINGS</span>
            <h2>{activeMenu}</h2>
            <p>
              This setting will be connected with secure verification in the
              next development step.
            </p>
            <small>Founder / Owner Full Access</small>
          </div>
        ) : (
          <div className="panel coming">
            <div className="coming-icon">◆</div>
            <span>FOUNDER MODULE</span>
            <h2>{activeMenu}</h2>
            <p>
              This section will be developed and connected to the database in
              the next development steps.
            </p>
            <small>Founder / Owner Full Access</small>
          </div>
        )}
      </section>

      <style jsx>{`
        * { box-sizing: border-box; }
        .layout {
          min-height: 100vh; display: flex; background: #101010;
          color: #e9e9e9; font-family: Arial, sans-serif;
        }
        .sidebar {
          width: 270px; min-height: 100vh;
          background: linear-gradient(180deg,#080808,#141414);
          padding: 25px 17px; display: flex; flex-direction: column;
          flex-shrink: 0; border-right: 1px solid #343434;
        }
        .brand { text-align: center; padding: 8px 5px 23px; border-bottom: 1px solid #333; }
        .brand-symbol { color: #dedede; font-size: 30px; margin-bottom: 8px; }
        .brand h2 { margin: 0 0 10px; font-size: 23px; letter-spacing: 4px; color: white; }
        .brand span { display: block; color: #999; font-size: 9px; letter-spacing: 2px; margin-top: 4px; }
        .brand-line { height: 1px; width: 65px; background: #a8a8a8; margin: 15px auto; }
        .brand small { color: #c7c7c7; font-size: 9px; letter-spacing: 2px; }
        .profile { display: flex; align-items: center; gap: 12px; padding: 23px 5px; border-bottom: 1px solid #292929; }
        .avatar,.top-avatar {
          background: linear-gradient(145deg,#f1f1f1,#8c8c8c); color: #101010;
          border: 2px solid white; border-radius: 50%; width: 43px; height: 43px;
          display: grid; place-items: center; font-weight: bold; font-size: 20px; flex-shrink: 0;
        }
        .profile-info { min-width: 0; }
        .profile strong,.profile small { display: block; }
        .profile strong { font-size: 12px; color: white; overflow-wrap: anywhere; }
        .profile small { color: #a6a6a6; margin-top: 5px; font-size: 11px; }
        .online-indicator { display: flex; align-items: center; gap: 6px; color: #bdbdbd; font-size: 10px; margin-top: 8px; }
        .online-indicator i,.top-status i,.overview-status i { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #79c99a; box-shadow: 0 0 8px #79c99a80; }
        .menu-title { color: #777; font-size: 9px; letter-spacing: 2px; padding-left: 9px; margin: 24px 0 12px; }
        nav { display: grid; gap: 7px; }
        .menu { display: flex; gap: 12px; align-items: center; padding: 13px 12px; border: 1px solid transparent; border-radius: 7px; color: #b9b9b9; background: transparent; text-align: left; cursor: pointer; font-size: 12px; width: 100%; }
        .menu:hover { background: #242424; color: white; }
        .menu.active { color: white; background: linear-gradient(100deg,#303030,#1c1c1c); border-color: #555; box-shadow: inset 3px 0 #d1d1d1; }
        .menu-icon { width: 19px; text-align: center; font-size: 16px; color: #d0d0d0; }
        .active-mark { margin-left: auto; font-size: 9px; color: white; }
        .profile-settings-menu { margin-top: 8px; }
        .folder-arrow { margin-left: auto; font-size: 15px; }
        .profile-submenu { padding-left: 15px; display: grid; gap: 4px; margin-top: 5px; }
        .profile-submenu .menu { font-size: 11px; padding: 11px 9px; }
        .sidebar-bottom { margin-top: auto; }
        .authority-card { display: flex; gap: 11px; align-items: center; padding: 13px 10px; margin: 24px 0 15px; background: #1b1b1b; border: 1px solid #383838; border-radius: 8px; }
        .authority-icon { font-size: 19px; color: #d7d7d7; }
        .authority-card strong,.authority-card small { display: block; }
        .authority-card strong { font-size: 11px; color: #eee; }
        .authority-card small { color: #929292; font-size: 10px; margin-top: 4px; }
        .logout { width: 100%; background: #e3e3e3; color: #111; border: none; padding: 13px; border-radius: 7px; cursor: pointer; font-weight: bold; font-size: 12px; }
        .logout:hover { background: white; }
        .logout span { margin-right: 8px; font-size: 16px; }
        .sidebar-footer { text-align: center; color: #747474; font-size: 8px; letter-spacing: 1.4px; margin-top: 17px; line-height: 1.8; }
        .sidebar-footer span { display: block; color: #555; font-size: 8px; }
        .content { flex: 1; min-width: 0; padding: 28px 34px; background: radial-gradient(ellipse at 85% 0%,#242424 0%,transparent 38%),#101010; }
        .topbar { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #353535; padding-bottom: 21px; gap: 15px; }
        .heading-label { color: #999; font-size: 9px; letter-spacing: 2px; margin-bottom: 9px; }
        .topbar h1 { font-size: 25px; margin: 0; color: white; }
        .topbar p { margin: 6px 0 0; color: #929292; font-size: 11px; }
        .top-profile-area { position: relative; }
        .top-profile { display: flex; align-items: center; gap: 10px; }
        .top-status { display: flex; align-items: center; gap: 7px; color: #a9a9a9; font-size: 10px; margin-right: 13px; }
        .profile-trigger { display: flex; align-items: center; gap: 10px; border: 1px solid transparent; background: transparent; color: white; padding: 5px 8px; border-radius: 8px; cursor: pointer; }
        .profile-trigger:hover { background: #252525; border-color: #444; }
        .top-avatar { width: 36px; height: 36px; font-size: 15px; }
        .top-user strong,.top-user small { display: block; text-align: left; }
        .top-user strong { color: #f2f2f2; font-size: 11px; }
        .top-user small { color: #888; font-size: 10px; margin-top: 4px; }
        .dropdown-arrow { color: #aaa; font-size: 9px; }
        .profile-dropdown { position: absolute; z-index: 20; top: calc(100% + 12px); right: 0; width: 220px; padding: 9px; background: #1c1c1c; border: 1px solid #484848; border-radius: 9px; box-shadow: 0 12px 30px #0009; }
        .dropdown-heading { padding: 10px; border-bottom: 1px solid #383838; margin-bottom: 6px; }
        .dropdown-heading strong,.dropdown-heading small { display: block; }
        .dropdown-heading strong { color: white; font-size: 12px; }
        .dropdown-heading small { color: #999; font-size: 10px; margin-top: 5px; }
        .profile-dropdown button { display: flex; align-items: center; gap: 10px; width: 100%; border: none; background: transparent; color: #ddd; padding: 11px 10px; border-radius: 6px; text-align: left; cursor: pointer; font-size: 12px; }
        .profile-dropdown button:hover { background: #333; color: white; }
        .profile-dropdown .dropdown-logout { border-top: 1px solid #383838; border-radius: 0; margin-top: 5px; color: #f0a0a0; }
        .welcome { display: flex; justify-content: space-between; align-items: center; gap: 20px; background: radial-gradient(circle at 85% 45%,#55555555,transparent 32%),linear-gradient(115deg,#292929,#111 72%); border: 1px solid #555; border-radius: 12px; padding: 30px; margin-top: 26px; min-height: 205px; box-shadow: 0 15px 35px #00000035; overflow: hidden; }
        .welcome-label { color: #c7c7c7; font-size: 9px; letter-spacing: 2px; margin-bottom: 14px; }
        .welcome h2 { margin: 0 0 10px; font-size: 27px; color: white; overflow-wrap: anywhere; }
        .welcome p { color: #b6b6b6; margin: 0; font-size: 12px; line-height: 1.8; max-width: 510px; }
        .welcome-tag { display: inline-block; margin-top: 17px; border: 1px solid #777; color: #e2e2e2; padding: 7px 12px; font-size: 9px; letter-spacing: 1.5px; border-radius: 4px; }
        .welcome-emblem { min-width: 145px; text-align: center; }
        .emblem-outer { width: 91px; height: 91px; border: 1px solid #8c8c8c; transform: rotate(45deg); margin: 0 auto 20px; display: grid; place-items: center; }
        .emblem-inner { width: 65px; height: 65px; border: 1px solid #d0d0d0; display: grid; place-items: center; color: white; font-size: 33px; transform: rotate(-45deg); }
        .welcome-emblem span,.welcome-emblem small { display: block; letter-spacing: 2px; }
        .welcome-emblem span { color: #e7e7e7; font-size: 11px; }
        .welcome-emblem small { color: #888; font-size: 8px; margin-top: 6px; }
        .section-title { display: flex; justify-content: space-between; align-items: end; gap: 12px; margin: 30px 0 15px; }
        .section-title span { color: #929292; font-size: 9px; letter-spacing: 2px; }
        .section-title h3 { margin: 6px 0 0; font-size: 17px; color: #f0f0f0; }
        .overview-status { color: #aaa; font-size: 10px; display: flex; align-items: center; gap: 7px; }
        .stats { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 14px; }
        .stat-card,.panel { background: linear-gradient(145deg,#202020,#171717); border: 1px solid #383838; border-radius: 9px; padding: 19px; }
        .stat-card { transition: .2s; }
        .stat-card:hover { border-color: #777; transform: translateY(-2px); }
        .stat-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .stat-card span { color: #aaa; font-size: 11px; }
        .stat-icon { width: 31px; height: 31px; display: grid; place-items: center; border: 1px solid #505050; border-radius: 7px; color: #e0e0e0; font-size: 16px; }
        .stat-card h2 { font-size: 27px; margin: 15px 0 6px; color: white; }
        .stat-card small { color: #858585; font-size: 10px; }
        .online-text { color: #a8d9b6 !important; font-size: 22px !important; }
        .structure-title { margin-top: 31px; }
        .panel { color: #bcbcbc; line-height: 1.7; font-size: 12px; }
        .hierarchy { display: grid; max-width: 590px; margin: 5px auto; }
        .level { display: flex; align-items: center; gap: 13px; background: #202020; border: 1px solid #424242; border-radius: 7px; padding: 13px 15px; color: #ededed; }
        .level.founder { background: linear-gradient(110deg,#414141,#202020); border-color: #a0a0a0; color: white; }
        .level-symbol { color: #d6d6d6; font-size: 20px; width: 24px; text-align: center; }
        .level strong,.level small { display: block; }
        .level strong { font-size: 12px; }
        .level small { font-size: 10px; color: #a0a0a0; margin-top: 3px; }
        .level-access { margin-left: auto; border: 1px solid #858585; border-radius: 4px; padding: 4px 7px; color: #eee; font-size: 8px; letter-spacing: 1px; }
        .hierarchy-line { height: 15px; width: 1px; background: #777; margin: 0 auto; }
        .authority-panel { margin-bottom: 20px; }
        .authority-heading { display: flex; align-items: center; gap: 15px; padding-bottom: 17px; border-bottom: 1px solid #3a3a3a; }
        .authority-large { width: 46px; height: 46px; display: grid; place-items: center; color: #eee; border: 1px solid #777; border-radius: 8px; font-size: 23px; flex-shrink: 0; }
        .authority-heading h3 { color: #f0f0f0; font-size: 14px; margin: 0 0 5px; }
        .authority-heading p { color: #999; margin: 0; font-size: 11px; }
        .authority-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 13px; margin-top: 18px; color: #c9c9c9; font-size: 11px; }
        .coming { margin-top: 30px; padding: 45px 30px; text-align: center; }
        .coming-icon { font-size: 35px; color: #d5d5d5; margin-bottom: 14px; }
        .coming > span { color: #999; font-size: 9px; letter-spacing: 2px; }
        .coming h2 { color: white; font-size: 23px; margin: 12px 0; }
        .coming p { color: #aaa; font-size: 12px; }
        .coming small { display: inline-block; margin-top: 12px; color: #d0d0d0; border: 1px solid #555; padding: 7px 12px; border-radius: 4px; }
        @media (max-width:1050px) {
          .sidebar { width: 245px; }
          .content { padding: 24px; }
          .stats { grid-template-columns: repeat(2,minmax(0,1fr)); }
        }
        @media (max-width:700px) {
          .layout { flex-direction: column; }
          .sidebar { width: 100%; min-height: auto; padding: 17px; }
          .brand { padding-bottom: 16px; }
          .brand-symbol { font-size: 24px; }
          .brand h2 { font-size: 20px; }
          .profile { padding: 14px 4px; }
          .menu-title { margin-top: 16px; }
          nav { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 6px; }
          .menu { padding: 11px 8px; gap: 8px; font-size: 11px; }
          .profile-submenu { padding-left: 10px; }
          .sidebar-bottom { margin-top: 15px; }
          .authority-card { margin: 10px 0; }
          .sidebar-footer { display: none; }
          .content { padding: 17px; }
          .topbar { align-items: flex-start; }
          .topbar h1 { font-size: 20px; }
          .top-status { display: none; }
          .top-user { display: none; }
          .profile-dropdown { right: 0; }
          .welcome { padding: 22px 18px; min-height: 175px; }
          .welcome h2 { font-size: 21px; }
          .welcome p { font-size: 11px; }
          .welcome-emblem { min-width: 75px; }
          .emblem-outer { width: 57px; height: 57px; }
          .emblem-inner { width: 41px; height: 41px; font-size: 22px; }
          .welcome-emblem span { font-size: 8px; }
          .welcome-emblem small { font-size: 6px; }
          .stats { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 9px; }
          .stat-card { padding: 13px; }
          .stat-card h2 { font-size: 23px; }
          .stat-card span { font-size: 10px; }
          .section-title h3 { font-size: 15px; }
          .level { padding: 11px 9px; gap: 8px; }
          .level strong { font-size: 11px; }
          .level small { font-size: 9px; }
          .level-access { font-size: 7px; padding: 3px 4px; }
          .authority-grid { grid-template-columns: 1fr; gap: 10px; }
        }
        @media (max-width:380px) {
          .welcome-emblem { display: none; }
          .stats { grid-template-columns: 1fr; }
          .overview-status { font-size: 9px; }
        }
      `}</style>
    </main>
  );
}
