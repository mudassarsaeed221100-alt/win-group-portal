
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
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
  avatar_url: string | null;
  team_code: string | null;
};

type SuperAdminProfile = {
  first_name: string | null;
  surname: string | null;
  team_code: string | null;
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
  const [superAdmin, setSuperAdmin] = useState<SuperAdminProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

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

      // Staff ke team_code se uska Super Admin find karein.
      if (staffData.team_code) {
        const { data: saData, error: saError } = await supabase
          .from("profiles")
          .select("first_name, surname, team_code")
          .eq("role", "super_admin")
          .eq("team_code", staffData.team_code)
          .maybeSingle();

        if (!active) return;

        if (saError) {
          console.error("Super Admin lookup error:", saError.message);
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

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setProfileMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setProfileMessage("Session expired. Please login again.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        surname: surname.trim(),
      })
      .eq("id", user.id);

    if (error) {
      setProfileMessage("Profile save nahi hua: " + error.message);
    } else {
      setProfile((previous) =>
        previous
          ? {
              ...previous,
              first_name: firstName.trim(),
              surname: surname.trim(),
            }
          : previous
      );
      setProfileMessage("Profile successfully update ho gaya.");
    }

    setSaving(false);
  }

  async function uploadPicture(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setProfileMessage("");

    if (!file.type.startsWith("image/")) {
      setProfileMessage("Sirf image file select karein.");
      event.target.value = "";
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setProfileMessage("Picture ka size 4 MB se kam hona chahiye.");
      event.target.value = "";
      return;
    }

    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Session expired. Please login again.");
      }

      const extension = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/profile-${Date.now()}.${extension}`;

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
        .update({ avatar_url: imageUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile((previous) =>
        previous ? { ...previous, avatar_url: imageUrl } : previous
      );

      setProfileMessage("Profile picture successfully update ho gayi.");
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "Picture upload nahi hui."
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  if (loading) {
    return <div style={styles.loading}>Loading Staff Portal...</div>;
  }

  if (!profile) return null;

  const fullName =
    `${profile.first_name || ""} ${profile.surname || ""}`.trim() ||
    "Staff Member";

  const superAdminName =
    `${superAdmin?.first_name || ""} ${superAdmin?.surname || ""}`.trim();

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
            <h2 style={styles.sectionTitle}>My Profile</h2>
            <p style={styles.muted}>
              Apni personal information aur profile picture manage karein.
            </p>

            <div style={styles.profilePictureArea}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  style={styles.profilePicture}
                />
              ) : (
                <div style={styles.profilePicturePlaceholder}>
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}

              <div>
                <label style={styles.uploadButton}>
                  {uploading ? "Uploading..." : "Change Picture"}
                  <input
                    type="file"
                    accept="image/*"
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
              <label style={styles.fieldLabel}>First Name</label>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
                style={styles.input}
                placeholder="First Name"
              />

              <label style={styles.fieldLabel}>Surname</label>
              <input
                value={surname}
                onChange={(event) => setSurname(event.target.value)}
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
                <strong>{superAdminName || "Not available"}</strong>
              </div>

              <div style={styles.infoRow}>
                <span>Team Code</span>
                <strong>{superAdmin?.team_code || "Not available"}</strong>
              </div>

              <button
                type="submit"
                disabled={saving}
                style={styles.saveButton}
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>

            {profileMessage && (
              <p style={styles.message}>{profileMessage}</p>
            )}
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
      {sidebarOpen && (
        <div
          style={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        style={{
          ...styles.sidebar,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <div style={styles.brand}>
          <h2 style={styles.brandTitle}>WIN GROUP</h2>
          <p style={styles.brandSubtitle}>
            WOLF INDEPENDENT NATIONAL GROUP
          </p>
        </div>

        <div style={styles.userBox}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              style={styles.sidebarAvatar}
            />
          ) : (
            <div style={styles.sidebarAvatarPlaceholder}>
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <strong style={styles.userName}>{fullName}</strong>
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
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          <div style={styles.brandHeader}>
            <strong style={styles.topbarTitle}>WIN GROUP</strong>
            <p style={styles.topbarSubtitle}>
              WOLF INDEPENDENT NATIONAL GROUP
            </p>
          </div>

          <div style={styles.topbarRight}>
            <span style={styles.portalLabel}>Staff Portal</span>

            <div style={styles.topbarUser}>
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  style={styles.topbarAvatar}
                />
              ) : (
                <div style={styles.topbarAvatarPlaceholder}>
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}

              <div style={styles.topbarUserDetails}>
                <strong style={styles.topbarName}>{fullName}</strong>
                <span style={styles.topbarRole}>Staff Member</span>
              </div>
            </div>

            <button
              onClick={() => setActiveMenu("profile")}
              style={styles.editButton}
            >
              Edit Profile
            </button>
          </div>
        </header>

        <div style={styles.superAdminBar}>
          <span>
            Super Admin: <strong>{superAdminName || "Not available"}</strong>
          </span>
          <span>
            Team Code: <strong>{superAdmin?.team_code || "Not available"}</strong>
          </span>
        </div>

        <div style={styles.pageContent}>{renderContent()}</div>
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
      <h2 style={styles.sectionTitle}>{title}</h2>
      <p style={styles.muted}>{description}</p>
      <div style={styles.statusBox}>
        {inactive
          ? "Task System Currently Inactive"
          : "Module Integration Pending"}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  layout: {
    minHeight: "100vh",
    background: "#090a0e",
    color: "#f4f4f5",
    fontFamily: "Arial, sans-serif",
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#090a0e",
    color: "white",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    zIndex: 20,
  },
  sidebar: {
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    zIndex: 30,
    width: 280,
    maxWidth: "85vw",
    background: "linear-gradient(160deg, #17191f, #090a0e)",
    borderRight: "1px solid #41434b",
    boxShadow: "8px 0 35px rgba(0,0,0,0.45)",
    padding: 20,
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    transition: "transform 0.25s ease",
  },
  brand: {
    padding: "12px 5px 22px",
    borderBottom: "1px solid #393b43",
  },
  brandTitle: {
    margin: 0,
    letterSpacing: 2,
    color: "#ffffff",
  },
  brandSubtitle: {
    fontSize: 9,
    letterSpacing: 1,
    color: "#a5a7b0",
    marginBottom: 0,
  },
  userBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "22px 5px",
    borderBottom: "1px solid #393b43",
  },
  sidebarAvatar: {
    width: 43,
    height: 43,
    minWidth: 43,
    minHeight: 43,
    flexShrink: 0,
    borderRadius: "50%",
    objectFit: "cover",
    display: "block",
    border: "2px solid #aeb2bd",
  },
  sidebarAvatarPlaceholder: {
    width: 43,
    height: 43,
    minWidth: 43,
    flexShrink: 0,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #777b87, #292b33)",
    display: "grid",
    placeItems: "center",
    fontSize: 19,
    fontWeight: "bold",
  },
  userName: {
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userRole: {
    color: "#a5a7b0",
    fontSize: 12,
    margin: "5px 0 0",
  },
  menuHeading: {
    color: "#9295a0",
    fontSize: 11,
    letterSpacing: 1.5,
    marginTop: 25,
  },
  navigation: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    marginTop: 10,
    flex: 1,
  },
  menuButton: {
    width: "100%",
    padding: "13px 12px",
    border: "1px solid transparent",
    borderRadius: 8,
    background: "transparent",
    color: "#d0d1d6",
    textAlign: "left",
    fontSize: 14,
    cursor: "pointer",
  },
  activeMenuButton: {
    background: "linear-gradient(110deg, #343740, #202229)",
    border: "1px solid #777b87",
    color: "white",
    fontWeight: "bold",
  },
  logoutButton: {
    padding: 12,
    border: "1px solid #5b3338",
    borderRadius: 8,
    background: "#351b20",
    color: "#ffb9bf",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: 20,
  },
  main: {
    minHeight: "100vh",
    width: "100%",
  },
  topbar: {
    minHeight: 82,
    boxSizing: "border-box",
    background: "#15161b",
    borderBottom: "1px solid #353740",
    padding: "12px 22px",
    display: "flex",
    alignItems: "center",
    gap: 15,
    flexWrap: "wrap",
  },
  hamburger: {
    width: 43,
    height: 40,
    flexShrink: 0,
    border: "1px solid #555965",
    background: "#24262d",
    color: "white",
    borderRadius: 8,
    fontSize: 22,
    cursor: "pointer",
  },
  brandHeader: {
    minWidth: 180,
  },
  topbarTitle: {
    letterSpacing: 1.5,
  },
  topbarSubtitle: {
    color: "#a5a7b0",
    fontSize: 10,
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
    color: "#c5c7ce",
    fontSize: 13,
    fontWeight: "bold",
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
    fontSize: 16,
    fontWeight: 400,
    whiteSpace: "nowrap",
  },
  topbarRole: {
    color: "#a5a7b0",
    fontSize: 11,
  },
  topbarAvatar: {
    width: 38,
    height: 38,
    minWidth: 38,
    minHeight: 38,
    flexShrink: 0,
    borderRadius: "50%",
    objectFit: "cover",
    display: "block",
    border: "2px solid #777b87",
  },
  topbarAvatarPlaceholder: {
    width: 38,
    height: 38,
    minWidth: 38,
    flexShrink: 0,
    borderRadius: "50%",
    background: "#555965",
    display: "grid",
    placeItems: "center",
  },
  editButton: {
    padding: "10px 14px",
    border: "1px solid #777b87",
    borderRadius: 8,
    background: "#292b33",
    color: "white",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: "bold",
  },
  superAdminBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: "10px 25px",
    padding: "12px 22px",
    background: "#101116",
    borderBottom: "1px solid #30323a",
    color: "#aeb1bb",
    fontSize: 12,
  },
  pageContent: {
    padding: 22,
    maxWidth: 1400,
    margin: "0 auto",
  },
  contentCard: {
    background: "linear-gradient(145deg, #1b1d24, #111217)",
    padding: 25,
    borderRadius: 14,
    border: "1px solid #41434b",
    boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
  },
  sectionTitle: {
    marginTop: 0,
    color: "#ffffff",
  },
  muted: {
    color: "#a5a7b0",
    fontSize: 14,
    lineHeight: 1.6,
  },
  statusBox: {
    marginTop: 25,
    padding: 18,
    background: "#252730",
    border: "1px solid #454853",
    borderRadius: 9,
    color: "#d1d3da",
    fontSize: 14,
  },
  profilePictureArea: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    padding: "20px 0",
    marginBottom: 15,
    borderBottom: "1px solid #41434b",
  },
  profilePicture: {
    width: 100,
    height: 100,
    minWidth: 100,
    minHeight: 100,
    flexShrink: 0,
    borderRadius: "50%",
    objectFit: "cover",
    display: "block",
    border: "3px solid #858995",
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    minWidth: 100,
    flexShrink: 0,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #777b87, #292b33)",
    display: "grid",
    placeItems: "center",
    fontSize: 38,
    fontWeight: "bold",
  },
  uploadButton: {
    display: "inline-block",
    padding: "11px 17px",
    background: "#343740",
    border: "1px solid #777b87",
    borderRadius: 8,
    color: "white",
    cursor: "pointer",
    fontSize: 13,
  },
  fieldLabel: {
    display: "block",
    marginTop: 17,
    marginBottom: 8,
    color: "#d7d8de",
    fontSize: 13,
  },
  input: {
    width: "100%",
    maxWidth: 500,
    boxSizing: "border-box",
    padding: 13,
    background: "#101116",
    border: "1px solid #4a4d57",
    borderRadius: 8,
    color: "white",
    outline: "none",
    fontSize: 14,
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    maxWidth: 500,
    padding: "17px 0",
    marginTop: 10,
    borderBottom: "1px solid #41434b",
  },
  saveButton: {
    marginTop: 20,
    padding: "12px 22px",
    border: "1px solid #888d99",
    borderRadius: 8,
    background: "linear-gradient(110deg, #555965, #292b33)",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
  message: {
    color: "#d5d7df",
    fontSize: 13,
    marginTop: 15,
  },
};
