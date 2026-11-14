"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Msg = {
  id: string;
  team_code: string;
  sender_id: string;
  receiver_id: string | null;
  content: string;
  created_at: string;
};

type Staff = { id: string; username: string; first_name: string | null; surname: string | null };

export default function TeamCommunicationPage() {
  const [me, setMe] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [tab, setTab] = useState<"team" | "private">("team");
  const [chatWith, setChatWith] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages(code: string) {
    const { data, error } = await supabase
      .from("team_messages")
      .select("*")
      .eq("team_code", code)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) return setError(error.message);
    setMessages(data || []);
  }

  useEffect(() => {
    let channel: any = null;

    async function init() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Please login first.");
        const userId = data.session.user.id;
        setMe(userId);

        const { data: prof } = await supabase
          .from("profiles")
          .select("team_code")
          .eq("id", userId)
          .maybeSingle();
        if (!prof?.team_code) throw new Error("Aapka Team Code mojood nahi hai.");
        setTeamCode(prof.team_code);

        const res = await fetch("/api/admin/users", {
          headers: { Authorization: "Bearer " + data.session.access_token },
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Staff list load nahi hui.");
        setStaff(result.staff || []);

        await loadMessages(prof.team_code);

        // Live chat
        channel = supabase
          .channel("team-messages")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "team_messages" },
            () => loadMessages(prof.team_code)
          )
          .subscribe();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Data load nahi hua.");
      } finally {
        setLoading(false);
      }
    }

    init();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, tab, chatWith]);

  function nameOf(id: string) {
    if (id === me) return "Aap";
    const p = staff.find((x) => x.id === id);
    if (!p) return "Admin";
    return [p.first_name, p.surname].filter(Boolean).join(" ") || p.username;
  }

  const shown = messages.filter((m) => {
    if (tab === "team") return m.receiver_id === null;
    if (!chatWith) return false;
    return (
      (m.sender_id === me && m.receiver_id === chatWith) ||
      (m.sender_id === chatWith && m.receiver_id === me)
    );
  });

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = text.trim();
    if (!content) return;
    if (tab === "private" && !chatWith) return setError("Pehle Staff select karein.");

    setSending(true);
    setError("");
    const { error } = await supabase.from("team_messages").insert({
      team_code: teamCode,
      sender_id: me,
      receiver_id: tab === "team" ? null : chatWith,
      content,
    });
    setSending(false);
    if (error) return setError(error.message);
    setText("");
    await loadMessages(teamCode);
  }

  async function remove(id: string) {
    if (!confirm("Ye message delete karein?")) return;
    const { error } = await supabase.from("team_messages").delete().eq("id", id);
    if (error) return setError(error.message);
    await loadMessages(teamCode);
  }

  const tabBtn = (active: boolean) =>
    "rounded-lg px-4 py-2 text-sm font-semibold " +
    (active ? "bg-blue-600" : "border border-slate-700 text-slate-300 hover:bg-slate-800");

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-8 text-white">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <div>
          <h1 className="text-3xl font-bold">Team Communication</h1>
          <p className="mt-2 text-slate-400">
            Team ko announcement bhejein ya staff se private baat karein. ⚡ Live
          </p>
        </div>

        {error && <div className="rounded-lg bg-red-900/40 p-3 text-sm text-red-300">{error}</div>}

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setTab("team")} className={tabBtn(tab === "team")}>
            📢 Team Announcement
          </button>
          <button onClick={() => setTab("private")} className={tabBtn(tab === "private")}>
            💬 Private
          </button>
          {tab === "private" && (
            <select
              value={chatWith}
              onChange={(e) => setChatWith(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-sm"
            >
              <option value="">Staff select karein</option>
              {staff.map((p) => (
                <option key={p.id} value={p.id}>{nameOf(p.id)}</option>
              ))}
            </select>
          )}
        </div>

        <section className="h-[55vh] space-y-3 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-4">
          {tab === "private" && !chatWith ? (
            <p className="pt-10 text-center text-slate-400">Baat karne ke liye upar se Staff chunein.</p>
          ) : shown.length === 0 ? (
            <p className="pt-10 text-center text-slate-400">Abhi koi message nahi.</p>
          ) : (
            shown.map((m) => {
              const mine = m.sender_id === me;
              return (
                <div key={m.id} className={"flex " + (mine ? "justify-end" : "justify-start")}>
                  <div className={"max-w-[75%] rounded-2xl px-4 py-2 " + (mine ? "bg-blue-600" : "bg-slate-800")}>
                    <p className="text-xs font-semibold opacity-80">{nameOf(m.sender_id)}</p>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <div className="mt-1 flex items-center justify-end gap-3 text-[11px] opacity-70">
                      <span>{new Date(m.created_at).toLocaleString()}</span>
                      {mine && (
                        <button onClick={() => remove(m.id)} className="hover:text-red-300">
                          🗑️ Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </section>

        <form onSubmit={send} className="flex gap-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tab === "team" ? "Poori team ke liye message..." : "Private message..."}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-950 p-3"
          />
          <button
            type="submit"
            disabled={sending || !text.trim()}
            className="rounded-lg bg-blue-600 px-6 font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? "..." : "Send"}
          </button>
        </form>
      </div>
    </main>
  );
}
