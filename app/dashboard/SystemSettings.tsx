
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
};

export default function SystemSettings() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        setError(error.message);
      } else if (data) {
        setSettings({
          company_name: data.company_name || "",
          logo_url: data.logo_url || "",
          contact_email: data.contact_email || "",
          contact_phone: data.contact_phone || "",
          address: data.address || "",
          currency: data.currency || "PKR",
          timezone: data.timezone || "Asia/Karachi",
          maintenance_mode: data.maintenance_mode ?? false,
        });
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

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

    setSaving(true);
    setMessage("");
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Your session could not be verified. Please log in again.");
      setSaving(false);
      return;
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
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (saveError) {
      setError(saveError.message);
    } else {
      setMessage("System settings successfully saved.");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="loading">
        Loading System Settings...
        <style jsx>{`
          .loading {
            padding: 35px;
            color: #ccc;
            background: #191919;
            border: 1px solid #383838;
            border-radius: 10px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="intro">
        <div>
          <span className="eyebrow">FOUNDER CONTROL CENTER</span>
          <h2>System Settings</h2>
          <p>Manage your organization's main system configuration.</p>
        </div>
        <div className="status">FOUNDER ACCESS</div>
      </div>

      {message && <div className="success">{message}</div>}
      {error && <div className="error">{error}</div>}

      <form onSubmit={saveSettings}>
        <section className="card">
          <div className="section-heading">
            <span>01</span>
            <div>
              <h3>Company Information</h3>
              <p>Basic organization details.</p>
            </div>
          </div>

          <div className="field">
            <label>Company Name *</label>
            <input
              value={settings.company_name}
              onChange={(e) =>
                updateField("company_name", e.target.value)
              }
              placeholder="WIN GROUP"
              required
            />
          </div>

          <div className="field">
            <label>Company Logo URL</label>
            <input
              value={settings.logo_url}
              onChange={(e) =>
                updateField("logo_url", e.target.value)
              }
              placeholder="https://example.com/logo.png"
            />
            <small>Abhi image URL supported hai; direct file upload baad mein add karenge.</small>
          </div>

          {settings.logo_url && (
            <div className="logo-preview">
              <span>Logo Preview</span>
              <img
                src={settings.logo_url}
                alt="Company logo preview"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
        </section>

        <section className="card">
          <div className="section-heading">
            <span>02</span>
            <div>
              <h3>Contact Information</h3>
              <p>Official company contact details.</p>
            </div>
          </div>

          <div className="field">
            <label>Contact Email</label>
            <input
              type="email"
              value={settings.contact_email}
              onChange={(e) =>
                updateField("contact_email", e.target.value)
              }
              placeholder="company@example.com"
            />
          </div>

          <div className="field">
            <label>Contact Phone</label>
            <input
              value={settings.contact_phone}
              onChange={(e) =>
                updateField("contact_phone", e.target.value)
              }
              placeholder="03XXXXXXXXX"
            />
          </div>

          <div className="field">
            <label>Company Address</label>
            <textarea
              value={settings.address}
              onChange={(e) =>
                updateField("address", e.target.value)
              }
              placeholder="Enter company address"
              rows={3}
            />
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <span>03</span>
            <div>
              <h3>Regional Settings</h3>
              <p>Currency and system time zone.</p>
            </div>
          </div>

          <div className="field">
            <label>Currency</label>
            <select
              value={settings.currency}
              onChange={(e) =>
                updateField("currency", e.target.value)
              }
            >
              <option value="PKR">PKR - Pakistani Rupee</option>
              <option value="USD">USD - US Dollar</option>
              <option value="AED">AED - UAE Dirham</option>
              <option value="SAR">SAR - Saudi Riyal</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>

          <div className="field">
            <label>Time Zone</label>
            <select
              value={settings.timezone}
              onChange={(e) =>
                updateField("timezone", e.target.value)
              }
            >
              <option value="Asia/Karachi">Pakistan - Karachi</option>
              <option value="Asia/Dubai">UAE - Dubai</option>
              <option value="Asia/Riyadh">Saudi Arabia - Riyadh</option>
              <option value="Europe/London">United Kingdom - London</option>
              <option value="America/New_York">USA - New York</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <span>04</span>
            <div>
              <h3>System Control</h3>
              <p>Maintenance mode configuration.</p>
            </div>
          </div>

          <div className="maintenance">
            <div>
              <strong>Maintenance Mode</strong>
              <p>
                This setting is saved in the database. It does not yet
                automatically block user access.
              </p>
            </div>

            <label className="switch">
              <input
                type="checkbox"
                checked={settings.maintenance_mode}
                onChange={(e) =>
                  updateField("maintenance_mode", e.target.checked)
                }
              />
              <span className="slider" />
            </label>
          </div>

          <div className="mode-status">
            Current status:{" "}
            <strong>
              {settings.maintenance_mode ? "Enabled" : "Disabled"}
            </strong>
          </div>
        </section>

        <div className="actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save System Settings"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .settings-page {
          color: #eee;
          padding-top: 25px;
          padding-bottom: 30px;
        }

        .intro {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 22px;
        }

        .eyebrow {
          color: #999;
          font-size: 9px;
          letter-spacing: 2px;
        }

        .intro h2 {
          color: white;
          font-size: 23px;
          margin: 8px 0;
        }

        .intro p, .section-heading p {
          color: #999;
          font-size: 11px;
          margin: 0;
        }

        .status {
          color: #ddd;
          border: 1px solid #555;
          padding: 8px 11px;
          border-radius: 5px;
          font-size: 9px;
          letter-spacing: 1px;
        }

        .card {
          background: linear-gradient(145deg,#202020,#171717);
          border: 1px solid #383838;
          border-radius: 9px;
          padding: 22px;
          margin-bottom: 17px;
        }

        .section-heading {
          display: flex;
          gap: 13px;
          align-items: center;
          padding-bottom: 17px;
          margin-bottom: 18px;
          border-bottom: 1px solid #383838;
        }

        .section-heading > span {
          color: #ddd;
          border: 1px solid #555;
          border-radius: 6px;
          padding: 8px;
          font-size: 11px;
        }

        .section-heading h3 {
          color: white;
          margin: 0 0 5px;
          font-size: 14px;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 17px;
        }

        .field:last-child { margin-bottom: 0; }

        .field label {
          color: #ddd;
          font-size: 11px;
          font-weight: bold;
        }

        .field input, .field textarea, .field select {
          width: 100%;
          background: #101010;
          border: 1px solid #484848;
          border-radius: 6px;
          padding: 12px;
          color: white;
          font-size: 12px;
          outline: none;
        }

        .field input:focus, .field textarea:focus, .field select:focus {
          border-color: #aaa;
        }

        .field small {
          color: #888;
          font-size: 10px;
        }

        .logo-preview {
          display: flex;
          align-items: center;
          gap: 15px;
          color: #aaa;
          font-size: 11px;
        }

        .logo-preview img {
          max-width: 100px;
          max-height: 65px;
          object-fit: contain;
          background: white;
          padding: 5px;
          border-radius: 5px;
        }

        .maintenance {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }

        .maintenance strong {
          color: white;
          font-size: 12px;
        }

        .maintenance p {
          color: #999;
          font-size: 10px;
          line-height: 1.6;
          max-width: 430px;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 45px;
          height: 24px;
          flex-shrink: 0;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          inset: 0;
          cursor: pointer;
          background: #555;
          border-radius: 20px;
          transition: .2s;
        }

        .slider:before {
          content: "";
          position: absolute;
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: .2s;
        }

        .switch input:checked + .slider {
          background: #888;
        }

        .switch input:checked + .slider:before {
          transform: translateX(21px);
        }

        .mode-status {
          margin-top: 13px;
          color: #999;
          font-size: 10px;
        }

        .mode-status strong { color: #ddd; }

        .actions {
          display: flex;
          justify-content: flex-end;
        }

        .actions button {
          background: #e4e4e4;
          color: #111;
          border: none;
          border-radius: 6px;
          padding: 13px 20px;
          font-weight: bold;
          font-size: 12px;
          cursor: pointer;
        }

        .actions button:hover { background: white; }
        .actions button:disabled { opacity: .6; cursor: not-allowed; }

        .success, .error {
          padding: 12px 14px;
          border-radius: 6px;
          margin-bottom: 16px;
          font-size: 12px;
        }

        .success {
          background: #173323;
          border: 1px solid #356747;
          color: #b9e7c8;
        }

        .error {
          background: #351919;
          border: 1px solid #754040;
          color: #ffc2c2;
          overflow-wrap: anywhere;
        }

        @media (max-width: 600px) {
          .intro { align-items: flex-start; flex-direction: column; }
          .card { padding: 16px; }
          .actions button { width: 100%; }
        }
      `}</style>
    </div>
  );
}
