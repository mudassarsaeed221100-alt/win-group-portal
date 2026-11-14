
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState({
    first_name: "",
    surname: "",
    email: "",
    username: "",
    team_code: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        setMessage("Login session nahi mili.");
        setLoading(false);
        return;
      }

      const { data: details, error } = await supabase
        .from("profiles")
        .select("first_name, surname, email, username, team_code")
        .eq("id", data.user.id)
        .single();

      if (error) {
        setMessage("Profile load nahi ho saki: " + error.message);
      } else {
        setProfile({
          first_name: details.first_name || "",
          surname: details.surname || "",
          email: details.email || data.user.email || "",
          username: details.username || "",
          team_code: details.team_code || "",
        });
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      setMessage("Login session nahi mili.");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name.trim(),
        surname: profile.surname.trim(),
      })
      .eq("id", data.user.id);

    setMessage(
      error ? "Profile save nahi hui: " + error.message : "Profile successfully update ho gayi."
    );

    setSaving(false);
  }

  async function changePassword() {
    setMessage("");

    if (newPassword.length < 6) {
      setMessage("Password kam az kam 6 characters ka hona chahiye.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Dono passwords match nahi karte.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage("Password change nahi hua: " + error.message);
    } else {
      setMessage("Password successfully change ho gaya.");
      setNewPassword("");
      setConfirmPassword("");
    }

    setSaving(false);
  }

  if (loading) {
    return <div style={{ padding: 25 }}>Profile load ho rahi hai...</div>;
  }

  const inputStyle = {
    width: "100%",
    padding: "12px",
    border: "1px solid #dbe2ea",
    borderRadius: "8px",
    marginTop: "6px",
    boxSizing: "border-box" as const,
    fontSize: "14px",
  };

  const cardStyle = {
    background: "white",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "22px",
    marginBottom: "20px",
  };

  const buttonStyle = {
    background: "#172554",
    color: "white",
    padding: "11px 18px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    marginTop: "15px",
  };

  return (
    <div style={{ color: "#172033", width: "100%" }}>
      <h1 style={{ fontSize: "25px", marginBottom: "6px" }}>
        Profile & Account Settings
      </h1>
      <p style={{ color: "#64748b", marginBottom: "22px" }}>
        Apni personal information aur account settings manage karein.
      </p>

      {message && (
        <div
          style={{
            padding: "12px",
            background: "#f1f5f9",
            borderRadius: "8px",
            marginBottom: "18px",
            fontSize: "14px",
          }}
        >
          {message}
        </div>
      )}

      <div style={cardStyle}>
        <h2 style={{ fontSize: "18px", marginTop: 0 }}>
          Personal Information
        </h2>

        <label>First Name</label>
        <input
          style={inputStyle}
          value={profile.first_name}
          onChange={(e) =>
            setProfile({ ...profile, first_name: e.target.value })
          }
        />

        <label style={{ display: "block", marginTop: "15px" }}>
          Surname
        </label>
        <input
          style={inputStyle}
          value={profile.surname}
          onChange={(e) =>
            setProfile({ ...profile, surname: e.target.value })
          }
        />

        <label style={{ display: "block", marginTop: "15px" }}>
          Email
        </label>
        <input
          style={{ ...inputStyle, background: "#f1f5f9" }}
          value={profile.email}
          readOnly
        />

        <label style={{ display: "block", marginTop: "15px" }}>
          Username
        </label>
        <input
          style={{ ...inputStyle, background: "#f1f5f9" }}
          value={profile.username}
          readOnly
        />

        <label style={{ display: "block", marginTop: "15px" }}>
          Team Code
        </label>
        <input
          style={{ ...inputStyle, background: "#f1f5f9" }}
          value={profile.team_code}
          readOnly
        />

        <button
          style={buttonStyle}
          onClick={saveProfile}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: "18px", marginTop: 0 }}>
          Change Password
        </h2>

        <label>New Password</label>
        <input
          type="password"
          style={inputStyle}
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <label style={{ display: "block", marginTop: "15px" }}>
          Confirm New Password
        </label>
        <input
          type="password"
          style={inputStyle}
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button
          style={buttonStyle}
          onClick={changePassword}
          disabled={saving}
        >
          {saving ? "Please Wait..." : "Update Password"}
        </button>
      </div>
    </div>
  );
}
