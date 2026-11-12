
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Settings = {
  company_name: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  currency: string;
  timezone: string;
  maintenance_mode: boolean;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  backup_enabled?: boolean;
  backup_frequency?: string;
  session_timeout?: number;
  rate_limit?: number;
};

const defaultSettings: Settings = {
  company_name: "WIN GROUP",
  logo_url: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  currency: "PKR",
  timezone: "Asia/Karachi",
  maintenance_mode: false,
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  backup_enabled: false,
  backup_frequency: "daily",
  session_timeout: 30,
  rate_limit: 100,
};

export default function SystemSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  /* ── Load Settings ── */
  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from("system_settings")
          .select("*")
          .eq("id", 1)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setSettings({
            company_name: data.company_name || "WIN GROUP",
            logo_url: data.logo_url || "",
            contact_email: data.contact_email || "",
            contact_phone: data.contact_phone || "",
            address: data.address || "",
            currency: data.currency || "PKR",
            timezone: data.timezone || "Asia/Karachi",
            maintenance_mode: data.maintenance_mode ?? false,
            smtp_host: data.smtp_host || "",
            smtp_port: data.smtp_port || 587,
            smtp_user: data.smtp_user || "",
            backup_enabled: data.backup_enabled ?? false,
            backup_frequency: data.backup_frequency || "daily",
            session_timeout: data.session_timeout || 30,
            rate_limit: data.rate_limit || 100,
          });

          if (data.updated_at) {
            setLastUpdated(
              new Date(data.updated_at).toLocaleString("en-PK", {
                dateStyle: "medium",
                timeStyle: "short",
              })
            );
          }

          if (data.updated_by) {
            const { data: userData } = await supabase
              .from("profiles")
              .select("first_name, surname")
              .eq("id", data.updated_by)
              .maybeSingle();

            if (userData) {
              setUpdatedBy(
                `${userData.first_name || ""} ${userData.surname || ""}`.trim() ||
                  "System"
              );
            }
          }
        }
      } catch (err: any) {
        setError(err.message || "Failed to load settings");
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  /* ── Update Field ── */
  function updateField<K extends keyof Settings>(
    field: K,
    value: Settings[K]
  ) {
    setSettings((previous) => ({
      ...previous,
      [field]: value,
    }));
    setMessage("");
    setError("");
  }

  /* ── Save Settings ── */
  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!settings.company_name.trim()) {
      setError("Company name is required.");
      return;
    }

    if (
      settings.logo_url.trim() &&
      !/^https?:\/\/.+/i.test(settings.logo_url.trim())
    ) {
      setError("Logo URL must start with http:// or https://");
      return;
    }

    if (settings.smtp_port && (settings.smtp_port < 1 || settings.smtp_port > 65535)) {
      setError("SMTP port must be between 1 and 65535.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.user) {
        throw new Error("Your session could not be verified. Please log in again.");
      }

      const { error: saveError } = await supabase
        .from("system_settings")
        .upsert(
          {
            id: 1,
            company_name: settings.company_name.trim(),
            logo_url: settings.logo_url.trim() || null,
            contact_email: settings.contact_email.trim() || null,
            contact_phone: settings.contact_phone.trim() || null,
            address: settings.address.trim() || null,
            currency: settings.currency,
            timezone: settings.timezone,
            maintenance_mode: settings.maintenance_mode,
            smtp_host: settings.smtp_host?.trim() || null,
            smtp_port: settings.smtp_port || null,
            smtp_user: settings.smtp_user?.trim() || null,
            backup_enabled: settings.backup_enabled,
            backup_frequency: settings.backup_frequency,
            session_timeout: settings.session_timeout,
            rate_limit: settings.rate_limit,
            updated_by: sessionData.session.user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

      if (saveError) throw saveError;

      setMessage("System settings successfully saved.");
      setLastUpdated(
        new Date().toLocaleString("en-PK", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      );
    } catch (err: any) {
      setError(err.message || "Failed to save settings");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
        Loading System Settings...
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
            FOUNDER CONTROL CENTER
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>System Settings</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
            Manage your organization's main system configuration.
          </p>
        </div>

        {/* ── System Info ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          {[
            { label: "Status", value: settings.maintenance_mode ? "🔧 Maintenance" : "✅ Active", color: settings.maintenance_mode ? "#f59e0b" : "#10b981" },
            { label: "Last Updated", value: lastUpdated || "—", color: "#3b82f6" },
            { label: "Updated By", value: updatedBy || "System", color: "#8b5cf6" },
            { label: "Currency", value: settings.currency, color: "#10b981" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#888" }}>{stat.label}</div>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: stat.color, marginTop: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      {message && (
        <div
          style={{
            padding: "12px 16px",
            background: "#064e3b",
            color: "#86efac",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          ✓ {message}
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "12px 16px",
            background: "#7f1d1d",
            color: "#fca5a5",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          ✕ {error}
        </div>
      )}

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          borderBottom: "1px solid #333",
          overflowX: "auto",
        }}
      >
        {[
          { id: "general", label: "General" },
          { id: "contact", label: "Contact" },
          { id: "regional", label: "Regional" },
          { id: "email", label: "Email" },
          { id: "backup", label: "Backup" },
          { id: "advanced", label: "Advanced" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 16px",
              background: activeTab === tab.id ? "#2563eb" : "transparent",
              color: activeTab === tab.id ? "#fff" : "#888",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #2563eb" : "none",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: activeTab === tab.id ? "bold" : "normal",
              whiteSpace: "nowrap",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Form ── */}
      <form onSubmit={saveSettings}>
        {/* ── General Tab ── */}
        {activeTab === "general" && (
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
                COMPANY INFORMATION
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Basic Organization Details</h3>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Company Name *
                </label>
                <input
                  value={settings.company_name}
                  onChange={(e) => updateField("company_name", e.target.value)}
                  placeholder="WIN GROUP"
                  required
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Company Logo URL
                </label>
                <input
                  value={settings.logo_url}
                  onChange={(e) => updateField("logo_url", e.target.value)}
                  placeholder="https://example.com/logo.png"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>
                  Image URL supported; direct file upload baad mein add karenge.
                </div>
              </div>

              {settings.logo_url && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                  <span style={{ fontSize: "11px", color: "#888" }}>Logo Preview:</span>
                  <img
                    src={settings.logo_url}
                    alt="Company logo"
                    style={{
                      maxWidth: "100px",
                      maxHeight: "60px",
                      objectFit: "contain",
                      background: "#fff",
                      padding: "4px",
                      borderRadius: "4px",
                    }}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Contact Tab ── */}
        {activeTab === "contact" && (
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
                CONTACT INFORMATION
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Official Company Contact Details</h3>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Contact Email
                </label>
                <input
                  type="email"
                  value={settings.contact_email}
                  onChange={(e) => updateField("contact_email", e.target.value)}
                  placeholder="company@example.com"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Contact Phone
                </label>
                <input
                  value={settings.contact_phone}
                  onChange={(e) => updateField("contact_phone", e.target.value)}
                  placeholder="03XXXXXXXXX"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Company Address
                </label>
                <textarea
                  value={settings.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="Enter company address"
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                    fontFamily: "Arial, sans-serif",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Regional Tab ── */}
        {activeTab === "regional" && (
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
                REGIONAL SETTINGS
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Currency and Time Zone</h3>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Currency
                </label>
                <select
                  value={settings.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                >
                  <option value="PKR">PKR - Pakistani Rupee</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Time Zone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => updateField("timezone", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                >
                  <option value="Asia/Karachi">Pakistan - Karachi</option>
                  <option value="Asia/Dubai">UAE - Dubai</option>
                  <option value="Asia/Riyadh">Saudi Arabia - Riyadh</option>
                  <option value="Europe/London">United Kingdom - London</option>
                  <option value="America/New_York">USA - New York</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ── Email Tab ── */}
        {activeTab === "email" && (
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
                EMAIL CONFIGURATION
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>SMTP Settings for Email Notifications</h3>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  SMTP Host
                </label>
                <input
                  value={settings.smtp_host || ""}
                  onChange={(e) => updateField("smtp_host", e.target.value)}
                  placeholder="smtp.gmail.com"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={settings.smtp_port || 587}
                  onChange={(e) => updateField("smtp_port", parseInt(e.target.value))}
                  placeholder="587"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  SMTP Username
                </label>
                <input
                  value={settings.smtp_user || ""}
                  onChange={(e) => updateField("smtp_user", e.target.value)}
                  placeholder="your-email@gmail.com"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Backup Tab ── */}
        {activeTab === "backup" && (
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
                BACKUP CONFIGURATION
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Automatic Backup Settings</h3>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", marginBottom: "4px" }}>
                    Enable Automatic Backups
                  </div>
                  <div style={{ fontSize: "11px", color: "#888" }}>
                    Automatically backup database and files
                  </div>
                </div>
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "45px",
                    height: "24px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.backup_enabled || false}
                    onChange={(e) => updateField("backup_enabled", e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: settings.backup_enabled ? "#10b981" : "#555",
                      borderRadius: "20px",
                      transition: "0.2s",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        height: "18px",
                        width: "18px",
                        left: settings.backup_enabled ? "24px" : "3px",
                        bottom: "3px",
                        background: "#fff",
                        borderRadius: "50%",
                        transition: "0.2s",
                      }}
                    />
                  </span>
                </label>
              </div>

              {settings.backup_enabled && (
                <div>
                  <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                    Backup Frequency
                  </label>
                  <select
                    value={settings.backup_frequency || "daily"}
                    onChange={(e) => updateField("backup_frequency", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      background: "#252525",
                      border: "1px solid #444",
                      borderRadius: "6px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  >
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Advanced Tab ── */}
        {activeTab === "advanced" && (
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
                ADVANCED SETTINGS
              </div>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>System Control & Limits</h3>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="1440"
                  value={settings.session_timeout || 30}
                  onChange={(e) => updateField("session_timeout", parseInt(e.target.value))}
                  placeholder="30"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>
                  Auto-logout after inactivity (5-1440 minutes)
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                  Rate Limit (requests/minute)
                </label>
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={settings.rate_limit || 100}
                  onChange={(e) => updateField("rate_limit", parseInt(e.target.value))}
                  placeholder="100"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "#252525",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>
                  API rate limiting (10-1000 requests/minute)
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #333" }}>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", marginBottom: "4px" }}>
                    🔧 Maintenance Mode
                  </div>
                  <div style={{ fontSize: "11px", color: "#888" }}>
                    Temporarily disable user access for maintenance
                  </div>
                </div>
                <label
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "45px",
                    height: "24px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={settings.maintenance_mode}
                    onChange={(e) => updateField("maintenance_mode", e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: settings.maintenance_mode ? "#f59e0b" : "#555",
                      borderRadius: "20px",
                      transition: "0.2s",
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        height: "18px",
                        width: "18px",
                        left: settings.maintenance_mode ? "24px" : "3px",
                        bottom: "3px",
                        background: "#fff",
                        borderRadius: "50%",
                        transition: "0.2s",
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── Save Button ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "10px 20px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "12px",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "💾 Save Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}

