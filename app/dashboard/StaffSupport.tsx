"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  message: string;
  priority: string;
  status: string;
  admin_reply: string | null;
  created_at: string;
};

export default function StaffSupport() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [userId, setUserId] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [priority, setPriority] = useState("normal");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
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

    const { data, error } = await supabase
      .from("support_tickets")
      .select(
        "id, subject, category, message, priority, status, admin_reply, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Support tickets load nahi huin: " + error.message);
    } else {
      setTickets(data || []);
    }

    setLoading(false);
  }

  async function submitTicket(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!userId || !subject.trim() || !description.trim()) {
      setMessage("Subject aur issue ki details zaroor likhein.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("support_tickets").insert({
      user_id: userId,
      subject: subject.trim(),
      category,
      message: description.trim(),
      priority,
    });

    if (error) {
      setMessage("Ticket submit nahi hui: " + error.message);
    } else {
      setMessage("Aapki support ticket successfully submit ho gayi.");
      setSubject("");
      setCategory("general");
      setPriority("normal");
      setDescription("");
      await loadTickets();
    }

    setSaving(false);
  }

  function statusLabel(status: string) {
    switch (status) {
      case "in_progress":
        return "In Progress";
      case "resolved":
        return "Resolved";
      case "closed":
        return "Closed";
      default:
        return "Open";
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-gray-300">
        Support portal load ho raha hai...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Help & Support</h2>
          <p className="mt-1 text-sm text-gray-400">
            Apna issue ya complaint management ko bhejein.
          </p>
        </div>

        <button
          type="button"
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

      <form
        onSubmit={submitTicket}
        className="space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-5"
      >
        <h3 className="text-lg font-semibold">Submit New Support Ticket</h3>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Subject
          </label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            placeholder="Issue ka short title"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          >
            <option value="general">General Question</option>
            <option value="technical">Technical Issue</option>
            <option value="payment">Payment / Earning</option>
            <option value="work">Work Related</option>
            <option value="account">Account Issue</option>
            <option value="complaint">Complaint</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Priority
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Issue Details
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={5}
            placeholder="Apna issue detail mein likhein..."
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Submitting..." : "Submit Ticket"}
        </button>
      </form>

      <div className="rounded-xl border border-gray-700 bg-gray-900 p-5">
        <h3 className="mb-4 text-lg font-semibold">My Support History</h3>

        {tickets.length === 0 ? (
          <p className="text-sm text-gray-400">
            Abhi tak koi support ticket submit nahi ki.
          </p>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-lg border border-gray-700 bg-gray-800 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold">{ticket.subject}</h4>

                  <span className="rounded-full bg-blue-900 px-3 py-1 text-xs text-blue-200">
                    {statusLabel(ticket.status)}
                  </span>
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Category: {ticket.category} | Priority: {ticket.priority}
                </p>

                <p className="mt-3 whitespace-pre-wrap text-sm text-gray-300">
                  {ticket.message}
                </p>

                {ticket.admin_reply && (
                  <div className="mt-4 rounded-lg border border-green-800 bg-green-950 p-3">
                    <p className="text-sm font-semibold text-green-300">
                      Management Reply
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-200">
                      {ticket.admin_reply}
                    </p>
                  </div>
                )}

                <p className="mt-3 text-xs text-gray-500">
                  Submitted: {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
