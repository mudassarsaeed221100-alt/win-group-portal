
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type WorkTask = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  deadline: string | null;
  status: string;
  created_by: string;
};

type Submission = {
  id: string;
  task_id: string;
  user_id: string;
  work_description: string;
  proof_url: string | null;
  status: "pending" | "approved" | "rejected";
  earning_amount: number;
  created_at: string;
};

type UserProfile = {
  id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
  role: string;
};

export default function WorkSubmission() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [tasks, setTasks] = useState<Map<string, WorkTask>>(new Map());
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;

  // Modal
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [approvalAmount, setApprovalAmount] = useState("");

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ── Load Data ── */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        showNotice("Login session nahi mili.", "error");
        return;
      }

      // Check if user is founder
      const { data: founder, error: founderError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (founderError || founder?.role !== "founder_owner") {
        showNotice("Sirf Founder is module ko access kar sakta hai.", "error");
        return;
      }

      // Load all submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from("work_submissions")
        .select("*")
        .order("created_at", { ascending: false });

      if (submissionsError) throw submissionsError;

      setSubmissions((submissionsData || []) as Submission[]);

      // Load task details
      const taskIds = Array.from(
        new Set((submissionsData || []).map((s) => s.task_id).filter(Boolean))
      ) as string[];

      if (taskIds.length > 0) {
        const { data: tasksData } = await supabase
          .from("work_tasks")
          .select("*")
          .in("id", taskIds);

        const taskMap = new Map<string, WorkTask>();
        (tasksData || []).forEach((task) => {
          taskMap.set(task.id, task);
        });
        setTasks(taskMap);
      }

      // Load user profiles
      const userIds = Array.from(
        new Set((submissionsData || []).map((s) => s.user_id).filter(Boolean))
      ) as string[];

      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, username, first_name, surname, role")
          .in("id", userIds);

        const userMap = new Map<string, UserProfile>();
        (usersData || []).forEach((user) => {
          userMap.set(user.id, user);
        });
        setUsers(userMap);
      }
    } catch (err: any) {
      showNotice(err.message || "Failed to load data", "error");
    }
  }

  /* ── Refresh Data ── */
  async function refreshData() {
    setRefreshing(true);
    try {
      await loadData();
      showNotice("Data successfully refresh ho gaya.", "success");
    } catch (err: any) {
      showNotice(err.message || "Refresh nahi hua", "error");
    }
    setRefreshing(false);
  }

  /* ── Show Notice ── */
  function showNotice(msg: string, type: "success" | "error" = "success") {
    setNotice(msg);
    setNoticeType(type);
    setTimeout(() => setNotice(""), 4000);
  }

  /* ── Get User Name ── */
  function getUserName(userId: string | null) {
    if (!userId) return "Unknown";
    const user = users.get(userId);
    if (user) {
      return user.first_name && user.surname
        ? `${user.first_name} ${user.surname}`
        : user.username;
    }
    return userId.slice(0, 8);
  }

  /* ── Get Task Title ── */
  function getTaskTitle(taskId: string | null) {
    if (!taskId) return "Unknown Task";
    const task = tasks.get(taskId);
    return task?.title || taskId.slice(0, 8);
  }

  /* ── Approve Submission ── */
  async function approveSubmission(submissionId: string, amount: number) {
    if (amount <= 0) {
      showNotice("Earning amount 0 se zyada hona chahiye.", "error");
      return;
    }

    if (!window.confirm(`Kya aap is submission ko Rs. ${amount} ke saath approve karna chahte hain?`)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("work_submissions")
        .update({
          status: "approved",
          earning_amount: amount,
        })
        .eq("id", submissionId);

      if (error) throw error;

      showNotice("Submission successfully approved.", "success");
      await loadData();
      setSelectedSubmission(null);
      setApprovalAmount("");
    } catch (err: any) {
      showNotice(err.message || "Approval nahi hui", "error");
    }

    setLoading(false);
  }

  /* ── Reject Submission ── */
  async function rejectSubmission(submissionId: string) {
    if (!window.confirm("Kya aap is submission ko reject karna chahte hain?")) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("work_submissions")
        .update({
          status: "rejected",
          earning_amount: 0,
        })
        .eq("id", submissionId);

      if (error) throw error;

      showNotice("Submission successfully rejected.", "success");
      await loadData();
      setSelectedSubmission(null);
    } catch (err: any) {
      showNotice(err.message || "Rejection nahi hui", "error");
    }

    setLoading(false);
  }

  /* ── Bulk Approve ── */
  async function bulkApprove() {
    if (selectedIds.size === 0) {
      showNotice("Koi submission select karein.", "error");
      return;
    }

    if (!window.confirm(`Kya aap ${selectedIds.size} submissions ko approve karna chahte hain?`)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("work_submissions")
        .update({
          status: "approved",
        })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      showNotice(`${selectedIds.size} submissions successfully approved.`, "success");
      setSelectedIds(new Set());
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Bulk approval nahi hui", "error");
    }

    setLoading(false);
  }

  /* ── Bulk Reject ── */
  async function bulkReject() {
    if (selectedIds.size === 0) {
      showNotice("Koi submission select karein.", "error");
      return;
    }

    if (!window.confirm(`Kya aap ${selectedIds.size} submissions ko reject karna chahte hain?`)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("work_submissions")
        .update({
          status: "rejected",
          earning_amount: 0,
        })
        .in("id", Array.from(selectedIds));

      if (error) throw error;

      showNotice(`${selectedIds.size} submissions successfully rejected.`, "success");
      setSelectedIds(new Set());
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Bulk rejection nahi hui", "error");
    }

    setLoading(false);
  }

  /* ── Export to CSV ── */
  function exportSubmissionsCSV() {
    const headers = ["User", "Task", "Status", "Earning", "Submitted Date"];
    const rows = filteredSubmissions.map((s) => [
      getUserName(s.user_id),
      getTaskTitle(s.task_id),
      s.status,
      s.earning_amount,
      new Date(s.created_at).toLocaleDateString("en-PK"),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-submissions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /* ── Filter Submissions ── */
  const filteredSubmissions = submissions.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;

    const userName = getUserName(s.user_id).toLowerCase();
    if (userSearch && !userName.includes(userSearch.toLowerCase())) return false;

    if (dateFrom && new Date(s.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(s.created_at) > new Date(dateTo)) return false;

    return true;
  });

  /* ── Pagination ── */
  const totalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  /* ── Stats ── */
  const stats = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    rejected: submissions.filter((s) => s.status === "rejected").length,
    totalEarnings: submissions
      .filter((s) => s.status === "approved")
      .reduce((sum, s) => sum + Number(s.earning_amount || 0), 0),
  };

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
              WORK SUBMISSIONS
            </div>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Staff Work Submissions</h2>
            <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
              Staff ke submitted work ko review, approve aur earnings calculate karein.
            </p>
          </div>

          <button
            onClick={refreshData}
            disabled={refreshing}
            style={{
              padding: "10px 16px",
              background: refreshing ? "#444" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: refreshing ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "12px",
              opacity: refreshing ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh"}
          </button>
        </div>

        {/* ── Stats Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          {[
            { label: "Total Submissions", value: stats.total, color: "#3b82f6" },
            { label: "Pending Review", value: stats.pending, color: "#f59e0b" },
            { label: "Approved", value: stats.approved, color: "#10b981" },
            { label: "Rejected", value: stats.rejected, color: "#ef4444" },
            { label: "Total Earnings", value: `Rs. ${stats.totalEarnings.toLocaleString()}`, color: "#8b5cf6" },
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
      {notice && (
        <div
          style={{
            padding: "12px 16px",
            background: noticeType === "success" ? "#064e3b" : "#7f1d1d",
            color: noticeType === "success" ? "#86efac" : "#fca5a5",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          {noticeType === "success" ? "✓" : "✕"} {notice}
        </div>
      )}

      {/* ── Submissions Section ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
              SUBMISSIONS REVIEW
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>All Submissions ({filteredSubmissions.length})</h3>
          </div>

          <button
            onClick={exportSubmissionsCSV}
            style={{
              padding: "10px 16px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            📥 Export CSV
          </button>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="Search by user..."
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setPage(1);
            }}
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
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
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
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
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
              setUserSearch("");
              setStatusFilter("all");
              setDateFrom("");
              setDateTo("");
              setPage(1);
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
            Clear
          </button>
        </div>

        {/* ── Bulk Actions ── */}
        {selectedIds.size > 0 && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
            <span style={{ color: "#aaa", fontSize: "12px", alignSelf: "center" }}>
              {selectedIds.size} selected
            </span>

            <button
              onClick={bulkApprove}
              disabled={loading}
              style={{
                padding: "8px 12px",
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                opacity: loading ? 0.6 : 1,
              }}
            >
              ✓ Bulk Approve
            </button>

            <button
              onClick={bulkReject}
              disabled={loading}
              style={{
                padding: "8px 12px",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: "bold",
                opacity: loading ? 0.6 : 1,
              }}
            >
              ✕ Bulk Reject
            </button>

            <button
              onClick={() => setSelectedIds(new Set())}
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
              Clear Selection
            </button>
          </div>
        )}

        {/* ── Submissions Table ── */}
        {paginatedSubmissions.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            Koi submission record nahi mila.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold", width: "30px" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.size === paginatedSubmissions.length && paginatedSubmissions.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(paginatedSubmissions.map((s) => s.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                      style={{ cursor: "pointer" }}
                    />
                  </th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>User</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Task</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Earning</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Submitted</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedSubmissions.map((submission) => (
                  <tr key={submission.id} style={{ borderBottom: "1px solid #333" }}>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(submission.id)}
                        onChange={(e) => {
                          const newIds = new Set(selectedIds);
                          if (e.target.checked) {
                            newIds.add(submission.id);
                          } else {
                            newIds.delete(submission.id);
                          }
                          setSelectedIds(newIds);
                        }}
                        style={{ cursor: "pointer" }}
                      />
                    </td>

                    <td style={{ padding: "12px" }}>
                      <div style={{ color: "#fff", fontWeight: "bold" }}>
                        {getUserName(submission.user_id)}
                      </div>
                    </td>

                    <td style={{ padding: "12px", color: "#aaa" }}>
                      {getTaskTitle(submission.task_id)}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          background:
                            submission.status === "pending"
                              ? "#f59e0b20"
                              : submission.status === "approved"
                              ? "#10b98120"
                              : "#ef444420",
                          color:
                            submission.status === "pending"
                              ? "#fbbf24"
                              : submission.status === "approved"
                              ? "#86efac"
                              : "#f87171",
                        }}
                      >
                        {submission.status.toUpperCase()}
                      </span>
                    </td>

                    <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>
                      Rs. {Number(submission.earning_amount).toLocaleString()}
                    </td>

                    <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>
                      {new Date(submission.created_at).toLocaleDateString("en-PK")}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {submission.status === "pending" && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedSubmission(submission);
                                setApprovalAmount(String(tasks.get(submission.task_id)?.reward_amount || 0));
                              }}
                              style={{
                                padding: "6px 10px",
                                background: "#10b981",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: "bold",
                              }}
                            >
                              ✓ Approve
                            </button>

                            <button
                              onClick={() => rejectSubmission(submission.id)}
                              disabled={loading}
                              style={{
                                padding: "6px 10px",
                                background: "#ef4444",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: "bold",
                                opacity: loading ? 0.6 : 1,
                              }}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => setSelectedSubmission(submission)}
                          style={{
                            padding: "6px 10px",
                            background: "#444",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          👁️ View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginTop: "16px" }}>
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              style={{
                padding: "6px 10px",
                background: page === 1 ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: page === 1 ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              ← Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: "6px 10px",
                  background: page === p ? "#2563eb" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: page === p ? "bold" : "normal",
                }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              style={{
                padding: "6px 10px",
                background: page === totalPages ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: page === totalPages ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              Next →
            </button>

            <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
              Page {page} of {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* ── Submission Details Modal ── */}
      {selectedSubmission && (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Submission Details</h3>
            <button
              onClick={() => {
                setSelectedSubmission(null);
                setApprovalAmount("");
              }}
              style={{
                padding: "6px 12px",
                background: "#444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>User</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {getUserName(selectedSubmission.user_id)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Task</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {getTaskTitle(selectedSubmission.task_id)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Status</div>
              <div
                style={{
                  fontSize: "13px",
                  color:
                    selectedSubmission.status === "pending"
                      ? "#fbbf24"
                      : selectedSubmission.status === "approved"
                      ? "#86efac"
                      : "#f87171",
                  fontWeight: "bold",
                }}
              >
                {selectedSubmission.status.toUpperCase()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Current Earning</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                Rs. {Number(selectedSubmission.earning_amount).toLocaleString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Submitted Date</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {new Date(selectedSubmission.created_at).toLocaleString("en-PK")}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #333" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px", fontWeight: "bold" }}>Work Description</div>
            <div style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.6" }}>
              {selectedSubmission.work_description}
            </div>
          </div>

          {selectedSubmission.proof_url && (
            <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #333" }}>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px", fontWeight: "bold" }}>Proof Link</div>
              <a
                href={selectedSubmission.proof_url}
                target="_blank"
                rel="noreferrer"
                style={{ color: "#3b82f6", textDecoration: "underline", fontSize: "12px" }}
              >
                {selectedSubmission.proof_url}
              </a>
            </div>
          )}

          {selectedSubmission.status === "pending" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "4px" }}>
                  Approval Amount (Rs.)
                </label>
                <input
                  type="number"
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(e.target.value)}
                  min="0"
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

              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <button
                  onClick={() => approveSubmission(selectedSubmission.id, Number(approvalAmount))}
                  disabled={loading || !approvalAmount}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#10b981",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "12px",
                    opacity: loading || !approvalAmount ? 0.6 : 1,
                  }}
                >
                  ✓ Approve
                </button>

                <button
                  onClick={() => rejectSubmission(selectedSubmission.id)}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "12px",
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

