"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Staff = { id: string; username: string; first_name: string | null; surname: string | null };
type Task = {
  id: string;
  text: string;
  description: string | null;
  assigned_to: string;
  status: string;
  due_date: string | null;
};

const box = "w-full rounded-lg border border-slate-700 bg-slate-950 p-3";

export default function WorkTasksPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userId, setUserId] = useState("");
  const [filter, setFilter] = useState("all");

  const [taskText, setTaskText] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    try {
      setLoading(true);
      setError("");
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Login session nahi mili.");
      setUserId(data.session.user.id);

      const res = await fetch("/api/admin/users", {
        headers: { Authorization: "Bearer " + data.session.access_token },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Staff list load nahi hui.");
      setStaff(result.staff || []);

      await loadTasks(data.session.user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data load nahi hua.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks(creatorId: string) {
    const { data, error } = await supabase
      .from("staff_tasks")
      .select("*")
      .eq("created_by", creatorId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    setTasks(data || []);
  }

  async function createTask(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!assignedTo) {
      setError("Pehle Staff select karein.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const { error } = await supabase.from("staff_tasks").insert({
        text: taskText.trim(),
        description: description.trim() || null,
        assigned_to: assignedTo,
        created_by: userId,
        status: "pending",
        due_date: dueDate || null,
      });
      if (error) throw error;
      setTaskText("");
      setDescription("");
      setAssignedTo("");
      setDueDate("");
      await loadTasks(userId);
      setMessage("Task successfully assign ho gaya!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Task create nahi hua.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(taskId: string, status: string) {
    setError("");
    const { error } = await supabase.from("staff_tasks").update({ status }).eq("id", taskId);
    if (error) return setError(error.message);
    await loadTasks(userId);
    setMessage("Task status update ho gaya.");
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Kya aap ye task delete karna chahte hain?")) return;
    setError("");
    const { error } = await supabase.from("staff_tasks").delete().eq("id", taskId);
    if (error) return setError(error.message);
    await loadTasks(userId);
    setMessage("Task delete ho gaya.");
  }

  function staffName(id: string) {
    const p = staff.find((x) => x.id === id);
    if (!p) return "Unknown Staff";
    return [p.first_name, p.surname].filter(Boolean).join(" ") || p.username;
  }

  const shown = filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-8 text-white">Loading Work Tasks...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Work Tasks</h1>
          <p className="mt-2 text-slate-400">Apni team ke Staff ko tasks assign aur manage karein.</p>
        </div>

        {message && <div className="rounded-lg bg-green-900/40 p-3 text-green-300">{message}</div>}
        {error && <div className="rounded-lg bg-red-900/40 p-3 text-red-300">{error}</div>}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <h2 className="mb-6 text-xl font-semibold">Assign New Task</h2>
          <form onSubmit={createTask} className="space-y-5">
            <input required value={taskText} onChange={(e) => setTaskText(e.target.value)} className={box} placeholder="Task ka naam" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={box} placeholder="Task ki details" />
            <div className="grid gap-5 sm:grid-cols-2">
              <select required value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className={box}>
                <option value="">Staff select karein</option>
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>{staffName(p.id)}</option>
                ))}
              </select>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={box} />
            </div>
            {staff.length === 0 && <p className="text-sm text-amber-400">Abhi aapki team mein Staff account nahi hai.</p>}
            <button type="submit" disabled={saving || staff.length === 0} className="rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50">
              {saving ? "Assigning..." : "Assign Task"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Assigned Tasks ({shown.length})</h2>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm">
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {shown.length === 0 ? (
            <p className="text-slate-400">Koi task nahi mila.</p>
          ) : (
            <div className="space-y-4">
              {shown.map((task) => (
                <div key={task.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-700 p-4">
                  <div>
                    <h3 className="font-semibold">{task.text}</h3>
                    <p className="mt-1 text-sm text-slate-400">{task.description || "No description"}</p>
                    <p className="mt-2 text-sm text-slate-300">Staff: {staffName(task.assigned_to)}</p>
                    <p className="mt-1 text-sm
