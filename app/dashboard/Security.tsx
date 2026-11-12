
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type SecurityLog = {
  id: string;
  action: string;
  module: string;
  details: string | null;
  created_at: string;
};

type Session = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  user_agent: string | null;
  ip: string | null;
  tag: string | null;
  refreshed_at: string | null;
};

export default function Security() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [sessionStatus, setSessionStatus] = useState("Checking...");
  const [lastSignIn, setLastSignIn] = useState("");
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  /* ── Load Security Data ── */
  useEffect(() => {
    loadSecurityData();
  }, []);

  async function loadSecurityData() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      // Get current session
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (sessionData.session?.user) {
        const user = sessionData.session.user;
        setSessionStatus("Authenticated");
        setEmail(user.email || "Not available");
        setUserId(user.id);
        setLastSignIn(
          user.last_sign_in_at
            ? new Date(user.last_sign_in_at).toLocaleString("en-PK")
            : "Not available"
        );

        // Get sessions for this user
        const { data: sessionsData, error: sessionsError } = await supabase
          .from("sessions")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!sessionsError && sessionsData) {
          setSessions((sessionsData || []) as Session[]);
        }
      } else {
        setSessionStatus("No active session");
      }

      // Get security logs
      const { data: logData, error: logError } = await supabase
        .from("activity_logs")
        .select("id, action, module, details, created_at")
        .or("module.ilike.%security%,action.ilike.%login%,action.ilike.%logout%")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!logError && logData) {
        setLogs((logData || []) as SecurityLog[]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load security data");
    }

    setLoading(false);
  }

  /* ── Change Password ── */
  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setError("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    }

    setChangingPassword(false);
  }

  /* ── Logout Session ── */
  async function logoutSession(sessionId: string) {
    if (!window.confirm("Are you sure you want to logout this session?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", sessionId);

      if (error) throw error;

      setMessage("Session logged out successfully.");
      await loadSecurityData();
    } catch (err: any) {
      setError(err.message || "Failed to logout session");
    }
  }

  /* ── Pagination ── */
  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const paginatedLogs = logs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ── Format Date ── */
  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  /* ── Get Browser from User Agent ── */
  function getBrowserInfo(userAgent: string | null) {
    if (!userAgent) return "Unknown";
    if (userAgent.includes("Chrome")) return "Chrome";
    if (userAgent.includes("Firefox")) return "Firefox";
    if (userAgent.includes("Safari")) return "Safari";
    if (userAgent.includes("Edge")) return "Edge";
    return "Other";
  }

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
            ACCOUNT SECURITY
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Security Center</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
            Account session, security logs, and security settings.
          </p>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          {[
            { label: "Session Status", value: sessionStatus, color: sessionStatus === "Authenticated" ? "#10b981" : "#ef4444" },
            { label: "Active Sessions", value: sessions.length, color: "#3b82f6" },
            { label: "Security Logs", value: logs.length, color: "#8b5cf6" },
            { label: "Last Sign In", value: lastSignIn.split(",")[0] || "—", color: "#f59e0b" },
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
          {message}
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
          {error}
        </div>
      )}

      {/* ── Account Info ── */}
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
            ACCOUNT INFORMATION
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Your Account Details</h3>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          <div>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Account Email</div>
            <div style={{ fontSize: "14px", color: "#fff", fontWeight: "bold", wordBreak: "break-all" }}>
              {email || "Not available"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Last Sign In</div>
            <div style={{ fontSize: "14px", color: "#fff", fontWeight: "bold" }}>
              {lastSignIn || "Not available"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>User ID</div>
            <div style={{ fontSize: "12px", color: "#aaa", fontFamily: "monospace", wordBreak: "break-all" }}>
              {userId ? userId.slice(0, 16) + "..." : "Not available"}
            </div>
          </div>
        </div>
      </div>

      {/* ── Change Password ── */}
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
            PASSWORD MANAGEMENT
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Change Password</h3>
        </div>

        {!showPasswordForm ? (
          <button
            onClick={() => setShowPasswordForm(true)}
            style={{
              padding: "10px 16px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            🔐 Change Password
          </button>
        ) : (
          <form onSubmit={handleChangePassword} style={{ display: "grid", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Current Password *
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
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
                New Password *
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 8 characters)"
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
                Confirm Password *
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
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

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="submit"
                disabled={changingPassword}
                style={{
                  padding: "10px 16px",
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "12px",
                  opacity: changingPassword ? 0.6 : 1,
                }}
              >
                {changingPassword ? "Changing..." : "Change Password"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                style={{
                  padding: "10px 16px",
                  background: "#444",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Active Sessions ── */}
      {sessions.length > 0 && (
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
              SESSION MANAGEMENT
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Active Sessions ({sessions.length})</h3>
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {sessions.map((session) => (
              <div
                key={session.id}
                style={{
                  background: "#252525",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  padding: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "12px", fontWeight: "bold", color: "#fff", marginBottom: "4px" }}>
                    {getBrowserInfo(session.user_agent)} • {session.ip || "Unknown IP"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#888" }}>
                    Created: {formatDate(session.created_at)}
                  </div>
                  {session.refreshed_at && (
                    <div style={{ fontSize: "11px", color: "#888" }}>
                      Last Active: {formatDate(session.refreshed_at)}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => logoutSession(session.id)}
                  style={{
                    padding: "6px 12px",
                    background: "#7f1d1d",
                    color: "#fca5a5",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "bold",
                  }}
                >
                  Logout
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Security Recommendations ── */}
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
            SECURITY TIPS
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Security Recommendations</h3>
        </div>

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "10px" }}>
          {[
            "Use a strong and unique password with uppercase, lowercase, numbers, and symbols.",
            "Never share your login credentials with anyone.",
            "Sign out when using a shared device.",
            "Review active sessions regularly and logout unknown devices.",
            "Enable two-factor authentication when available.",
            "Keep your browser and operating system updated.",
            "Report suspicious activity immediately.",
          ].map((tip, idx) => (
            <li
              key={idx}
              style={{
                display: "flex",
                gap: "10px",
                fontSize: "12px",
                color: "#aaa",
              }}
            >
              <span style={{ color: "#10b981", fontWeight: "bold", minWidth: "20px" }}>✓</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Security Activity Logs ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid #333" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "4px" }}>
                SECURITY ACTIVITY
              </div>
              <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Recent Security Events</h3>
            </div>
            <div style={{ color: "#888", fontSize: "11px" }}>
              {logs.length} Events
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading security logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            No security activity recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Date & Time
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Action
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Module
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#888", fontWeight: "normal" }}>
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #222" }}>
                    <td style={{ padding: "12px", color: "#888", whiteSpace: "nowrap" }}>
                      {formatDate(log.created_at)}
                    </td>
                    <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>
                      {log.action}
                    </td>
                    <td style={{ padding: "12px", color: "#aaa" }}>{log.module}</td>
                    <td style={{ padding: "12px", color: "#888", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {log.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: "6px 10px",
              background: currentPage === 1 ? "#333" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              fontSize: "11px",
            }}
          >
            ← Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              style={{
                padding: "6px 10px",
                background: currentPage === page ? "#2563eb" : "#333",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: currentPage === page ? "bold" : "normal",
              }}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: "6px 10px",
              background: currentPage === totalPages ? "#333" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              fontSize: "11px",
            }}
          >
            Next →
          </button>

          <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

      {/* ── Refresh Button ── */}
      <button
        onClick={loadSecurityData}
        style={{
          padding: "10px 16px",
          background: "#444",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "12px",
        }}
      >
        🔄 Refresh Security Data
      </button>
    </div>
  );
}

