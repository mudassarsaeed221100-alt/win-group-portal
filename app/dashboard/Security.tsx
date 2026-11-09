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

export default function Security() {
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [sessionStatus, setSessionStatus] = useState("Checking...");
  const [lastSignIn, setLastSignIn] = useState("");
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadSecurityData();
  }, []);

  async function loadSecurityData() {
    setLoading(true);
    setError("");

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      setError(sessionError.message);
      setSessionStatus("Unable to verify");
    } else if (sessionData.session?.user) {
      const user = sessionData.session.user;

      setSessionStatus("Authenticated");
      setEmail(user.email || "Not available");
      setUserId(user.id);
      setLastSignIn(
        user.last_sign_in_at
          ? new Date(user.last_sign_in_at).toLocaleString("en-PK")
          : "Not available"
      );
    } else {
      setSessionStatus("No active session");
    }

    const { data: logData, error: logError } = await supabase
      .from("activity_logs")
      .select("id, action, module, details, created_at")
      .ilike("module", "%security%")
      .order("created_at", { ascending: false })
      .limit(20);

    if (logError) {
      setError((previous) =>
        previous
          ? `${previous} | ${logError.message}`
          : logError.message
      );
    } else {
      setLogs((logData || []) as SecurityLog[]);
    }

    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Security Center
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Account session and available security information.
        </p>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-gray-500">Current Session</p>
            <h3 className="mt-1 text-xl font-bold text-gray-900">
              {sessionStatus}
            </h3>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              sessionStatus === "Authenticated"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {sessionStatus === "Authenticated" ? "Active" : "Check"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Account Email</p>
          <p className="mt-2 break-all font-semibold text-gray-900">
            {email || "Not available"}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">Last Sign In</p>
          <p className="mt-2 font-semibold text-gray-900">
            {lastSignIn || "Not available"}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5 md:col-span-2">
          <p className="text-sm text-gray-500">Current User ID</p>
          <p className="mt-2 break-all text-sm font-medium text-gray-900">
            {userId || "Not available"}
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h3 className="font-bold text-gray-900">
          Security Recommendations
        </h3>

        <ul className="mt-4 list-disc space-y-3 pl-5 text-sm text-gray-600">
          <li>Use a strong and unique password.</li>
          <li>Never share your login credentials with anyone.</li>
          <li>Sign out when using a shared device.</li>
          <li>Give each team member only the permissions they need.</li>
          <li>Review account activity regularly.</li>
        </ul>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4">
          <h3 className="font-bold text-gray-900">
            Security Activity
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Latest security-module logs, if available.
          </p>
        </div>

        {loading ? (
          <p className="p-5 text-sm text-gray-500">
            Checking security information...
          </p>
        ) : logs.length === 0 ? (
          <p className="p-5 text-sm text-gray-500">
            No security activity recorded yet.
          </p>
        ) : (
          <div className="divide-y">
            {logs.map((log) => (
              <div key={log.id} className="p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="font-medium text-gray-900">
                    {log.action}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString("en-PK")}
                  </p>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {log.details || log.module}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={loadSecurityData}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Refresh Security
      </button>
    </div>
  );
}
