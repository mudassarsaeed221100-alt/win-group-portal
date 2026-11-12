
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type ActivityLog = {
  id: string;
  actor_id: string | null;
  action: string;
  module: string;
  details: string | null;
  created_at: string;
};

type UserProfile = {
  id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
};

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  /* ── Load Data ── */
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      setError(error.message);
      setLogs([]);
    } else {
      setLogs((data || []) as ActivityLog[]);

      // Fetch user profiles for all actor_ids
      const actorIds = Array.from(
        new Set((data || []).map((log) => log.actor_id).filter(Boolean))
      ) as string[];

      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, first_name, surname")
          .in("id", actorIds);

        const userMap = new Map<string, UserProfile>();
        (profiles || []).forEach((profile) => {
          userMap.set(profile.id, profile);
        });
        setUsers(userMap);
      }
    }

    setLoading(false);
  }

  /* ── Filter & Search ── */
  useEffect(() => {
    let filtered = logs;

    // Search filter
    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(term) ||
          log.module.toLowerCase().includes(term) ||
          log.details?.toLowerCase().includes(term)
      );
    }

    // Action filter
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    // Module filter
    if (moduleFilter !== "all") {
      filtered = filtered.filter((log) => log.module === moduleFilter);
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(
        (log) => new Date(log.created_at).toDateString() >= new Date(dateFrom).toDateString()
      );
    }
    if (dateTo) {
      filtered = filtered.filter(
        (log) => new Date(log.created_at).toDateString() <= new Date(dateTo).toDateString()
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [search, actionFilter, moduleFilter, dateFrom, dateTo, logs]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /* ── Get Unique Actions & Modules ── */
  const uniqueActions = Array.from(new Set(logs.map((log) => log.action))).sort();
  const uniqueModules = Array.from(new Set(logs.map((log) => log.module))).sort();

  /* ── Format Date ── */
  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  /* ── Get User Name ── */
  function getUserName(userId: string | null) {
    if (!userId) return "System";
    const user = users.get(userId);
    if (user) {
      return user.first_name && user.surname
        ? `${user.first_name} ${user.surname}`
        : user.username;
    }
    return userId.slice(0, 8);
  }

  /* ── Get Action Badge Color ── */
  function getActionColor(action: string) {
    const actionLower = action.toLowerCase();
    if (actionLower.includes("create") || actionLower.includes("add")) {
      return { bg: "#064e3b", color: "#86efac" };
    } else if (actionLower.includes("delete") || actionLower.includes("remove")) {
      return { bg: "#7f1d1d", color: "#fca5a5" };
    } else if (actionLower.includes("update") || actionLower.includes("edit")) {
      return { bg: "#1e3a8a", color: "#93c5fd" };
    } else if (actionLower.includes("login") || actionLower.includes("logout")) {
      return { bg: "#5b21b6", color: "#e9d5ff" };
    } else {
      return { bg: "#444", color: "#ccc" };
    }
  }

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
            SYSTEM MONITORING
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Activity Logs</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
            Recent actions recorded in the WIN GROUP portal.
          </p>
        </div>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          {[
            { label: "Total Activities", value: logs.length, color: "#3b82f6" },
            { label: "Filtered Results", value: filteredLogs.length, color: "#8b5cf6" },
            { label: "Unique Actions", value: uniqueActions.length, color: "#10b981" },
            { label: "Unique Modules", value: uniqueModules.length, color: "#f59e0b" },
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
              <div style={{ fontSize: "20px", fontWeight: "bold", color: stat.color, marginTop: "6px" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Error Message ── */}
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

      {/* ── Filters ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "20px",
        }}
      >
        <div style={{ marginBottom: "12px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
            FILTERS & SEARCH
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
          <input
            type="text"
            placeholder="Search action, module, details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          />

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            <option value="all">All Modules</option>
            {uniqueModules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          />

          <button
            onClick={() => {
              setSearch("");
              setActionFilter("all");
              setModuleFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
            style={{
              padding: "8px 12px",
              background: "#444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Clear Filters
          </button>

          <button
            onClick={fetchData}
            style={{
              padding: "8px 12px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* ── Activity Table ── */}
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
                ACTIVITY HISTORY
              </div>
              <h3 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>All Activities</h3>
            </div>
            <div style={{ color: "#888", fontSize: "11px" }}>
              {filteredLogs.length} Records
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>Loading activity logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
            No activity logs found for the selected filters.
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
                    User
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
                {paginatedLogs.map((log) => {
                  const actionColor = getActionColor(log.action);
                  return (
                    <tr key={log.id} style={{ borderBottom: "1px solid #222" }}>
                      <td style={{ padding: "12px", color: "#888", whiteSpace: "nowrap" }}>
                        {formatDate(log.created_at)}
                      </td>
                      <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>
                        {getUserName(log.actor_id)}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            background: actionColor.bg,
                            color: actionColor.color,
                            textTransform: "uppercase",
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: "12px", color: "#aaa" }}>{log.module}</td>
                      <td style={{ padding: "12px", color: "#888", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {log.details || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center" }}>
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

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
            if (page > totalPages) return null;
            return (
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
            );
          })}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <span style={{ color: "#888", fontSize: "11px" }}>...</span>
          )}

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
    </div>
  );
}

