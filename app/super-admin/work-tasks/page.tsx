
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Staff = {
  id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
};

type Task = {
  id: string;
  text: string;
  description: string | null;
  assigned_to: string;
  created_by: string;
  status: string;
  due_date: string | null;
  created_at: string;
};

export default function WorkTasksPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userId, setUserId] = useState("");
  const [teamCode, setTeamCode] = useState("");

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

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        throw new Error("Login session nahi mili.");
      }

      setUserId(authData.user.id);

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role, team_code")
          .eq("id", authData.user.id)
          .single();

      if (profileError || !profile) {
        throw new Error("Profile load nahi hui.");
      }

      if (profile.role !== "super_admin") {
        throw new Error("Sirf Super Admin is module ko use kar sakta hai.");
      }

      if (!profile.team_code) {
        throw new Error("Aapka Team Code mojood nahi hai.");
      }

      setTeamCode(profile.team_code);

      const { data: teamStaff, error: staffError } =
        await supabase
          .from("profiles")
          .select("id, username, first_name, surname")
          .eq("team_code", profile.team_code)
          .eq("role", "staff")
          .order("created_at", { ascending: false });

      if (staffError) throw staffError;

      setStaff(teamStaff || []);

      await loadTasks(authData.user.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Data load nahi hua."
      );
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

      const { error: insertError } = await supabase
        .from("staff_tasks")
        .insert({
          text: taskText.trim(),
          description: description.trim(),
          assigned_to: assignedTo,
          created_by: userId,
          status: "pending",
          due_date: dueDate || null,
        });

      if (insertError) throw insertError;

      setTaskText("");
      setDescription("");
      setAssignedTo("");
      setDueDate("");

      await loadTasks(userId);

      setMessage("Task successfully assign ho gaya!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Task create nahi hua."
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(taskId: string, status: string) {
    try {
      setError("");
      const { error } = await supabase
        .from("staff_tasks")
        .update({ status })
        .eq("id", taskId)
        .eq("created_by", userId);

      if (error) throw error;

      await loadTasks(userId);
      setMessage("Task status update ho gaya.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Status update nahi hua."
      );
    }
  }

  function staffName(id: string) {
    const person = staff.find((item) => item.id === id);

    if (!person) return "Unknown Staff";

    return (
      [person.first_name, person.surname].filter(Boolean).join(" ") ||
      person.username
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        Loading Work Tasks...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-8">

        <div>
          <h1 className="text-3xl font-bold">Work Tasks</h1>
          <p className="mt-2 text-slate-400">
            Apni team ke Staff ko tasks assign aur manage karein.
          </p>
          <p className="mt-2 text-sm text-blue-400">
            Team Code: {teamCode}
          </p>
        </div>

        {message && (
          <div className="rounded-lg bg-green-900/40 p-3 text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-900/40 p-3 text-red-300">
            {error}
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <h2 className="mb-6 text-xl font-semibold">Assign New Task</h2>

          <form onSubmit={createTask} className="space-y-5">

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Task Title
              </label>
              <input
                required
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                placeholder="Task ka naam"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-300">
                Task Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                placeholder="Task ki details"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Assign Staff
                </label>
                <select
                  required
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                >
                  <option value="">Staff select karein</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {[person.first_name, person.surname]
                        .filter(Boolean)
                        .join(" ") || person.username}
                    </option>
                  ))}
                </select>
                {staff.length === 0 && (
                  <p className="mt-2 text-sm text-amber-400">
                    Abhi aapki team mein Staff account nahi hai.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Deadline
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || staff.length === 0}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Assigning..." : "Assign Task"}
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Assigned Tasks</h2>
            <button
              onClick={() => loadTasks(userId)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm"
            >
              Refresh
            </button>
          </div>

          {tasks.length === 0 ? (
            <p className="text-slate-400">Abhi koi task assign nahi hua.</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="rounded-xl border border-slate-700 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">{task.text}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {task.description || "No description"}
                      </p>
                      <p className="mt-2 text-sm text-slate-300">
                        Staff: {staffName(task.assigned_to)}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Deadline: {task.due_date || "Not set"}
                      </p>
                    </div>

                    <select
                      value={task.status}
                      onChange={(e) =>
                        updateStatus(task.id, e.target.value)
                      }
                      className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}
