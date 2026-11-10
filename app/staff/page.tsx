
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import StaffOverview from "./StaffOverview";

type MenuKey =
  | "overview"
  | "tasks"
  | "submit"
  | "earnings"
  | "notifications"
  | "profile"
  | "support";

type StaffProfile = {
  first_name: string | null;
  surname: string | null;
  role: string;
};

const menuItems: { id: MenuKey; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Available Work Tasks" },
  { id: "submit", label: "Submit Work & Proof" },
  { id: "earnings", label: "My Earnings" },
  { id: "notifications", label: "Notifications" },
  { id: "profile", label: "My Profile" },
  { id: "support", label: "Support" },
];

export default function StaffDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<MenuKey>("overview");
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkStaff() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (!user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, surname, role")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (error || !data || data.role !== "staff") {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    checkStaff();

    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        Loading Staff Portal...
      </div>
    );
  }

  if (!profile) return null;

  const fullName =
    `${profile.first_name || ""} ${profile.surname || ""}`.trim() ||
    "Staff Member";

  function renderContent() {
    switch (activeMenu) {
      case "overview":
        return <StaffOverview />;

      case "tasks":
        return (
          <ComingSoon
            title="Available Work Tasks"
            description="Yahan aapko company ki taraf se available work tasks nazar aayenge."
            inactive
          />
        );

      case "submit":
        return (
          <ComingSoon
            title="Submit Work & Proof"
            description="Yahan staff apna completed work aur proof submit kar sakega."
            inactive
          />
        );

      case "earnings":
        return (
          <ComingSoon
            title="My Earnings"
            description="Yahan aapki approved earnings aur payment records show honge."
          />
        );

      case "notifications":
        return (
          <ComingSoon
            title="Notifications"
            description="Yahan company ki taraf se aane wali notifications show hongi."
          />
        );

      case "profile":
        return (
          <section style={styles.contentCard}>
            <h2>My Profile</h2>
            <p style={styles.muted}>
              Aapki personal account information.
            </p>

            <InfoRow label="First Name" value={profile.first_name || "Not set"} />
            <InfoRow label="Surname" value={profile.surname || "Not set"} />
            <InfoRow label="Full Name" value={fullName} />
            <InfoRow label="Account Role" value="Staff" />
            <InfoRow label="Account Status" value="Active" />
          </section>
        );

      case "support":
        return (
          <ComingSoon
            title="Staff Support"
            description="Yahan aap company support team se help aur guidance hasil kar sakenge."
          />
        );

      default:
        return <StaffOverview />;
    }
  }

  return (
    <div style={styles.layout}>
      <aside
        style={{
          ...styles.sidebar,
          ...(sidebarOpen ? styles.sidebarOpen : {}),
        }}
      >
        <div style={styles.brand}>
          <h2 style={{ margin: 0 }}>WIN GROUP</h2>
          <p style={styles.brandSubtitle}>
            WOLF INDEPENDENT NATIONAL GROUP
          </p>
        </div>

        <div style={styles.userBox}>
          <div style={styles.avatar}>
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <strong>{fullName}</strong>
            <p style={styles.userRole}>Staff Member</p>
          </div>
        </div>

        <p style={styles.menuHeading}>STAFF MENU</p>

        <nav style={styles.navigation}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveMenu(item.id);
                setSidebarOpen(false);
              }}
              style={{
                ...styles.menuButton,
                ...(activeMenu === item.id
                  ? styles.activeMenuButton
                  : {}),
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button onClick={logout} style={styles.logoutButton}>
          Logout
        </button>
      </aside>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={styles.hamburger}
          >
            ☰
          </button>

          <div>
            <strong>Staff Workspace</strong>
            <p style={styles.topbarSubtitle}>
              Welcome, {fullName}
            </p>
          </div>
        </header>

        <div style={styles.pageContent}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

function ComingSoon({
  title,
  description,
  inactive = false,
}: {
  title: string;
  description: string;
  inactive?: boolean;
}) {
  return (
    <section style={styles.contentCard}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      <p style={styles.muted}>{description}</p>

      <div style={styles.statusBox}>
        {inactive
          ? "Task System Currently Inactive"
          : "Module Structure Ready - Integration Pending"}
      </div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div style={styles.infoRow}>
      <span style={styles.muted}>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: "100vh",
    display: "flex",
    background: "#f3f6fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    width: 260,
    minWidth: 260,
    background: "#14233d",
    color: "white",
    padding: 20,
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    boxSizing: "border-box",
  },
  sidebarOpen: {
    display: "flex",
  },
  brand: {
    padding: "12px 5px 22px",
    borderBottom: "1px solid #34435a",
  },
  brandSubtitle: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: "#aab9d0",
    marginBottom: 0,
  },
  userBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "22px 5px",
    borderBottom: "1px solid #34435a",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    background: "#365b9d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 19,
    fontWeight: "bold",
  },
  userRole: {
    color: "#aab9d0",
    fontSize: 12,
    margin: "5px 0 0",
  },
  menuHeading: {
    color: "#91a2bd",
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 25,
  },
  navigation: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    flex: 1,
    marginTop: 10,
  },
  menuButton: {
    width: "100%",
    padding: "13px 12px",
    border: "none",
    borderRadius: 8,
    background: "transparent",
    color: "#d4deec",
    textAlign: "left",
    fontSize: 14,
    cursor: "pointer",
  },
  activeMenuButton: {
    background: "#294c80",
    color: "white",
    fontWeight: "bold",
  },
  logoutButton: {
    padding: 12,
    border: "none",
    borderRadius: 8,
    background: "#d94850",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 20,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  topbar: {
    background: "white",
    padding: "18px 25px",
    display: "flex",
    alignItems: "center",
    gap: 15,
    borderBottom: "1px solid #e5eaf1",
  },
  hamburger: {
    border: "1px solid #dce3ed",
    background: "white",
    borderRadius: 7,
    padding: "7px 12px",
    fontSize: 20,
    cursor: "pointer",
  },
  topbarSubtitle: {
    color: "#718096",
    fontSize: 12,
    margin: "4px 0 0",
  },
  pageContent: {
    padding: 22,
    maxWidth: 1400,
    margin: "0 auto",
  },
  contentCard: {
    background: "white",
    padding: 25,
    borderRadius: 14,
    border: "1px solid #e5eaf1",
  },
  muted: {
    color: "#718096",
    fontSize: 14,
  },
  statusBox: {
    marginTop: 25,
    padding: 18,
    background: "#f1f5f9",
    borderRadius: 9,
    color: "#52627a",
    fontSize: 14,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 15,
    padding: "15px 0",
    borderBottom: "1px solid #edf0f4",
    fontSize: 14,
  },
};

