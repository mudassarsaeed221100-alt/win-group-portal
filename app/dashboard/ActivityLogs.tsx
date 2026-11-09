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

export default function ActivityLogs() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchLogs();
  }, []);

  async function fetchLogs() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setError(error.message);
      setLogs([]);
    } else {
      setLogs((data || []) as ActivityLog[]);
    }

    setLoading(false);
  }

  const filteredLogs = logs.filter((log) => {
    const text = `${log.action} ${log.module} ${log.details || ""} ${
      log.actor_id || ""
    }`.toLowerCase();

    return text.includes(search.toLowerCase());
  });

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-PK", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Activity Logs
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Recent actions recorded in the WIN GROUP portal.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4">
        <div>
          <p className="text-sm text-gray-500">Recorded Activities</p>
          <h3 className="text-2xl font-bold text-gray-900">
            {logs.length}
          </h3>
        </div>

        <button
          onClick={fetchLogs}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Refresh Logs
        </button>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Search Activities
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search action, module or details..."
          className="w-full rounded-lg border px-4 py-2 text-sm outline-none focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4">
          <h3 className="font-bold text-gray-900">
            Activity History
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            Showing up to 200 latest records.
          </p>
        </div>

        {loading ? (
          <p className="p-6 text-sm text-gray-500">
            Loading activity logs...
          </p>
        ) : filteredLogs.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            No activity logs found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Details</th>
                  <th className="p-3">User ID</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap p-3">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="p-3 font-medium text-gray-900">
                      {log.action}
                    </td>
                    <td className="p-3">{log.module}</td>
                    <td className="p-3">
                      {log.details || "-"}
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {log.actor_id || "Unknown"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
