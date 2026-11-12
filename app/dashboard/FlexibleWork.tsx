
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type WorkTask = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  target_roles: string[];
  deadline: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type Submission = {
  id: string;
  task_id: string;
  user_id: string;
  work_description: string;
  proof_url: string | null;
  status: string;
  earning_amount: number;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type UserProfile = {
  id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
};

export default function FlexibleWork() {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>(["staff"]);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  // Filters
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());

  // Pagination
  const [taskPage, setTaskPage] = useState(1);
  const [submissionPage, setSubmissionPage] = useState(1);
  const itemsPerPage = 10;

  /* ── Load Data ── */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [taskResult, submissionResult] = await Promise.all([
        supabase.from("work_tasks").select("*").order("created_at", { ascending: false }),
        supabase.from("work_submissions").select("*").order("created_at", { ascending: false }),
      ]);

      if (taskResult.error) throw taskResult.error;
      if (submissionResult.error) throw submissionResult.error;

      setTasks((taskResult.data || []) as WorkTask[]);
      setSubmissions((submissionResult.data || []) as Submission[]);

      // Load user profiles
      const userIds = Array.from(
        new Set([
          ...((submissionResult.data || []).map((s) => s.user_id)),
          ...((taskResult.data || []).map((t) => t.created_by)),
        ].filter(Boolean))
      ) as string[];

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, first_name, surname")
          .in("id", userIds);

        const userMap = new Map<string, UserProfile>();
        (profilesData || []).forEach((profile) => {
          userMap.set(profile.id, profile);
        });
        setUsers(userMap);
      }
    } catch (err: any) {
      showNotice(err.message || "Failed to load data", "error");
    }
  }

  /* ── Show Notice ── */
  function showNotice(msg: string, type: "success" | "error" = "success") {
    setNotice(msg);
    setNoticeType(type);
    setTimeout(() => setNotice(""), 4000);
  }

  /* ── Toggle Role ── */
  function toggleRole(role: string) {
    setTargetRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    );
  }

  /* ── Create Task ── */
  async function createTask() {
    if (!title.trim() || !reward.trim() || Number(reward) < 0) {
      showNotice("Task title aur valid earning amount enter karein.", "error");
      return;
    }

    if (targetRoles.length === 0) {
      showNotice("Kam az kam ek target role select karein.", "error");
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) throw new Error("Session expire ho gaya. Dobara login karein.");

      const { error } = await supabase.from("work_tasks").insert({
        title: title.trim(),
        description: description.trim() || null,
        reward_amount: Number(reward),
        target_roles: targetRoles,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        created_by: user.id,
      });

      if (error) throw error;

      showNotice("New task successfully create ho gaya.", "success");
      setTitle("");
      setDescription("");
      setReward("");
      setTargetRoles(["staff"]);
      setDeadline("");
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Task create nahi hua", "error");
    }

    setLoading(false);
  }

  /* ── Toggle Task Status ── */
  async function toggleTask(task: WorkTask) {
    const newStatus = task.status === "active" ? "inactive" : "active";

    try {
      const { error } = await supabase
        .from("work_tasks")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", task.id);

      if (error) throw error;

      showNotice("Task status update ho gaya.", "success");
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Task status update nahi hua", "error");
    }
  }

  /* ── Review Submission ── */
  async function reviewSubmission(item: Submission, decision: "approved" | "rejected") {
    if (item.status !== "pending") {
      showNotice("Ye submission pehle hi review ho chuki hai.", "error");
      return;
    }

    const confirmed = window.confirm(
      decision === "approved"
        ? "Kya aap is work ko approve karna chahte hain?"
        : "Kya aap is work ko reject karna chahte hain?"
    );

    if (!confirmed) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const reviewer = sessionData.session?.user;

      if (!reviewer) throw new Error("Session expire ho gaya. Dobara login karein.");

      const task = tasks.find((t) => t.id === item.task_id);

      const { error } = await supabase
        .from("work_submissions")
        .update({
          status: decision,
          earning_amount: decision === "approved" ? Number(task?.reward_amount || 0) : 0,
          reviewed_by: reviewer.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq("status", "pending");

      if (error) throw error;

      showNotice(
        decision === "approved"
          ? "Work approve ho gaya aur earning record ho gayi."
          : "Work reject ho gaya.",
        "success"
      );
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Review save nahi hua", "error");
    }
  }

  /* ── Bulk Review ── */
  async function bulkReview(decision: "approved" | "rejected") {
    if (selectedSubmissions.size === 0) {
      showNotice("Koi submission select nahi hai.", "error");
      return;
    }

    const confirmed = window.confirm(
      `${selectedSubmissions.size} submissions ko ${decision} karna hai?`
    );

    if (!confirmed) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const reviewer = sessionData.session?.user;

      if (!reviewer) throw new Error("Session expire ho gaya.");

      const submissionsToReview = submissions.filter((s) =>
        selectedSubmissions.has(s.id) && s.status === "pending"
      );

      for (const submission of submissionsToReview) {
        const task = tasks.find((t) => t.id === submission.task_id);

        await supabase
          .from("work_submissions")
          .update({
            status: decision,
            earning_amount: decision === "approved" ? Number(task?.reward_amount || 0) : 0,
            reviewed_by: reviewer.id,
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", submission.id);
      }

      showNotice(`${submissionsToReview.length} submissions ${decision} ho gaye.`, "success");
      setSelectedSubmissions(new Set());
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Bulk review nahi hua", "error");
    }
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

  /* ── Filter Tasks ── */
  const filteredTasks = tasks.filter((task) => {
    if (taskSearch.trim()) {
      const term = taskSearch.toLowerCase();
      if (!task.title.toLowerCase().includes(term) && !task.description?.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (taskStatusFilter !== "all" && task.status !== taskStatusFilter) {
      return false;
    }
    return true;
  });

  /* ── Filter Submissions ── */
  const filteredSubmissions = submissions.filter((sub) => {
    if (submissionSearch.trim()) {
      const term = submissionSearch.toLowerCase();
      const taskTitle = tasks.find((t) => t.id === sub.task_id)?.title || "";
      if (!taskTitle.toLowerCase().includes(term) && !sub.work_description?.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (submissionStatusFilter !== "all" && sub.status !== submissionStatusFilter) {
      return false;
    }
    if (dateFrom) {
      if (new Date(sub.created_at) < new Date(dateFrom)) {
        return false;
      }
    }
    if (dateTo) {
      if (new Date(sub.created_at) > new Date(dateTo)) {
        return false;
      }
    }
    return true;
  });

  /* ── Pagination ── */
  const taskTotalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice(
    (taskPage - 1) * itemsPerPage,
    taskPage * itemsPerPage
  );

  const submissionTotalPages = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const paginatedSubmissions = filteredSubmissions.slice(
    (submissionPage - 1) * itemsPerPage,
    submissionPage * itemsPerPage
  );

  /* ── Stats ── */
  const stats = {
    totalTasks: tasks.length,
    activeTasks: tasks.filter((t) => t.status === "active").length,
    totalSubmissions: submissions.length,
    pendingReviews: submissions.filter((s) => s.status === "pending").length,
    approvedWork: submissions.filter((s) => s.status === "approved").length,
    totalEarnings: submissions
      .filter((s) => s.status === "approved")
      .reduce((sum, s) => sum + Number(s.earning_amount || 0), 0),
  };

  /* ── Task Analytics ── */
  const taskAnalytics = tasks.map((task) => {
    const taskSubmissions = submissions.filter((s) => s.task_id === task.id);
    const approved = taskSubmissions.filter((s) => s.status === "approved").length;
    const total = taskSubmissions.length;
    const completionRate = total > 0 ? ((approved / total) * 100).toFixed(1) : "0";
    return { task, total, approved, completionRate };
  });

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
            FLEXIBLE WORK MANAGEMENT
          </div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Flexible Work & Earnings</h2>
          <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
            No fixed duty hours. Work apni marzi ke waqt karein aur approved tasks par earning hasil karein.
          </p>
        </div>

        {/* ── Stats Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          {[
            { label: "Total Tasks", value: stats.totalTasks, color: "#3b82f6" },
            { label: "Active Tasks", value: stats.activeTasks, color: "#10b981" },
            { label: "Pending Reviews", value: stats.pendingReviews, color: "#f59e0b" },
            { label: "Approved Work", value: stats.approvedWork, color: "#8b5cf6" },
            { label: "Total Earnings", value: `Rs. ${stats.totalEarnings.toLocaleString()}`, color: "#10b981" },
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
              <div style={{ fontSize: "16px", fontWeight: "bold", color: stat.color, marginTop: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

      {/* ── Create Task Form ── */}
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
            CREATE NEW TASK
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Create New Work Task</h3>
        </div>

        <div style={{ display: "grid", gap: "12px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
              Task Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task ka naam"
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
              Task Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Task ki details aur instructions"
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Earning Per Task (PKR) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="0"
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
                Optional Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
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

          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "8px", fontWeight: "bold" }}>
              Task Available For
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "8px" }}>
              {[
                { label: "Super Admin", value: "super_admin" },
                { label: "Admin", value: "admin" },
                { label: "Staff", value: "staff" },
              ].map((role) => (
                <label
                  key={role.value}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    cursor: "pointer",
                    padding: "8px",
                    background: targetRoles.includes(role.value) ? "#2563eb" : "#252525",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    fontSize: "12px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={targetRoles.includes(role.value)}
                    onChange={() => toggleRole(role.value)}
                    style={{ cursor: "pointer" }}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={createTask}
          disabled={loading}
          style={{
            marginTop: "16px",
            padding: "10px 16px",
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "12px",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Creating..." : "Create Task"}
        </button>
      </div>

      {/* ── Work Tasks Section ── */}
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
            WORK TASKS
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>All Tasks ({filteredTasks.length})</h3>
        </div>

        {/* ── Task Filters ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="Search tasks..."
            value={taskSearch}
            onChange={(e) => {
              setTaskSearch(e.target.value);
              setTaskPage(1);
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
            value={taskStatusFilter}
            onChange={(e) => {
              setTaskStatusFilter(e.target.value);
              setTaskPage(1);
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
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={() => {
              setTaskSearch("");
              setTaskStatusFilter("all");
              setTaskPage(1);
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

        {/* ── Task Analytics ── */}
        {filteredTasks.length > 0 && (
          <div style={{ marginBottom: "16px", padding: "12px", background: "#252525", borderRadius: "6px", fontSize: "11px", color: "#aaa" }}>
            <strong style={{ color: "#fff" }}>Task Performance:</strong> {taskAnalytics.filter((t) => filteredTasks.find((ft) => ft.id === t.task.id)).map((t) => `${t.task.title}: ${t.approved}/${t.total} (${t.completionRate}%)`).join(" • ")}
          </div>
        )}

        {/* ── Tasks List ── */}
        {paginatedTasks.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            Abhi koi task create nahi hua.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {paginatedTasks.map((task) => {
              const analytics = taskAnalytics.find((t) => t.task.id === task.id);
              return (
                <div
                  key={task.id}
                  style={{
                    background: "#252525",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "8px", marginBottom: "8px" }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#aaa" }}>
                          {task.description}
                        </p>
                      )}
                    </div>

                    <span
                      style={{
                        display: "inline-block",
                        padding: "4px 10px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        background: task.status === "active" ? "#064e3b" : "#333",
                        color: task.status === "active" ? "#86efac" : "#aaa",
                      }}
                    >
                      {task.status.toUpperCase()}
                    </span>
                  </div>

                  <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>
                    💰 Rs. {Number(task.reward_amount).toLocaleString()} • Roles: {task.target_roles.join(", ")} • Submissions: {analytics?.total || 0} ({analytics?.approved || 0} approved)
                  </div>

                  {task.deadline && (
                    <div style={{ fontSize: "11px", color: "#f59e0b", marginBottom: "8px" }}>
                      📅 Deadline: {new Date(task.deadline).toLocaleString("en-PK")}
                    </div>
                  )}

                  <button
                    onClick={() => toggleTask(task)}
                    style={{
                      padding: "6px 12px",
                      background: task.status === "active" ? "#7f1d1d" : "#064e3b",
                      color: task.status === "active" ? "#fca5a5" : "#86efac",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: "bold",
                    }}
                  >
                    {task.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Task Pagination ── */}
        {taskTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginTop: "16px" }}>
            <button
              onClick={() => setTaskPage(Math.max(1, taskPage - 1))}
              disabled={taskPage === 1}
              style={{
                padding: "6px 10px",
                background: taskPage === 1 ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: taskPage === 1 ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              ← Prev
            </button>

            {Array.from({ length: taskTotalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setTaskPage(page)}
                style={{
                  padding: "6px 10px",
                  background: taskPage === page ? "#2563eb" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: taskPage === page ? "bold" : "normal",
                }}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setTaskPage(Math.min(taskTotalPages, taskPage + 1))}
              disabled={taskPage === taskTotalPages}
              style={{
                padding: "6px 10px",
                background: taskPage === taskTotalPages ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: taskPage === taskTotalPages ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              Next →
            </button>

            <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
              Page {taskPage} of {taskTotalPages}
            </span>
          </div>
        )}
      </div>

      {/* ── Submissions Section ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
            WORK SUBMISSIONS
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Staff Work Submissions ({filteredSubmissions.length})</h3>
        </div>

        {/* ── Submission Filters ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="Search submissions..."
            value={submissionSearch}
            onChange={(e) => {
              setSubmissionSearch(e.target.value);
              setSubmissionPage(1);
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
            value={submissionStatusFilter}
            onChange={(e) => {
              setSubmissionStatusFilter(e.target.value);
              setSubmissionPage(1);
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
              setSubmissionPage(1);
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
              setSubmissionPage(1);
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
              setSubmissionSearch("");
              setSubmissionStatusFilter("all");
              setDateFrom("");
              setDateTo("");
              setSubmissionPage(1);
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
        {selectedSubmissions.size > 0 && (
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button
              onClick={() => bulkReview("approved")}
              style={{
                padding: "8px 12px",
                background: "#064e3b",
                color: "#86efac",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              ✓ Approve {selectedSubmissions.size}
            </button>

            <button
              onClick={() => bulkReview("rejected")}
              style={{
                padding: "8px 12px",
                background: "#7f1d1d",
                color: "#fca5a5",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "11px",
                fontWeight: "bold",
              }}
            >
              ✕ Reject {selectedSubmissions.size}
            </button>
          </div>
        )}

        {/* ── Submissions List ── */}
        {paginatedSubmissions.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            Abhi koi work submission nahi aayi.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {paginatedSubmissions.map((item) => {
              const task = tasks.find((t) => t.id === item.task_id);
              return (
                <div
                  key={item.id}
                  style={{
                    background: "#252525",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    padding: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
                    {item.status === "pending" && (
                      <input
                        type="checkbox"
                        checked={selectedSubmissions.has(item.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedSubmissions);
                          if (e.target.checked) {
                            newSet.add(item.id);
                          } else {
                            newSet.delete(item.id);
                          }
                          setSelectedSubmissions(newSet);
                        }}
                        style={{ cursor: "pointer", marginTop: "4px" }}
                      />
                    )}

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "8px", marginBottom: "6px" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                            {task?.title || "Task not found"}
                          </h4>
                          <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#aaa" }}>
                            By: {getUserName(item.user_id)}
                          </p>
                        </div>

                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "4px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            background:
                              item.status === "pending"
                                ? "#f59e0b20"
                                : item.status === "approved"
                                ? "#10b98120"
                                : "#ef444420",
                            color:
                              item.status === "pending"
                                ? "#f59e0b"
                                : item.status === "approved"
                                ? "#10b981"
                                : "#ef4444",
                          }}
                        >
                          {item.status.toUpperCase()}
                        </span>
                      </div>

                      <p style={{ margin: "8px 0", fontSize: "12px", color: "#ccc", whiteSpace: "pre-wrap" }}>
                        {item.work_description}
                      </p>

                      {item.proof_url && (
                        <p style={{ margin: "8px 0", fontSize: "11px" }}>
                          <a
                            href={item.proof_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#60a5fa", textDecoration: "none" }}
                          >
                            📎 View Work Proof
                          </a>
                        </p>
                      )}

                      <div style={{ fontSize: "11px", color: "#888", marginTop: "8px" }}>
                        Submitted: {new Date(item.created_at).toLocaleString("en-PK")}
                        {item.status === "approved" && ` • Earning: Rs. ${Number(item.earning_amount).toLocaleString()}`}
                      </div>

                      {item.status === "pending" && (
                        <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                          <button
                            onClick={() => reviewSubmission(item, "approved")}
                            style={{
                              padding: "6px 12px",
                              background: "#064e3b",
                              color: "#86efac",
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
                            onClick={() => reviewSubmission(item, "rejected")}
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
                            ✕ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Submission Pagination ── */}
        {submissionTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginTop: "16px" }}>
            <button
              onClick={() => setSubmissionPage(Math.max(1, submissionPage - 1))}
              disabled={submissionPage === 1}
              style={{
                padding: "6px 10px",
                background: submissionPage === 1 ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: submissionPage === 1 ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              ← Prev
            </button>

            {Array.from({ length: submissionTotalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setSubmissionPage(page)}
                style={{
                  padding: "6px 10px",
                  background: submissionPage === page ? "#2563eb" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: submissionPage === page ? "bold" : "normal",
                }}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setSubmissionPage(Math.min(submissionTotalPages, submissionPage + 1))}
              disabled={submissionPage === submissionTotalPages}
              style={{
                padding: "6px 10px",
                background: submissionPage === submissionTotalPages ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: submissionPage === submissionTotalPages ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              Next →
            </button>

            <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
              Page {submissionPage} of {submissionTotalPages}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

