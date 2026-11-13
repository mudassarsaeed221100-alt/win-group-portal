
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Submission = {
  id: string;
  task_id: string;
  user_id: string;
  work_description: string;
  proof_url: string;
  status: string;
  earning_amount: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  task_text?: string;
  staff_name?: string;
};

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  async function loadSubmissions() {
    setLoading(true);
    setMessage("");

    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;

    if (!user) {
      setMessage("Please login first.");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, team_code")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "super_admin") {
      setMessage("Access denied.");
      setLoading(false);
      return;
    }

    const { data: tasks, error: taskError } = await supabase
      .from("staff_tasks")
      .select("id, text")
      .eq("created_by", user.id);

    if (taskError) {
      setMessage(taskError.message);
      setLoading(false);
      return;
    }

    if (!tasks || tasks.length === 0) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const taskIds = tasks.map((task) => task.id);

    const { data: records, error } = await supabase
      .from("submissions")
      .select("*")
      .in("task_id", taskIds)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const userIds = [...new Set((records || []).map((item) => item.user_id))];

    let profiles: any[] = [];

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, first_name, surname, username")
        .in("id", userIds);

      profiles = profileData || [];
    }

    const taskMap = new Map(tasks.map((task) => [task.id, task.text]));
    const profileMap = new Map(
      profiles.map((person) => [
        person.id,
        [person.first_name, person.surname].filter(Boolean).join(" ") ||
          person.username ||
          "Staff",
      ])
    );

    const formatted = (records || []).map((item) => ({
      ...item,
      task_text: taskMap.get(item.task_id) || "Task",
      staff_name: profileMap.get(item.user_id) || "Staff",
    }));

    setSubmissions(formatted);
    setLoading(false);
  }

  async function reviewSubmission(
    submission: Submission,
    status: "approved" | "rejected"
  ) {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      setMessage("Please login again.");
      return;
    }

    const amount =
      status === "approved"
        ? Number(amounts[submission.id] || 0)
        : 0;

    if (status === "approved" && (!Number.isFinite(amount) || amount < 0)) {
      setMessage("Please enter a valid earning amount.");
      return;
    }

    setProcessing(submission.id);
    setMessage("");

    const { error } = await supabase
      .from("submissions")
      .update({
        status,
        earning_amount: amount,
        reviewed_by: data.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", submission.id);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(
        status === "approved"
          ? "Submission approved successfully."
          : "Submission rejected."
      );
      await loadSubmissions();
    }

    setProcessing(null);
  }

  useEffect(() => {
    loadSubmissions();
  }, []);

  const pending = submissions.filter((s) => s.status === "pending").length;
  const approved = submissions.filter((s) => s.status === "approved").length;
  const rejected = submissions.filter((s) => s.status === "rejected").length;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Staff Submissions
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Review staff work and approve their earnings.
            </p>
          </div>

          <button
            onClick={loadSubmissions}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Pending</p>
            <h2 className="mt-2 text-2xl font-bold text-orange-600">
              {pending}
            </h2>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Approved</p>
            <h2 className="mt-2 text-2xl font-bold text-green-600">
              {approved}
            </h2>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Rejected</p>
            <h2 className="mt-2 text-2xl font-bold text-red-600">
              {rejected}
            </h2>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-lg border bg-white p-3 text-sm">
            {message}
          </div>
        )}

        {loading ? (
          <p className="py-10 text-center text-gray-500">Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
            No submissions found.
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      {submission.staff_name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Task: {submission.task_text}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      submission.status === "approved"
                        ? "bg-green-100 text-green-700"
                        : submission.status === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {submission.status}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-semibold text-gray-700">
                    Work Description
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                    {submission.work_description}
                  </p>
                </div>

                {submission.proof_url && (
                  <div className="mt-3">
                    <a
                      href={submission.proof_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-blue-600 underline"
                    >
                      View Work Proof
                    </a>
                  </div>
                )}

                <p className="mt-3 text-xs text-gray-400">
                  Submitted: {new Date(submission.created_at).toLocaleString()}
                </p>

                {submission.status === "pending" ? (
                  <div className="mt-5 flex flex-wrap items-end gap-3 border-t pt-4">
                    <div className="w-full sm:max-w-xs">
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Staff Earning Amount (Rs.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={amounts[submission.id] || ""}
                        onChange={(e) =>
                          setAmounts((prev) => ({
                            ...prev,
                            [submission.id]: e.target.value,
                          }))
                        }
                        placeholder="Enter amount"
                        className="w-full rounded-lg border px-3 py-2 outline-none focus:border-blue-500"
                      />
                    </div>

                    <button
                      onClick={() =>
                        reviewSubmission(submission, "approved")
                      }
                      disabled={processing === submission.id}
                      className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>

                    <button
                      onClick={() =>
                        reviewSubmission(submission, "rejected")
                      }
                      disabled={processing === submission.id}
                      className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 border-t pt-3 text-sm text-gray-600">
                    Earning Amount: Rs. {submission.earning_amount ?? 0}
                    {submission.reviewed_at && (
                      <p className="mt-1 text-xs text-gray-400">
                        Reviewed: {new Date(
                          submission.reviewed_at
                        ).toLocaleString()}
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
