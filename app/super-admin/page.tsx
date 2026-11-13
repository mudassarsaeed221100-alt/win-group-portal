
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  first_name: string | null;
  surname: string | null;
  role: string;
  team_code: string | null;
  avatar_url: string | null;
};

const menuItems = [
  "Overview",
  "Team Management",
  "Create Staff",
  "Work Tasks",
  "Submissions",
  "Earnings",
  "Notifications",
  "Profile",
  "Support",
];

export default function SuperAdminPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeMenu, setActiveMenu] = useState("Overview");

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted) {
        setLoadError(
          "10 seconds ho gaye, Supabase se response nahi aa raha. Connection ya request check karein."
        );
        setLoading(false);
      }
    }, 10000);

    const loadProfile = async () => {
      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError) throw authError;

        if (!authData.user) {
          router.replace("/");
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select(
            "id, first_name, surname, role, team_code, avatar_url"
          )
          .eq("id", authData.user.id)
          .single();

        if (error) throw error;

        if (!data) {
          throw new Error("Profile record nahi mila.");
        }

        if (data.role !== "super_admin") {
          throw new Error(
            `Aapke account ka role "${data.role}" hai, jabke "super_admin" required hai.`
          );
        }

        if (mounted) {
          setProfile(data);
          setLoadError("");
        }
      } catch (error) {
        console.error("Super Admin loading error:", error);

        if (mounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Portal load nahi ho saka."
          );
        }
      } finally {
        clearTimeout(timeout);

        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [router]);

  if (loading) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.loader}></div>
        <h2>Loading Super Admin Portal...</h2>
        <p>Please wait while your dashboard loads.</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={styles.centerScreen}>
        <div style={styles.errorBox}>
          <h2>Portal Loading Error</h2>
          <p>{loadError}</p>
          <button
            style={styles.primaryButton}
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
          <button
            style={styles.secondaryButton}
            onClick={() => router.replace("/")}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const fullName =
    `${profile.first_name || ""} ${profile.surname || ""}`.trim() ||
    "Super Admin";

  const renderContent = () => {
    if (activeMenu === "Overview") {
      return (
        <>
          <div style={styles.statsGrid}>
            {[
              ["Total Staff", "—"],
              ["Active Tasks", "—"],
              ["Pending Submissions", "—"],
              ["Total Earnings", "Rs. —"],
            ].map(([label, value]) => (
              <div style={styles.statCard} key={label}>
                <p style={styles.muted}>{label}</p>
                <h2>{value}</h2>
              </div>
            ))}
          </div>

          <div style={styles.panel}>
            <h2>Welcome, {fullName}</h2>
            <p style={styles.muted}>
              WIN GROUP Super Admin Dashboard
            </p>
            <div style={styles.infoGrid}>
              <div>
                <span style={styles.muted}>Team Code</span>
                <h3>{profile.team_code || "Not Assigned"}</h3>
              </div>
              <div>
                <span style={styles.muted}>Account Role</span>
                <h3>Super Admin</h3>
              </div>
            </div>
          </div>

          <div style={styles.panel}>
            <h2>Quick Actions</h2>
            <div style={styles.actionGrid}>
              {[
                "Create Staff",
                "Work Tasks",
                "Submissions",
                "Earnings",
              ].map((item) => (
                <button
                  key={item}
                  style={styles.actionButton}
                  onClick={() => setActiveMenu(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </>
      );
    }

    const descriptions: Record<string, string> = {
      "Team Management":
        "Apni Team Code ke staff members ko yahan manage karein.",
      "Create Staff":
        "Apni team ke liye naye Staff accounts create karein.",
      "Work Tasks":
        "Staff ko tasks assign aur manage karein.",
      Submissions:
        "Staff ki submitted work details aur progress dekhein.",
      Earnings:
        "Daily, weekly, monthly aur total earnings dekhein.",
      Notifications:
        "Team aur account ki important notifications.",
      Profile:
        "Apni profile information dekhein aur manage karein.",
      Support:
        "WIN GROUP support se rabta karein.",
    };

    return (
      <div style={styles.panel}>
        <h2>{activeMenu}</h2>
        <p style={styles.muted}>
          {descriptions[activeMenu] || "Dashboard section"}
        </p>
        <p style={styles.notice}>
          Yeh section abhi tayyar kiya ja raha hai. Is mein existing
          dashboard ke features aglay steps mein add honge.
        </p>
      </div>
    );
  };

  return (
    <div style={styles.dashboard}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logo}>W</div>
          <div>
            <h2>WIN GROUP</h2>
            <span>Management Portal</span>
          </div>
        </div>

        <div style={styles.userBox}>
          <div style={styles.avatar}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profile"
                style={styles.avatarImage}
              />
            ) : (
              fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ minWidth: 0 }}>
            <strong>{fullName}</strong>
            <span>Super Admin</span>
          </div>
        </div>

        <p style={styles.menuHeading}>MAIN MENU</p>

        <nav style={styles.navigation}>
          {menuItems.map((item) => (
            <button
              key={item}
              onClick={() => setActiveMenu(item)}
              style={{
                ...styles.menuButton,
                ...(activeMenu === item
                  ? styles.activeMenuButton
                  : {}),
              }}
            >
              {item}
            </button>
          ))}
        </nav>

        <button
          style={styles.logoutButton}
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/");
          }}
        >
          Sign Out
        </button>
      </aside>

      <main style={styles.main}>
        <header style={styles.topbar}>
          <div>
            <h1>{activeMenu}</h1>
            <p>WIN GROUP Management System</p>
          </div>
          <div style={styles.topProfile}>
            <span>{fullName}</span>
            <span style={styles.roleBadge}>Super Admin</span>
          </div>
        </header>

        <section style={styles.content}>
          {renderContent()}
        </section>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  centerScreen: {
    minHeight: "100vh",
    background: "#090d18",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  },
  loader: {
    width: 38,
    height: 38,
    border: "4px solid #26344d",
    borderTop: "4px solid #38bdf8",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  errorBox: {
    maxWidth: 500,
    width: "100%",
    background: "#151d2e",
    border: "1px solid #34445e",
    borderRadius: 14,
    padding: 28,
  },
  primaryButton: {
    background: "#2563eb",
    color: "white",
    border: 0,
    borderRadius: 8,
    padding: "12px 20px",
    cursor: "pointer",
    margin: 8,
  },
  secondaryButton: {
    background: "#273449",
    color: "white",
    border: 0,
    borderRadius: 8,
    padding: "12px 20px",
    cursor: "pointer",
    margin: 8,
  },
  dashboard: {
    minHeight: "100vh",
    display: "flex",
    background: "#0b1020",
    color: "#f8fafc",
    fontFamily: "Arial, sans-serif",
  },
  sidebar: {
    width: 250,
    minWidth: 250,
    background: "#111827",
    borderRight: "1px solid #273449",
    padding: 20,
    display: "flex",
    flexDirection: "column",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 30,
  },
  logo: {
    width: 42,
    height: 42,
    background: "#2563eb",
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    fontSize: 23,
    fontWeight: 800,
  },
  userBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: 12,
    background: "#1e293b",
    borderRadius: 10,
    marginBottom: 25,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: "#334155",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
    fontWeight: 700,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  menuHeading: {
    color: "#94a3b8",
    fontSize: 11,
    letterSpacing: 1,
  },
  navigation: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
  },
  menuButton: {
    padding: "12px 14px",
    border: 0,
    borderRadius: 8,
    background: "transparent",
    color: "#cbd5e1",
    textAlign: "left",
    cursor: "pointer",
    fontSize: 14,
  },
  activeMenuButton: {
    background: "#1d4ed8",
    color: "#ffffff",
    fontWeight: 700,
  },
  logoutButton: {
    marginTop: "auto",
    padding: 12,
    background: "#7f1d1d",
    color: "white",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  topbar: {
    minHeight: 85,
    padding: "18px 28px",
    borderBottom: "1px solid #273449",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 15,
    flexWrap: "wrap",
  },
  topProfile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 5,
  },
  roleBadge: {
    color: "#7dd3fc",
    fontSize: 12,
  },
  content: {
    padding: 28,
    maxWidth: 1300,
    margin: "0 auto",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 16,
    marginBottom: 22,
  },
  statCard: {
    background: "#151f32",
    border: "1px solid #273449",
    borderRadius: 12,
    padding: 20,
  },
  panel: {
    background: "#151f32",
    border: "1px solid #273449",
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
  },
  muted: {
    color: "#94a3b8",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 20,
    marginTop: 25,
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginTop: 18,
  },
  actionButton: {
    padding: 16,
    border: "1px solid #334155",
    background: "#1e293b",
    color: "white",
    borderRadius: 9,
    cursor: "pointer",
  },
  notice: {
    marginTop: 20,
    padding: 15,
    background: "#1e293b",
    borderRadius: 8,
    color: "#cbd5e1",
  },
};
