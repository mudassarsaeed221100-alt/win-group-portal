"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type WorkTask = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  deadline: string | null;
};

type Submission = {
  id: string;
  task_id: string;
  work_description: string;
  proof_url: string | null;
  status: "pending" | "approved" | "rejected";
  earning_amount: number;
  created_at: string;
};

export default function WorkSubmission() {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [userId, setUserId] = useState("");
  const [selectedTask, setSelectedTask] = useState("");
  const [description, setDescription] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    const user = sessionData.session?.user;

    if (sessionError || !user) {
      setMessage("Login session nahi mili. Dobara login karein.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: taskData, error: taskError } = await supabase
      .from("work_tasks")
      .select("id, title, description, reward_amount, deadline")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (taskError) {
      setMessage("Tasks load nahi huay: " + taskError.message);
    } else {
      setTasks(taskData || []);
    }

    const { data: submissionData, error: submissionError } =
      await supabase
        .from("work_submissions")
        .select(
          "id, task_id, work_description, proof_url, status, earning_amount, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (submissionError) {
      setMessage("Submissions load nahi huin: " + submissionError.message);
    } else {
      setSubmissions(submissionData || []);
    }

    setLoading(false);
  }

  async function submitWork(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId || !selectedTask || !description.trim()) {
      setMessage("Task select karein aur work details likhein.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("work_submissions").insert({
      task_id: selectedTask,
      user_id: userId,
      work_description: description.trim(),
      proof_url: proofUrl.trim() || null,
      status: "pending",
      earning_amount: 0,
    });

    if (error) {
      setMessage("Submission nahi hui: " + error.message);
    } else {
      setMessage("Aapka work successfully submit ho gaya hai.");
      setSelectedTask("");
      setDescription("");
      setProofUrl("");
      await loadData();
    }

    setSaving(false);
  }

  const statusLabel = (status: string) => {
    if (status === "approved") return "Approved";
    if (status === "rejected") return "Rejected";
    return "Pending";
  };

  if (loading) {
    return (
      <div className="p-6 text-gray-300">
        Work portal load ho raha hai...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div>
        <h2 className="text-2xl font-bold">Flexible Work Portal</h2>
        <p className="mt-1 text-sm text-gray-400">
          Apni marzi ke waqt kaam karein. Jitna approved work hoga, utni
          earning milegi. Koi fixed duty timing nahi hai.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm">
          {message}
        </div>
      )}

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
        <h3 className="mb-4 text-lg font-semibold">Available Tasks</h3>

        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400">
            Filhal koi active task available nahi hai.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-lg border border-gray-700 bg-gray-800 p-4"
              >
                <h4 className="font-semibold">{task.title}</h4>

                <p className="mt-2 text-sm text-gray-400">
                  {task.description || "Task ki mazeed details nahi di gayin."}
                </p>

                <p className="mt-3 font-semibold text-green-400">
                  Reward: Rs. {Number(task.reward_amount).toLocaleString("en-PK")}
                </p>

                {task.deadline && (
                  <p className="mt-1 text-xs text-gray-400">
                    Deadline: {new Date(task.deadline).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={submitWork}
        className="space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-5"
      >
        <h3 className="text-lg font-semibold">Submit Completed Work</h3>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Select Task
          </label>

          <select
            value={selectedTask}
            onChange={(e) => setSelectedTask(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          >
            <option value="">Task select karein</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} - Rs. {Number(task.reward_amount)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Completed Work Details
          </label>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            placeholder="Apne completed work ki details likhein..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Proof Link (Optional)
          </label>

          <input
            type="url"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            placeholder="Google Drive ya work ka link"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          />
        </div>

        <button
          type="submit"
          disabled={saving || tasks.length === 0}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Submitting..." : "Submit Work"}
        </button>
      </form>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
        <h3 className="mb-4 text-lg font-semibold">My Work History</h3>

        {submissions.length === 0 ? (
          <p className="text-sm text-gray-400">
            Abhi tak aapne koi work submit nahi kiya.
          </p>
        ) : (
          <div className="space-y-3">
            {submissions.map((item) => {
              const task = tasks.find((t) => t.id === item.task_id);

              return (
                <div
                  key={item.id}
                  className="rounded-lg border border-gray-700 bg-gray-800 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {task?.title || "Submitted Task"}
                    </p>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        item.status === "approved"
                          ? "bg-green-900 text-green-300"
                          : item.status === "rejected"
                          ? "bg-red-900 text-red-300"
                          : "bg-yellow-900 text-yellow-300"
                      }`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-gray-300">
                    {item.work_description}
                  </p>

                  {item.proof_url && (
                    <a
                      href={item.proof_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm text-blue-400 underline"
                    >
                      View Proof
                    </a>
                  )}

                  <p className="mt-2 text-sm text-green-400">
                    Approved Earning: Rs.{" "}
                    {Number(item.earning_amount).toLocaleString("en-PK")}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Submitted: {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
