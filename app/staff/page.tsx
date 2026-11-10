
"use client";

import {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

import StaffOverview from "./StaffOverview";
import AvailableWorkTasks from "./AvailableWorkTasks";
import SubmitWork from "./SubmitWork";
import MyEarnings from "./MyEarnings";
import Notifications from "./Notifications";
import MyProfile from "./MyProfile";
import Support from "./Support";

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
  avatar_url: string | null;
  team_code: string | null;
};

type SuperAdminProfile = {
  first_name: string | null;
  surname: string | null;
  team_code: string | null;
};

type SelectedTask = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  deadline: string | null;
  created_at: string;
};

const menuItems: {
  id: MenuKey;
  label: string;
  icon: string;
}[] = [
  { id: "overview", label: "Dashboard Overview", icon: "⌂" },
  { id: "tasks", label: "Available Work Tasks", icon: "▤" },
  { id: "submit", label: "Submit Work & Proof", icon: "⇧" },
  { id: "earnings", label: "My Earnings", icon: "₨" },
  { id: "notifications", label: "Notifications", icon: "♧" },
  { id: "profile", label: "My Profile", icon: "◉" },
  { id: "support", label: "Support Center", icon: "?" },
];

function ProfileAvatar({
  src,
  name,
  size = 44,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const initial = name.trim().charAt(0).toUpperCase() || "S";

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        flexShrink: 0,
        borderRadius: "50%",
        overflow: "hidden",
        border: "2px solid #3b82f6",
        background: "#202b40",
        display: "grid",
        placeItems: "center",
        color: "#ffffff",
        fontSize: size * 0.42,
        fontWeight: 700,
      }}
    >
      {src && !imageFailed ? (
        <img
          key={src}
          src={src}
          alt="Staff profile"
          onError={() => setImageFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      ) : (
        initial
      )}
    </div>
  );
}

