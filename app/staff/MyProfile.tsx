
"use client";

import { useEffect, useState, ChangeEvent, type CSSProperties } from "react";
import { supabase } from "../../lib/supabase";

/* ───────── Types ───────── */

type ProfileData = {
  first_name: string | null;
  surname: string | null;
  role: string;
  avatar_url: string | null;
  team_code: string | null;
  created_at: string | null;
};

type SuperAdminProfile = {
  first_name: string | null;
  surname: string | null;
  team_code: string | null;
};

type Props = {
  profile: ProfileData;
  superAdmin: SuperAdminProfile | null;
  onProfileUpdate?: () => void;
};

/* ───────── Component ───────── */

export default function MyProfile({ profile, superAdmin, onProfileUpdate }: Props) {
  /* State */
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState(profile.first_name || "");
  const [surname, setSurname] = useState(profile.surname || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [avatarBroken, setAvatarBroken] = useState(false);

  /* Edit Mode */
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  /* Avatar Upload */
  const [uploading, setUploading] = useState(false);

  /* Password Change */
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState("");
  const [pwMessageType, setPwMessageType] = useState<"success" | "error">("success");

  const fullName = [firstName, surname].filter(Boolean).join(" ") || "Staff Member";

  const superAdminName = superAdmin
    ? [superAdmin.first_name, superAdmin.surname].filter(Boolean).join(" ")
    : "Not assigned";

  /* ── Fetch Email ── */
  useEffect(() => {
    async function getEmail() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setEmail(user.email);
    }
    getEmail();
  }, []);

  /* ── Sync props ── */
  useEffect(() => {
    setFirstName(profile.first_name || "");
    setSurname(profile.surname || "");
    setAvatarUrl(profile.avatar_url);
    setAvatarBroken(false);
  }, [profile]);

  /* ── Format Date ── */
  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-PK", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  /* ── Save Profile ── */
  async function handleSaveProfile() {
    if (!firstName.trim()) {
      setMessageType("error");
      setMessage("First name zaroori hai.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessageType("error");
      setMessage("Session expire ho gayi. Dobara login karein.");
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
      setMessageType("error");
      setMessage("Profile save nahi ho saka: " + error.message);
    } else {
      setMessageType("success");
      setMessage("Profile successfully update ho gaya!");
      setEditing(false);
      if (onProfileUpdate) onProfileUpdate();
    }

    setSaving(false);
  }

  /* ── Avatar Upload ── */
  async function handleAvatarUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setMessageType("error");
      setMessage("Sirf JPG, PNG ya WebP image upload kar sakte hain.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessageType("error");
      setMessage("Avatar image 2 MB se chhoti honi chahiye.");
      return;
    }

    setUploading(true);
    setMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expire ho gayi.");

      const filePath = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop()}`;

      /* Delete old avatar if exists */
      if (avatarUrl) {
        const oldPath = avatarUrl.split("/storage/v1/object/public/avatars/").pop()
          || avatarUrl.split("/storage/v1/object/sign/avatars/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      }

      /* Upload new avatar */
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw new Error("Upload failed: " + uploadError.message);

      /* Get signed URL for display */
      const { data: signedData, error: signError } = await supabase.storage
        .from("avatars")
        .createSignedUrl(filePath, 60 * 60 * 24 * 365); /* 1 year */

      if (signError || !signedData?.signedUrl) {
        throw new Error("Avatar URL nahi mil saka.");
      }

      /* Save avatar path to profiles table */
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: signedData.signedUrl })
        .eq("id", user.id);

      if (updateError) throw new Error("Avatar save nahi hua: " + updateError.message);

      setAvatarUrl(signedData.signedUrl);
      setAvatarBroken(false);
      setMessageType("success");
      setMessage("Profile picture successfully update ho gayi!");
      if (onProfileUpdate) onProfileUpdate();
    } catch (err) {
      setMessageType("error");
      setMessage(err instanceof Error ? err.message : "Avatar upload mein error aaya.");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  /* ── Password Change ── */
  async function handlePasswordChange() {
    setPwMessage("");

    if (!newPassword || newPassword.length < 8) {
      setPwMessageType("error");
      setPwMessage("Password kam se kam 8 characters ka hona chahiye.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwMessageType("error");
      setPwMessage("Dono passwords match nahi kar rahe.");
      return;
    }

    setPwSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPwMessageType("error");
      setPwMessage("Password change nahi hua: " + error.message);
    } else {
      setPwMessageType("success");
      setPwMessage("Password successfully change ho gaya!");
      setNewPassword("");
      setConfirmPassword("");
      setShowPassword(false);
    }

    setPwSaving(false);
  }

  /* ───────── Render ───────── */

  return (
    <div style={styles.card}>
      <div style={styles.smallTitle}>STAFF ACCOUNT</div>
      <h2 style={styles.heading}>My Profile</h2>

      {/* ── Avatar Section ── */}
      <div style={styles.avatarSection}>
        <div style={styles.avatarWrapper}>
          {avatarUrl && !avatarBroken ? (
            <img
              src={avatarUrl}
              alt="Profile"
              style={styles.avatarImg}
              onError={() => setAvatarBroken(true)}
            />
          ) : (
            <span style={styles.avatarInitial}>
              {fullName.charAt(0).toUpperCase()}
            </span>
          )}

          {/* Upload overlay */}
          <label style={styles.avatarOverlay} htmlFor="avatar-upload">
            {uploading ? "..." : "📷"}
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleAvatarUpload}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </div>

        <div>
          <div style={styles.profileName}>{fullName}</div>
          <div style={styles.profileRole}>Staff</div>
          {email && (
            <div style={styles.profileEmail}>{email}</div>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      {message && (
        <div
          style={{
            ...styles.msgBox,
            ...(messageType === "success" ? styles.successMsg : styles.errorMsg),
          }}
        >
          {message}
        </div>
      )}

      {/* ── Account Information ── */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Account Information</h3>
          {!editing ? (
            <button type="button" onClick={() => setEditing(true)} style={styles.editBtn}>
              ✏️ Edit
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleSaveProfile}
                disabled={saving}
                style={styles.saveBtn}
              >
                {saving ? "Saving..." : "💾 Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setFirstName(profile.first_name || "");
                  setSurname(profile.surname || "");
                }}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <>
            <div style={styles.row}>
              <div style={styles.rowLabel}>First Name</div>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={styles.input}
                disabled={saving}
              />
            </div>
            <div style={styles.row}>
              <div style={styles.rowLabel}>Surname</div>
              <input
                type="text"
                value={surname}
                onChange={(e) => setSurname(e.target.value)}
                style={styles.input}
                disabled={saving}
              />
            </div>
          </>
        ) : (
          <>
            <div style={styles.row}>
              <div style={styles.rowLabel}>First Name</div>
              <div>{firstName || "Not provided"}</div>
            </div>
            <div style={styles.row}>
              <div style={styles.rowLabel}>Surname</div>
              <div>{surname || "Not provided"}</div>
            </div>
          </>
        )}

        <div style={styles.row}>
          <div style={styles.rowLabel}>Email</div>
          <div>{email || "Loading..."}</div>
        </div>

        <div style={styles.row}>
          <div style={styles.rowLabel}>Role</div>
          <div>Staff</div>
        </div>

        <div style={styles.row}>
          <div style={styles.rowLabel}>Team Code</div>
          <div>{profile.team_code || "Not assigned"}</div>
        </div>

        {profile.created_at && (
          <div style={styles.row}>
            <div style={styles.rowLabel}>Joined</div>
            <div>{formatDate(profile.created_at)}</div>
          </div>
        )}
      </div>

      {/* ── Reporting Super Admin ── */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Reporting Super Admin</h3>

        <div style={styles.row}>
          <div style={styles.rowLabel}>Super Admin Name</div>
          <div>{superAdminName}</div>
        </div>

        <div style={styles.row}>
          <div style={styles.rowLabel}>Super Admin Team Code</div>
          <div>{superAdmin?.team_code || "Not assigned"}</div>
        </div>
      </div>

      {/* ── Password Change ── */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>Security</h3>
          {!showPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(true)}
              style={styles.editBtn}
            >
              🔒 Change Password
            </button>
          )}
        </div>

        {showPassword && (
          <>
            <div style={styles.row}>
              <div style={styles.rowLabel}>New Password</div>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                style={styles.input}
                disabled={pwSaving}
              />
            </div>

            <div style={styles.row}>
              <div style={styles.rowLabel}>Confirm Password</div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Same password dobara likhein"
                style={styles.input}
                disabled={pwSaving}
              />
            </div>

            {pwMessage && (
              <div
                style={{
                  ...styles.msgBox,
                  ...(pwMessageType === "success" ? styles.successMsg : styles.errorMsg),
                }}
              >
                {pwMessage}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button
                type="button"
                onClick={handlePasswordChange}
                disabled={pwSaving}
                style={{
                  ...styles.saveBtn,
                  opacity: pwSaving ? 0.6 : 1,
                }}
              >
                {pwSaving ? "Changing..." : "Update Password"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPassword(false);
                  setNewPassword("");
                  setConfirmPassword("");
                  setPwMessage("");
                }}
                style={styles.cancelBtn}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      <p style={styles.footer}>WIN GROUP Staff Profile</p>
    </div>
  );
}

/* ───────── Styles ───────── */

const styles: Record<string, CSSProperties> = {
  card: {
    background: "#17191d",
    border: "1px solid #30343b",
    borderRadius: 14,
    padding: 28,
    color: "#f1f3f5",
  },
  smallTitle: {
    fontSize: 13,
    color: "#aeb4bd",
    letterSpacing: 1,
  },
  heading: {
    fontSize: 24,
    margin: "10px 0 22px",
  },

  /* Avatar */
  avatarSection: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
  },
  avatarWrapper: {
    position: "relative",
    width: 86,
    height: 86,
    minWidth: 86,
    borderRadius: "50%",
    overflow: "hidden",
    background: "#343a44",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: 600,
    color: "#e0e1e5",
  },
  avatarOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    background: "rgba(0,0,0,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    fontSize: 14,
  },
  profileName: {
    fontSize: 19,
    fontWeight: 600,
  },
  profileRole: {
    color: "#aeb4bd",
    fontSize: 13,
    marginTop: 2,
  },
  profileEmail: {
    color: "#858995",
    fontSize: 12,
    marginTop: 4,
  },

  /* Section */
  section: {
    marginTop: 24,
    padding: 20,
    background: "#1b1d24",
    border: "1px solid #3a414b",
    borderRadius: 12,
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    margin: 0,
  },

  /* Rows */
  row: {
    padding: 14,
    background: "#22262d",
    border: "1px solid #363c46",
    borderRadius: 9,
    marginTop: 10,
  },
  rowLabel: {
    color: "#aeb4bd",
    fontSize: 12,
    marginBottom: 4,
  },

  /* Form */
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 10,
    background: "#2a2d35",
    color: "#f1f3f5",
    border: "1px solid #4a5060",
    borderRadius: 7,
    outline: "none",
    fontSize: 14,
  },

  /* Buttons */
  editBtn: {
    padding: "7px 14px",
    border: "1px solid #59616d",
    borderRadius: 7,
    background: "transparent",
    color: "#f1f3f5",
    cursor: "pointer",
    fontSize: 13,
  },
  saveBtn: {
    padding: "8px 18px",
    border: "none",
    borderRadius: 7,
    background: "#6ee7a0",
    color: "#111217",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  },
  cancelBtn: {
    padding: "8px 14px",
    border: "1px solid #59616d",
    borderRadius: 7,
    background: "transparent",
    color: "#f1f3f5",
    cursor: "pointer",
    fontSize: 13,
  },

  /* Messages */
  msgBox: {
    padding: 13,
    borderRadius: 8,
    marginTop: 14,
    fontSize: 14,
    lineHeight: 1.6,
  },
  successMsg: {
    background: "#1c3027",
    border: "1px solid #315b43",
    color: "#a8e6bf",
  },
  errorMsg: {
    background: "#2b2022",
    border: "1px solid #63383d",
    color: "#ffb4b4",
  },

  footer: {
    textAlign: "center",
    color: "#777b87",
    fontSize: 11,
    marginTop: 25,
  },
};

