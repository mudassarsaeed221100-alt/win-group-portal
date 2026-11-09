
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
  created_at: string;
};

type Submission = {
  id: string;
  task_id: string;
  user_id: string;
  work_description: string;
  proof_url: string | null;
  status: string;
  earning_amount: number;
  created_at: string;
};

export default function FlexibleWork() {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [targetRoles, setTargetRoles] = useState<string[]>(["staff"]);
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [taskResult, submissionResult] = await Promise.all([
      supabase.from("work_tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("work_submissions").select("*").order("created_at", { ascending: false }),
    ]);

    if (taskResult.error) {
      setNotice("Tasks load nahi hue: " + taskResult.error.message);
    } else {
      setTasks(taskResult.data || []);
    }

    if (submissionResult.error) {
      setNotice("Submissions load nahi huin: " + submissionResult.error.message);
    } else {
      setSubmissions(submissionResult.data || []);
    }
  }

  function toggleRole(role: string) {
    setTargetRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role]
    );
  }

  async function createTask() {
    if (!title.trim() || !reward.trim() || Number(reward) < 0) {
      setNotice("Task title aur valid earning amount enter karein.");
      return;
    }

    if (targetRoles.length === 0) {
      setNotice("Kam az kam ek target role select karein.");
      return;
    }

    setLoading(true);
    setNotice("");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setNotice("Session expire ho gaya. Dobara login karein.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("work_tasks").insert({
      title: title.trim(),
      description: description.trim() || null,
      reward_amount: Number(reward),
      target_roles: targetRoles,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      created_by: user.id,
    });

    if (error) {
      setNotice("Task create nahi hua: " + error.message);
    } else {
      setNotice("New task successfully create ho gaya.");
      setTitle("");
      setDescription("");
      setReward("");
      setTargetRoles(["staff"]);
      setDeadline("");
      await loadData();
    }

    setLoading(false);
  }

  async function toggleTask(task: WorkTask) {
    const newStatus = task.status === "active" ? "inactive" : "active";

    const { error } = await supabase
      .from("work_tasks")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", task.id);

    if (error) {
      setNotice("Task status update nahi hua: " + error.message);
    } else {
      setNotice("Task status update ho gaya.");
      await loadData();
    }
  }

  async function reviewSubmission(item: Submission, decision: "approved" | "rejected") {
    if (item.status !== "pending") {
      setNotice("Ye submission pehle hi review ho chuki hai.");
      return;
    }

    const confirmed = window.confirm(
      decision === "approved"
        ? "Kya aap is work ko approve karna chahte hain? Task ki earning staff ke account ke liye record hogi."
        : "Kya aap is work ko reject karna chahte hain?"
    );

    if (!confirmed) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const reviewer = sessionData.session?.user;

    if (!reviewer) {
      setNotice("Session expire ho gaya. Dobara login karein.");
      return;
    }

    const task = tasks.find((t) => t.id === item.task_id);

    if (decision === "approved" && !task) {
      setNotice("Related task nahi mila. Submission approve nahi hui.");
      return;
    }

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

    if (error) {
      setNotice("Review save nahi hua: " + error.message);
    } else {
      setNotice(
        decision === "approved"
          ? "Work approve ho gaya aur earning record ho gayi."
          : "Work reject ho gaya."
      );
      await loadData();
    }
  }

  const pendingCount = submissions.filter((s) => s.status === "pending").length;
  const approvedCount = submissions.filter((s) => s.status === "approved").length;
  const totalEarnings = submissions
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + Number(s.earning_amount || 0), 0);

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginTop: "7px",
    border: "1px solid #444",
    borderRadius: "8px",
    background: "#202020",
    color: "white",
    boxSizing: "border-box" as const,
  };

  const buttonStyle = {
    padding: "10px 15px",
    border: "none",
    borderRadius: "7px",
    cursor: "pointer",
    color: "white",
    background: "#2563eb",
  };

  return (
    <div style={{ color: "white", maxWidth: "100%" }}>
      <h2 style={{ fontSize: "24px" }}>Flexible Work & Earnings</h2>
      <p style={{ color: "#aaa" }}>
        No fixed duty hours. Work apni marzi ke waqt karein aur approved tasks par earning hasil karein.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: "12px", margin: "20px 0" }}>
        {[
          ["Total Tasks", tasks.length],
          ["Pending Reviews", pendingCount],
          ["Approved Work", approvedCount],
          ["Approved Earnings", `Rs. ${totalEarnings.toLocaleString()}`],
        ].map(([label, value]) => (
          <div key={String(label)} style={{ background: "#1b1b1b", border: "1px solid #333", borderRadius: "10px", padding: "16px" }}>
            <p style={{ color: "#aaa", margin: 0, fontSize: "13px" }}>{label}</p>
            <h3 style={{ marginBottom: 0 }}>{value}</h3>
          </div>
        ))}
      </div>

      <section style={{ background: "#171717", border: "1px solid #333", borderRadius: "12px", padding: "20px", marginBottom: "25px" }}>
        <h3 style={{ marginTop: 0 }}>Create New Work Task</h3>

        <label>Task Title</label>
        <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task ka naam" />

        <label style={{ display: "block", marginTop: "15px" }}>Task Description</label>
        <textarea style={{ ...inputStyle, minHeight: "90px" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Task ki details aur instructions" />

        <label style={{ display: "block", marginTop: "15px" }}>Earning Per Approved Task (PKR)</label>
        <input style={inputStyle} type="number" min="0" step="0.01" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Founder yahan earning set karega" />

        <label style={{ display: "block", marginTop: "15px" }}>Optional Deadline</label>
        <input style={inputStyle} type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />

        <div style={{ marginTop: "18px" }}>
          <strong>Task Available For</strong>
          {[
            { label: "Super Admin", value: "super_admin" },
            { label: "Admin", value: "admin" },
            { label: "Staff", value: "staff" },
          ].map((role) => (
            <label key={role.value} style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
              <input type="checkbox" checked={targetRoles.includes(role.value)} onChange={() => toggleRole(role.value)} />
              {role.label}
            </label>
          ))}
        </div>

        {notice && <p style={{ color: "#9bd5a5", marginTop: "15px" }}>{notice}</p>}

        <button style={{ ...buttonStyle, marginTop: "20px" }} onClick={createTask} disabled={loading}>
          {loading ? "Creating..." : "Create Task"}
        </button>
      </section>

      <h3>Work Tasks ({tasks.length})</h3>

      {tasks.length === 0 ? (
        <p style={{ color: "#aaa" }}>Abhi koi task create nahi hua.</p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {tasks.map((task) => (
            <div key={task.id} style={{ background: "#171717", border: "1px solid #333", borderRadius: "10px", padding: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                <strong>{task.title}</strong>
                <span style={{ color: task.status === "active" ? "#7dd3a0" : "#aaa" }}>{task.status.toUpperCase()}</span>
              </div>
              <p style={{ color: "#ccc", whiteSpace: "pre-wrap" }}>{task.description}</p>
              <p>Earning: Rs. {Number(task.reward_amount).toLocaleString()}</p>
              <p style={{ color: "#aaa", fontSize: "13px" }}>Roles: {task.target_roles.join(", ")}</p>
              {task.deadline && <p style={{ color: "#aaa", fontSize: "13px" }}>Deadline: {new Date(task.deadline).toLocaleString()}</p>}
              <button style={buttonStyle} onClick={() => toggleTask(task)}>
                {task.status === "active" ? "Deactivate Task" : "Activate Task"}
              </button>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ marginTop: "30px" }}>Staff Work Submissions ({submissions.length})</h3>

      {submissions.length === 0 ? (
        <p style={{ color: "#aaa" }}>Abhi koi work submission nahi aayi.</p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {submissions.map((item) => (
            <div key={item.id} style={{ background: "#171717", border: "1px solid #333", borderRadius: "10px", padding: "16px" }}>
              <p style={{ color: "#aaa", fontSize: "12px" }}>User ID: {item.user_id}</p>
              <p>Task: {tasks.find((t) => t.id === item.task_id)?.title || "Task not found"}</p>
              <p style={{ whiteSpace: "pre-wrap" }}>{item.work_description}</p>
              {item.proof_url && <p><a href={item.proof_url} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>View Work Proof</a></p>}
              <p>Status: {item.status.toUpperCase()}</p>
              {item.status === "approved" && <p>Earning: Rs. {Number(item.earning_amount).toLocaleString()}</p>}
              {item.status === "pending" && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button style={{ ...buttonStyle, background: "#16834b" }} onClick={() => reviewSubmission(item, "approved")}>Approve</button>
                  <button style={{ ...buttonStyle, background: "#a83232" }} onClick={() => reviewSubmission(item, "rejected")}>Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