export default function StaffDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] =
    useState<MenuKey>("overview");

  const [profile, setProfile] =
    useState<StaffProfile | null>(null);

  const [superAdmin, setSuperAdmin] =
    useState<SuperAdminProfile | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  const [selectedTask, setSelectedTask] =
    useState<SelectedTask | null>(null);

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  useEffect(() => {
    const checkScreen = () => {
      const desktop = window.innerWidth >= 1000;
      setIsDesktop(desktop);

      if (desktop) {
        setSidebarOpen(false);
      }
    };

    checkScreen();
    window.addEventListener("resize", checkScreen);

    return () => {
      window.removeEventListener("resize", checkScreen);
    };
  }, []);

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
        .select("first_name, surname, role, avatar_url, team_code")
        .eq("id", user.id)
        .single();

      if (!active) return;

      if (error || !data || data.role !== "staff") {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      const staffData: StaffProfile = data;

      setProfile(staffData);
      setFirstName(staffData.first_name || "");
      setSurname(staffData.surname || "");

      if (staffData.team_code) {
        const { data: saData, error: saError } = await supabase
          .from("profiles")
          .select("first_name, surname, team_code")
          .eq("role", "super_admin")
          .eq("team_code", staffData.team_code)
          .maybeSingle();

        if (!active) return;

        if (saError) {
          console.error(
            "Super Admin lookup error:",
            saError.message
          );
        } else {
          setSuperAdmin(saData);
        }
      }

      if (active) setLoading(false);
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

  async function saveProfile(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setProfileMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfileMessage(
        "Session expired. Please login again."
      );
      setSaving(false);
      return;
    }

    const cleanFirstName = firstName.trim();
    const cleanSurname = surname.trim();

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: cleanFirstName,
        surname: cleanSurname,
      })
      .eq("id", user.id);

    if (error) {
      setProfileMessage(
        "Profile save nahi hua: " + error.message
      );
    } else {
      setProfile((previous) =>
        previous
          ? {
              ...previous,
              first_name: cleanFirstName,
              surname: cleanSurname,
            }
          : previous
      );

      setProfileMessage(
        "Profile successfully update ho gaya."
      );
    }

    setSaving(false);
  }

  async function uploadPicture(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setProfileMessage("");

    if (!file.type.startsWith("image/")) {
      setProfileMessage("Sirf image file select karein.");
      event.target.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setProfileMessage(
        "Picture ka size 4 MB se kam hona chahiye."
      );
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Session expired. Please login again."
        );
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath =
        `${user.id}/profile-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const imageUrl = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: imageUrl,
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((previous) =>
        previous
          ? {
              ...previous,
              avatar_url: imageUrl,
            }
          : previous
      );

      setProfileMessage(
        "Profile picture successfully update ho gayi."
      );
    } catch (error) {
      setProfileMessage(
        error instanceof Error
          ? error.message
          : "Picture upload nahi hui."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingLogo}>WIN</div>
          <p>Loading Staff Portal...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const fullName =
    `${profile.first_name || ""} ${profile.surname || ""}`.trim() ||
    "Staff Member";

  const superAdminName =
    `${superAdmin?.first_name || ""} ${superAdmin?.surname || ""}`.trim();

  function openMenu(menu: MenuKey) {
    setActiveMenu(menu);
    setSidebarOpen(false);
  }

  function renderContent() {
    switch (activeMenu) {
      case "overview":
        return (
          <StaffOverview
            profile={profile}
            superAdmin={superAdmin}
          />
        );

      case "tasks":
        return (
          <AvailableWorkTasks
            onSelectTask={(task) => {
              setSelectedTask(task);
              setActiveMenu("submit");
            }}
          />
        );

      case "submit":
        return (
          <SubmitWork
            selectedTask={selectedTask}
            onBackToTasks={() => setActiveMenu("tasks")}
          />
        );

      case "earnings":
        return <MyEarnings />;

      case "notifications":
        return <Notifications />;

      case "profile":
        return (
          <div style={styles.contentStack}>
            <MyProfile
              profile={profile}
              superAdmin={superAdmin}
            />

            <section style={styles.contentCard}>
              <div style={styles.cardHeading}>
                <div>
                  <span style={styles.eyebrow}>
                    ACCOUNT SETTINGS
                  </span>
                  <h2 style={styles.sectionTitle}>
                    Edit Profile
                  </h2>
                  <p style={styles.muted}>
                    Apni personal information aur profile
                    picture update karein.
                  </p>
                </div>
              </div>

              <div style={styles.profilePictureArea}>
                <ProfileAvatar
                  src={profile.avatar_url}
                  name={fullName}
                  size={105}
                />

                <div>
                  <label style={styles.uploadButton}>
                    {uploading
                      ? "Uploading..."
                      : "Change Profile Picture"}

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={uploadPicture}
                      disabled={uploading}
                      style={{ display: "none" }}
                    />
                  </label>

                  <p style={styles.muted}>
                    JPG, PNG ya WebP. Maximum 4 MB.
                  </p>
                </div>
              </div>

              <form onSubmit={saveProfile}>
                <label style={styles.fieldLabel}>
                  First Name
                </label>

                <input
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  required
                  style={styles.input}
                  placeholder="First Name"
                />

                <label style={styles.fieldLabel}>
                  Surname
                </label>

                <input
                  value={surname}
                  onChange={(event) =>
                    setSurname(event.target.value)
                  }
                  required
                  style={styles.input}
                  placeholder="Surname"
                />

                <div style={styles.infoRow}>
                  <span>Account Role</span>
                  <strong>Staff</strong>
                </div>

                <div style={styles.infoRow}>
                  <span>Super Admin</span>
                  <strong>
                    {superAdminName || "Not available"}
                  </strong>
                </div>

                <div style={styles.infoRow}>
                  <span>Team Code</span>
                  <strong>
                    {superAdmin?.team_code || "Not available"}
                  </strong>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    ...styles.saveButton,
                    opacity: saving ? 0.65 : 1,
                  }}
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </form>

              {profileMessage && (
                <p style={styles.message}>
                  {profileMessage}
                </p>
              )}
            </section>
          </div>
        );

      case "support":
        return <Support />;

      default:
        return (
          <StaffOverview
            profile={profile}
            superAdmin={superAdmin}
          />
        );
    }
  }

  return (
    <div style={styles.layout}>
      {sidebarOpen && !isDesktop && (
        <div
          style={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        style={{
          ...styles.sidebar,
          transform:
            isDesktop || sidebarOpen
              ? "translateX(0)"
              : "translateX(-100%)",
        }}
      >
        <div style={styles.brand}>
          <div style={styles.brandMark}>W</div>
          <div>
            <h2 style={styles.brandTitle}>WIN GROUP</h2>
            <p style={styles.brandSubtitle}>
              WOLF INDEPENDENT NATIONAL GROUP
            </p>
          </div>
        </div>

        <div style={styles.userBox}>
          <ProfileAvatar
            src={profile.avatar_url}
            name={fullName}
            size={46}
          />

          <div style={{ minWidth: 0 }}>
            <strong style={styles.userName}>
              {fullName}
            </strong>
            <p style={styles.userRole}>Staff Member</p>
            <span style={styles.onlineStatus}>
              <span style={styles.onlineDot} />
              Account Active
            </span>
          </div>
        </div>

        <p style={styles.menuHeading}>WORKSPACE MENU</p>

        <nav style={styles.navigation}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => openMenu(item.id)}
              style={{
                ...styles.menuButton,
                ...(activeMenu === item.id
                  ? styles.activeMenuButton
                  : {}),
              }}
            >
              <span style={styles.menuIcon}>
                {item.icon}
              </span>

              <span>{item.label}</span>

              {activeMenu === item.id && (
                <span style={styles.activeIndicator} />
              )}
            </button>
          ))}
        </nav>

        <div style={styles.sidebarBottom}>
          <div style={styles.sidebarHelp}>
            <span style={styles.helpIcon}>?</span>
            <div>
              <strong>Need Help?</strong>
              <p>Contact your support team</p>
            </div>
          </div>

          <button
            onClick={logout}
            style={styles.logoutButton}
          >
            <span>↪</span>
            Logout
          </button>

          <p style={styles.sidebarFooter}>
            WIN GROUP STAFF PORTAL
          </p>
        </div>
      </aside>

      <main
        style={{
          ...styles.main,
          marginLeft: isDesktop ? 280 : 0,
        }}
      >
        <header style={styles.topbar}>
          <div style={styles.headerLeft}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={styles.hamburger}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>

            <div style={styles.headerPage}>
              <strong style={styles.topbarTitle}>
                {menuItems.find(
                  (item) => item.id === activeMenu
                )?.label || "Dashboard"}
              </strong>

              <p style={styles.topbarSubtitle}>
                WIN GROUP / STAFF WORKSPACE
              </p>
            </div>
          </div>

          <div style={styles.topbarRight}>
            <div style={styles.portalLabel}>
              <span style={styles.onlineDot} />
              Staff Portal
            </div>

            <div style={styles.topbarUser}>
              <ProfileAvatar
                src={profile.avatar_url}
                name={fullName}
                size={40}
              />

              <div style={styles.topbarUserDetails}>
                <strong style={styles.topbarName}>
                  {fullName}
                </strong>
                <span style={styles.topbarRole}>
                  Staff Member
                </span>
              </div>
            </div>

            <button
              onClick={() => openMenu("profile")}
              style={styles.editButton}
            >
              Edit Profile
            </button>
          </div>
        </header>

        <div style={styles.superAdminBar}>
          <div>
            <span style={styles.barLabel}>SUPERVISOR</span>
            <strong>
              {superAdminName || "Not available"}
            </strong>
          </div>

          <div>
            <span style={styles.barLabel}>TEAM CODE</span>
            <strong>
              {superAdmin?.team_code || "Not available"}
            </strong>
          </div>
        </div>

        <div style={styles.pageContent}>
          {renderContent()}
        </div>

        <footer style={styles.footer}>
          <span>WIN GROUP STAFF PORTAL</span>
          <span>Staff Workspace</span>
        </footer>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: "100vh",
    background: "#0b1020",
    color: "#eef2ff",
    fontFamily: "Arial, sans-serif",
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0b1020",
    color: "#ffffff",
  },

  loadingContent: {
    textAlign: "center",
    color: "#aab5ca",
  },

  loadingLogo: {
    width: 60,
    height: 60,
    margin: "0 auto",
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "#1d4ed8",
    color: "white",
    fontSize: 24,
    fontWeight: 800,
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    zIndex: 40,
  },

  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 50,
    width: 280,
    maxWidth: "85vw",
    background: "#10182b",
    borderRight: "1px solid #26334c",
    padding: "22px 17px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    transition: "transform 0.25s ease",
  },

  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "4px 5px 24px",
    borderBottom: "1px solid #27344c",
  },

  brandMark: {
    width: 43,
    height: 43,
    minWidth: 43,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg,#2563eb,#1e40af)",
    color: "#ffffff",
    fontSize: 24,
    fontWeight: 800,
  },

  brandTitle: {
    margin: 0,
    fontSize: 19,
    letterSpacing: 1.5,
    color: "#ffffff",
  },

  brandSubtitle: {
    fontSize: 8,
    letterSpacing: 0.7,
    color: "#8190aa",
    margin: "5px 0 0",
  },

  userBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "22px 5px",
    borderBottom: "1px solid #27344c",
  },

  userName: {
    display: "block",
    color: "#ffffff",
    fontSize: 14,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  userRole: {
    color: "#8d9bb3",
    fontSize: 12,
    margin: "5px 0",
  },

  onlineStatus: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 10,
    color: "#80d6a7",
  },

  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: "50%",
    display: "inline-block",
    background: "#22c55e",
    boxShadow: "0 0 8px rgba(34,197,94,.45)",
  },

  menuHeading: {
    color: "#71819d",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.6,
    margin: "25px 8px 12px",
  },

  navigation: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
  },

  menuButton: {
    position: "relative",
    width: "100%",
    padding: "13px 12px",
    display: "flex",
    alignItems: "center",
    gap: 12,
    border: "1px solid transparent",
    borderRadius: 9,
    background: "transparent",
    color: "#aebbd0",
    textAlign: "left",
    fontSize: 13,
    cursor: "pointer",
  },

  activeMenuButton: {
    background: "#1b3157",
    border: "1px solid #315a9b",
    color: "#ffffff",
    fontWeight: 700,
  },

  menuIcon: {
    width: 23,
    height: 23,
    display: "grid",
    placeItems: "center",
    borderRadius: 6,
    background: "#202c43",
    color: "#8eb7ff",
    fontSize: 17,
  },

  activeIndicator: {
    position: "absolute",
    right: 0,
    top: 9,
    bottom: 9,
    width: 3,
    borderRadius: 5,
    background: "#3b82f6",
  },

  sidebarBottom: {
    marginTop: 25,
  },

  sidebarHelp: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 15,
    border: "1px solid #2c3e5c",
    borderRadius: 9,
    background: "#142139",
  },

  helpIcon: {
    width: 29,
    height: 29,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "#203e70",
    color: "#9ec2ff",
    fontWeight: 700,
  },

  sidebarHelp: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 15,
    border: "1px solid #2c3e5c",
    borderRadius: 9,
    background: "#142139",
  },

  logoutButton: {
    width: "100%",
    padding: 12,
    border: "1px solid #633b49",
    borderRadius: 8,
    background: "#321d2a",
    color: "#ffb6c5",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    gap: 10,
    alignItems: "center",
  },

  sidebarFooter: {
    textAlign: "center",
    color: "#5f6f89",
    fontSize: 9,
    letterSpacing: 1,
    margin: "18px 0 0",
  },

  main: {
    minHeight: "100vh",
    width: "auto",
    transition: "margin-left 0.25s ease",
    boxSizing: "border-box",
  },

  topbar: {
    minHeight: 82,
    boxSizing: "border-box",
    background: "#111a2d",
    borderBottom: "1px solid #27344c",
    padding: "13px 22px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    flexWrap: "wrap",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 13,
  },

  hamburger: {
    width: 40,
    height: 39,
    flexShrink: 0,
    border: "1px solid #344663",
    background: "#1a2943",
    color: "#ffffff",
    borderRadius: 8,
    fontSize: 20,
    cursor: "pointer",
  },

  headerPage: {
    minWidth: 0,
  },

  topbarTitle: {
    color: "#ffffff",
    fontSize: 15,
  },

  topbarSubtitle: {
    color: "#71819d",
    fontSize: 9,
    letterSpacing: 1,
    margin: "5px 0 0",
  },

  topbarRight: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 15,
    flexWrap: "wrap",
  },

  portalLabel: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    color: "#9db1d0",
    fontSize: 12,
    fontWeight: 700,
  },

  topbarUser: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    minWidth: 0,
  },

  topbarUserDetails: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },

  topbarName: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },

  topbarRole: {
    color: "#8190aa",
    fontSize: 10,
  },

  editButton: {
    padding: "10px 13px",
    border: "1px solid #315a9b",
    borderRadius: 8,
    background: "#1b3157",
    color: "#dceaff",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
  },

  superAdminBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "10px 30px",
    padding: "13px 23px",
    background: "#0e1728",
    borderBottom: "1px solid #27344c",
    color: "#d1d9e8",
    fontSize: 12,
  },

  barLabel: {
    color: "#71819d",
    fontSize: 9,
    letterSpacing: 1,
    marginRight: 9,
  },

  pageContent: {
    padding: 22,
    maxWidth: 1500,
    margin: "0 auto",
    boxSizing: "border-box",
  },

  contentStack: {
    display: "grid",
    gap: 20,
  },

  contentCard: {
    background: "#111a2d",
    padding: 25,
    borderRadius: 13,
    border: "1px solid #293b58",
    boxShadow: "0 8px 25px rgba(0,0,0,0.16)",
    boxSizing: "border-box",
  },

  cardHeading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
  },

  eyebrow: {
    color: "#6fa5ff",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1.5,
  },

  sectionTitle: {
    margin: "9px 0",
    color: "#ffffff",
    fontSize: 22,
  },

  muted: {
    color: "#8e9db5",
    fontSize: 13,
    lineHeight: 1.6,
  },

  profilePictureArea: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    padding: "22px 0",
    margin: "12px 0",
    borderTop: "1px solid #293b58",
    borderBottom: "1px solid #293b58",
  },

  uploadButton: {
    display: "inline-block",
    padding: "11px 16px",
    background: "#1b3157",
    border: "1px solid #315a9b",
    borderRadius: 8,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  },

  fieldLabel: {
    display: "block",
    marginTop: 17,
    marginBottom: 8,
    color: "#c7d3e7",
    fontSize: 12,
    fontWeight: 700,
  },

  input: {
    width: "100%",
    maxWidth: 500,
    boxSizing: "border-box",
    padding: 13,
    background: "#0c1424",
    border: "1px solid #344663",
    borderRadius: 8,
    color: "#ffffff",
    outline: "none",
    fontSize: 14,
  },

  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    maxWidth: 500,
    padding: "16px 0",
    marginTop: 8,
    borderBottom: "1px solid #293b58",
    color: "#8e9db5",
    fontSize: 13,
  },

  saveButton: {
    marginTop: 20,
    padding: "12px 23px",
    border: "1px solid #3b82f6",
    borderRadius: 8,
    background: "linear-gradient(110deg,#2563eb,#1d4ed8)",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },

  message: {
    color: "#a8c8ff",
    fontSize: 13,
    marginTop: 15,
  },

  footer: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    padding: "18px 23px",
    borderTop: "1px solid #27344c",
    color: "#62728d",
    fontSize: 10,
    letterSpacing: 0.8,
  },
};
