"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Ticket = {
  id: string;
  user_id: string;
  subject: string;
  category: string;
  message: string;
  priority: string;
  status: string;
  admin_reply: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export default function FounderSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Tickets load nahi huin: " + error.message);
    } else {
      const rows = (data || []) as Ticket[];
      setTickets(rows);

      const replyValues: Record<string, string> = {};
      const statusValues: Record<string, string> = {};

      rows.forEach((ticket) => {
        replyValues[ticket.id] = ticket.admin_reply || "";
        statusValues[ticket.id] = ticket.status;
      });

      setReplies(replyValues);
      setStatuses(statusValues);
    }

    setLoading(false);
  }

  async function updateTicket(ticket: Ticket) {
    setSavingId(ticket.id);
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const founderId = sessionData.session?.user.id;

    if (!founderId) {
      setMessage("Login session nahi mili. Dobara login karein.");
      setSavingId("");
      return;
    }

    const newStatus = statuses[ticket.id] || ticket.status;
    const newReply = replies[ticket.id] || "";

    const { error } = await supabase
      .from("support_tickets")
      .update({
        status: newStatus,
        admin_reply: newReply.trim() || null,
        reviewed_by: founderId,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticket.id);

    if (error) {
      setMessage("Ticket update nahi hui: " + error.message);
    } else {
      setMessage("Ticket successfully update ho gayi.");
      await loadTickets();
    }

    setSavingId("");
  }

  const filteredTickets =
    filter === "all"
      ? tickets
      : tickets.filter((ticket) => ticket.status === filter);

  const openCount = tickets.filter((t) => t.status === "open").length;
  const progressCount = tickets.filter(
    (t) => t.status === "in_progress"
  ).length;
  const resolvedCount = tickets.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  ).length;

  if (loading) {
    return (
      <div className="p-6 text-gray-300">
        Support tickets load ho rahi hain...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Founder Support Management</h2>
          <p className="mt-1 text-sm text-gray-400">
            Staff ke issues, complaints aur support requests manage karein.
          </p>
        </div>

        <button
          onClick={loadTickets}
          className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm">
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
          <p className="text-sm text-gray-400">Open Tickets</p>
          <p className="mt-2 text-2xl font-bold">{openCount}</p>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
          <p className="text-sm text-gray-400">In Progress</p>
          <p className="mt-2 text-2xl font-bold">{progressCount}</p>
        </div>

        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
          <p className="text-sm text-gray-400">Resolved / Closed</p>
          <p className="mt-2 text-2xl font-bold">{resolvedCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "All Tickets" },
          { value: "open", label: "Open" },
          { value: "in_progress", label: "In Progress" },
          { value: "resolved", label: "Resolved" },
          { value: "closed", label: "Closed" },
        ].map((item) => (
          <button
            key={item.value}
            onClick={() => setFilter(item.value)}
            className={`rounded-lg px-4 py-2 text-sm ${
              filter === item.value
                ? "bg-blue-600 text-white"
                : "border border-gray-700 bg-gray-900 text-gray-300"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredTickets.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-8 text-center">
          <p className="text-gray-400">Is filter mein koi ticket nahi hai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <div
              key={ticket.id}
              className="space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{ticket.subject}</h3>
                  <p className="mt-1 text-xs text-gray-400">
                    User ID: {ticket.user_id}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {ticket.category} · Priority: {ticket.priority}
                  </p>
                </div>

                <span className="rounded-full bg-blue-900 px-3 py-1 text-xs text-blue-200">
                  {ticket.status.replace("_", " ")}
                </span>
              </div>

              <div className="rounded-lg bg-gray-800 p-4">
                <p className="whitespace-pre-wrap text-sm text-gray-300">
                  {ticket.message}
                </p>
                <p className="mt-3 text-xs text-gray-500">
                  Submitted: {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Update Ticket Status
                </label>

                <select
                  value={statuses[ticket.id] || ticket.status}
                  onChange={(e) =>
                    setStatuses((prev) => ({
                      ...prev,
                      [ticket.id]: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Reply to Staff
                </label>

                <textarea
                  rows={3}
                  value={replies[ticket.id] || ""}
                  onChange={(e) =>
                    setReplies((prev) => ({
                      ...prev,
                      [ticket.id]: e.target.value,
                    }))
                  }
                  placeholder="Staff ko apna jawab likhein..."
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
                />
              </div>

              <button
                onClick={() => updateTicket(ticket)}
                disabled={savingId === ticket.id}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {savingId === ticket.id ? "Saving..." : "Save Reply & Status"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
