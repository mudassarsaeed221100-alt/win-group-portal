
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProfileSettings() {
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        if (!token) {
          setMessage("Login session nahi mili. Dobara login karein.");
          setLoading(false);
          return;
        }

        const response = await fetch("/api/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Profile load nahi hui.");
        }

        setFirstName(result.profile?.first_name || "");
        setSurname(result.profile?.surname || "");
        setPhone(result.profile?.phone || "");
        setEmail(result.email || "");
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Kuch ghalat ho gaya."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Login session nahi mili.");
      }

      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: firstName.trim(),
          surname: surname.trim(),
          phone,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Profile save nahi hui.");
      }

      setMessage("Profile successfully update ho gayi.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Kuch ghalat ho gaya."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={styles.container}>Profile load ho rahi hai...</div>;
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Profile Edit</h1>
      <p style={styles.subtitle}>Apni personal profile details update karein.</p>

      <div style={styles.card}>
        <label style={styles.label}>First Name</label>
        <input
          style={styles.input}
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Apna first name likhein"
        />

        <label style={styles.label}>Surname</label>
        <input
          style={styles.input}
          value={surname}
          onChange={(e) => setSurname(e.target.value)}
          placeholder="Apna surname likhein"
        />

        <label style={styles.label}>Email Address</label>
        <input
          style={styles.input}
          value={email}
          readOnly
        />
        <small style={styles.note}>
          Email change ka option alag se verification ke sath banega.
        </small>

        <label style={styles.label}>WhatsApp Number</label>
        <input
          style={styles.input}
          value={phone}
          readOnly
        />
        <small style={styles.note}>
          Number change OTP verification ke baad hoga.
        </small>

        <button
          onClick={saveProfile}
          disabled={saving}
          style={styles.button}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>

        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    color: "#ffffff",
  },
  heading: {
    fontSize: "26px",
    marginBottom: "8px",
  },
  subtitle: {
    color: "#a5a5a5",
    marginBottom: "25px",
  },
  card: {
    maxWidth: "650px",
    background: "#171717",
    border: "1px solid #333333",
    borderRadius: "14px",
    padding: "25px",
  },
  label: {
    display: "block",
    marginTop: "18px",
    marginBottom: "8px",
    color: "#dddddd",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    borderRadius: "8px",
    border: "1px solid #444444",
    background: "#101010",
    color: "#ffffff",
    outline: "none",
    fontSize: "15px",
  },
  note: {
    display: "block",
    color: "#999999",
    marginTop: "6px",
  },
  button: {
    marginTop: "25px",
    padding: "13px 24px",
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  message: {
    marginTop: "18px",
    color: "#86efac",
  },
};
