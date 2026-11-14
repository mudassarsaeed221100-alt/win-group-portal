"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Submission = {
  id: string;
  task_id: string;
  user_id: string;
  work_description: string;
  proof_url: string | null;
  status: string;
  earning_amount: number | null;
  reviewed_at: string | null;
  created_at: string;
};

function badge(status: string) {
  if (status === "approved") return "rounded-full px-3 py-1 text-xs font-semibold bg-green-900/50 text-green-300";
  if (status === "rejected") return "rounded-full px-3 py-1 text-xs font-semibold bg-red-900/50 text-red-300";
  return "rounded-full px-3 py-1 text-xs font-semibold bg-orange-900/50 text-orange-300";
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [taskMap, setTaskMap] = useState<Record<string, string>>({});
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  async function loadSubmissions() {
    setLoading(true);
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Please login first.");
      const userId = data.session.user.id;

      // Staff ke naam API se
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: "Bearer " + data.session.access_token },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Staff list load nahi hui.");
      const names: Record<string, string> = {};
      for (const p of result.staff || []) {
        names[p.id] = [p.first_name, p.surname].filter(Boolean).join(" ") || p.username;
      }
      setNameMap(names);

      // Mere banaye hue tasks
      const { data: tasks, error: taskError } = await supabase
        .from("staff_tasks")
        .select("id, text")
        .eq("created_by", userId);
      if (taskError) throw taskError;

      const tMap: Record<string, string> = {};
      for (const t of tasks || []) tMap[t.id] = t.text;
      setTaskMap(tMap);

      if (!tasks || tasks.length === 0) {
        setSubmissions([]);
        return;
      }

      const { data: records, error } = await supabase
        .from("submissions")
        .select("*")
        .in("task_id", tasks.map((t) => t.id))
        .order("created_at", { ascending: false });
      if (error) throw error;

      setSubmissions(records || []);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Data load nahi hua.");
    } finally {
      setLoading(false);
    }
  }

  async function review(sub: Submission, status: "approved" | "rejected") {
    const amount = status === "approved" ? Number(amounts[sub.id] || 0) : 0;
    if (status === "approved" && (!Number.isFinite(amount) || amount < 0)) {
      setMessage("Sahi earning amount likhein.");
      return;
    }

    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setMessage("Dobara login karein.");
      return;
    }

    setProcessing(sub.id);
    setMessage("");

    const { error } = await supabase
      .from("submissions")
      .update({
        status,
        earning_amount: amount,
        reviewed_by: data.session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", sub.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(status === "approved" ? "Submission approve ho gayi." : "Submission reject ho gayi.");
      await loadSubmissions();
    }
    setProcessing(null);
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  const count = (st: string) => submissions.filter((x) => x.status === st).length;
  const shown = filter === "all" ? submissions : submissions.filter((x) => x.status === filter);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Staff Submissions</h1>
            <p className="mt-2 text-slate-400">Staff ka kaam check karein aur earning approve karein.</p>
          </div>
          <button onClick={loadSubmissions} className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700">
            Refresh
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Pending</p>
            <h2 className="mt-2 text-3xl font-bold text-orange-400">{count("pending")}</h2>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Approved</p>
            <h2 className="mt-2 text-3xl font-bold text-green-400">{count("approved")}</h2>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Rejected</p>
            <h2 className="mt-2 text-3xl font-bold text-red-400">{count("rejected")}</h2>
          </div>
        </div>

        {message && <div className="rounded-lg bg-slate-800 p-3 text-sm">{message}</div>}

        <div className="flex justify-end">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm">
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <p className="py-10 text-center text-slate-400">Loading submissions...</p>
        ) : shown.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-slate-400">
            Koi submission nahi mili.
          </div>
        ) : (
          <div className="space-y-4">
            {shown.map((sub) => (
              <div key={sub.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold">{nameMap[sub.user_id] || "Staff"}</h3>
                    <p className="mt-1 text-sm text-slate-400">Task: {taskMap[sub.task_id] || "Task"}</p>
                  </div>
                  <span className={badge(sub.status)}>{sub.status}</span>
                </div>

                <p className="mt-4 text-sm font-semibold text-slate-300">Work Description</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-400">{sub.work_description}</p>

                {sub.proof_url && (
                  <a href={sub.proof_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm font-semibold text-blue-400 underline">
                    View Work Proof
                  </a>
                )}

                <p className="mt-3 text-xs text-slate-500">
                  Submitted: {new Date(sub.created_at).toLocaleString()}
                </p>

                {sub.status === "pending" ? (
                  <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-slate-800 pt-4">
                    <div className="w-full sm:max-w-xs">
                      <label className="mb-1 block text-sm text-slate-300">Staff Earning Amount (Rs.)</label>
                      <input
                        type="number"
                        min="0"
                        value={amounts[sub.id] || ""}
                        onChange={(e) => setAmounts({ ...amounts, [sub.id]: e.target.value })}
                        placeholder="Amount likhein"
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2"
                      />
                    </div>
                    <button onClick={() => review(sub, "approved")} disabled={processing === sub.id} className="rounded-lg bg-green-600 px-4 py-2 hover:bg-green-700 disabled:opacity-50">
                      Approve
                    </button>
                    <button onClick={() => review(sub, "rejected")} disabled={processing === sub.id} className="rounded-lg bg-red-600 px-4 py-2 hover:bg-red-700 disabled:opacity-50">
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 border-t border-slate-800 pt-3 text-sm text-slate-300">
                    Earning Amount: Rs. {sub.earning_amount ?? 0}
                    {sub.reviewed_at && (
                      <p className="mt-1 text-xs text-slate-500">
                        Reviewed: {new Date(sub.reviewed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
