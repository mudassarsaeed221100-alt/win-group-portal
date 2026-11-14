"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type Task = { id: string; text: string; assigned_to: string; status: string; due_date: string | null };
type Sub = { id: string; task_id: string; user_id: string; status: string; earning_amount: number | null; reviewed_at: string | null; created_at: string };
type Msg = { id: string; sender_id: string; content: string; created_at: string };
type Person = { id: string; username: string; first_name: string | null; surname: string | null; phone: string | null };
type Me = { first_name: string | null; surname: string | null; phone: string | null; avatar_url: string | null; username: string; role: string; team_code: string | null };

const modules = [
  { name: "Create Staff", href: "/super-admin/create-staff", icon: "◈", desc: "Staff banayein aur manage karein" },
  { name: "Team Management", href: "/super-admin/team-management", icon: "☷", desc: "Team members aur team code" },
  { name: "Work Tasks", href: "/super-admin/work-tasks", icon: "▣", desc: "Staff ko tasks dein" },
  { name: "Submissions", href: "/super-admin/submissions", icon: "▤", desc: "Kaam approve ya reject karein" },
  { name: "Staff Performance", href: "/super-admin/staff-performance", icon: "▥", desc: "Ranking aur report" },
  { name: "Staff Earnings", href: "/super-admin/staff-earnings", icon: "₹", desc: "Staff ki kamai" },
  { name: "Team Communication", href: "/super-admin/team-communication", icon: "✉", desc: "Announcement aur chat" },
];

const box = "w-full rounded-lg border border-slate-700 bg-slate-950 p-3";
const card = "rounded-xl border border-slate-800 bg-slate-900 p-5";

function money(n: number) {
  return "Rs. " + n.toLocaleString("en-PK");
}

export default function SuperAdminHome() {
  const [tab, setTab] = useState<"dashboard" | "profile" | "settings">("dashboard");
  const [myId, setMyId] = useState("");
  const [me, setMe] = useState<Me | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [subs, setSubs] = useState<Sub[]>([]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [avatar, setAvatar] = useState("");
  const [newCode, setNewCode] = useState("");
  const [pass1, setPass1] = useState("");
  const [pass2, setPass2] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Please login first.");
      const uid = data.session.user.id;
      setMyId(uid);

      const { data: p } = await supabase
        .from("profiles")
        .select("first_name, surname, phone, avatar_url, username, role, team_code")
        .eq("id", uid)
        .maybeSingle();
      if (!p) throw new Error("Profile nahi mili.");
      setMe(p);
      setFirstName(p.first_name || "");
      setSurname(p.surname || "");
      setPhone(p.phone || "");
      setAvatar(p.avatar_url || "");

      const res = await fetch("/api/admin/users", {
        headers: { Authorization: "Bearer " + data.session.access_token },
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Staff list load nahi hui.");
      setPeople(result.staff || []);

      const { data: t } = await supabase
        .from("staff_tasks")
        .select("id, text, assigned_to, status, due_date")
        .eq("created_by", uid)
        .order("created_at", { ascending: false });
      setTasks(t || []);

      if (t && t.length > 0) {
        const { data: s } = await supabase
          .from("submissions")
          .select("id, task_id, user_id, status, earning_amount, reviewed_at, created_at")
          .in("task_id", t.map((x) => x.id))
          .order("created_at", { ascending: false });
        setSubs(s || []);
      } else setSubs([]);

      if (p.team_code) {
        const { data: m } = await supabase
          .from("team_messages")
          .select("id, sender_id, content, created_at")
          .eq("team_code", p.team_code)
          .is("receiver_id", null)
          .order("created_at", { ascending: false })
          .limit(5);
        setMsgs(m || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Data load nahi hua.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function go(t: "dashboard" | "profile" | "settings") {
    setTab(t);
    setMessage("");
    setError("");
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    const { error } = await supabase
      .from("profiles")
      .update({ first_name: firstName.trim(), surname: surname.trim(), phone: phone.trim() || null, avatar_url: avatar.trim() || null })
      .eq("id", myId);
    setBusy(false);
    if (error) return setError(error.message);
    setMessage("Profile update ho gayi! Sidebar mein naya naam dekhne ke liye page refresh karein.");
    load();
  }

  async function changeCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    if (!confirm("Team Code badalne se poori team ka code badal jayega. Aage barhein?")) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("change_team_code", { new_code: newCode });
    setBusy(false);
    if (error) return setError(error.message);
    setNewCode("");
    setMessage("Team Code badal kar " + data + " ho gaya!");
    load();
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");
    if (pass1.length < 8) return setError("Password kam az kam 8 characters ka ho.");
    if (pass1 !== pass2) return setError("Dono password ek jaise nahi hain.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pass1 });
    setBusy(false);
    if (error) return setError(error.message);
    setPass1("");
    setPass2("");
    setMessage("Password badal gaya!");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const pendingTasks = tasks.filter((t) => t.status !== "completed").length;
  const lateTasks = tasks.filter((t) => t.status !== "completed" && t.due_date && new Date(t.due_date) < today).length;
  const pendingSubs = subs.filter((s) => s.status === "pending").length;
  const monthEarning = subs
    .filter((s) => s.status === "approved" && new Date(s.reviewed_at || s.created_at) >= monthStart)
    .reduce((sum, s) => sum + Number(s.earning_amount || 0), 0);

  const nameOf = (id: string) => {
    if (id === myId) return "Aap";
    const p = people.find((x) => x.id === id);
    return p ? [p.first_name, p.surname].filter(Boolean).join(" ") || p.username : "Staff";
  };
  const taskName = (id: string) => tasks.find((t) => t.id === id)?.text || "Task";
  const myName = [me?.first_name, me?.surname].filter(Boolean).join(" ") || me?.username || "";
  const term = search.toLowerCase().trim();
  const found = term
    ? people.filter((p) => ([p.first_name, p.surname, p.username].join(" ") + " " + (p.phone || "")).toLowerCase().includes(term))
    : [];

  const stats = [
    { title: "Total Staff", value: String(people.length), icon: "◈" },
    { title: "Pending Tasks", value: String(pendingTasks), icon: "▣" },
    { title: "Late Tasks", value: String(lateTasks), icon: "◷" },
    { title: "Pending Submissions", value: String(pendingSubs), icon: "▤" },
    { title: "Is Mahine ki Kamai", value: money(monthEarning), icon: "₹" },
  ];

  const tabBtn = (active: boolean) =>
    "rounded-lg border px-4 py-2 text-sm " + (active ? "bg-blue-600 border-slate-700 font-semibold" : "border-slate-700 text-slate-300 hover:bg-slate-800");

  if (loading) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => go("dashboard")} className={tabBtn(tab === "dashboard")}>◆ Dashboard</button>
        <button onClick={() => go("profile")} className={tabBtn(tab === "profile")}>◉ Profile Edit</button>
        <button onClick={() => go("settings")} className={tabBtn(tab === "settings")}>⚙ Settings</button>
        <button onClick={load} className="ml-auto rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800">↻ Refresh</button>
      </div>

      {message && <div className="rounded-lg border border-green-800 bg-green-900/30 p-3 text-green-300">{message}</div>}
      {error && <div className="rounded-lg border border-red-800 bg-red-900/30 p-3 text-red-300">{error}</div>}

      {tab === "dashboard" && (
        <>
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-7">
            <p className="text-xs tracking-widest text-slate-400">◆ &nbsp; SUPER ADMIN CONTROL CENTER</p>
            <h2 className="mt-3 text-3xl font-bold">Welcome, {myName}</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Apni team, tasks, submissions aur kamai ko ek hi jagah se manage karein.
            </p>
            <span className="mt-4 inline-block rounded border border-slate-700 px-3 py-1 text-xs tracking-widest text-slate-300">
              TEAM CODE: {me?.team_code || "—"}
            </span>
          </section>

          {pendingSubs > 0 && (
            <Link href="/super-admin/submissions" className="block rounded-xl border border-yellow-700 bg-yellow-900/20 p-4 text-yellow-300">
              ⚠ {pendingSubs} submission approve hone ka intezar kar rahi hain. Dekhne ke liye click karein →
            </Link>
          )}
          {lateTasks > 0 && (
            <Link href="/super-admin/staff-performance" className="block rounded-xl border border-red-800 bg-red-900/20 p-4 text-red-300">
              ◷ {lateTasks} task ki deadline guzar chuki hai. Dekhne ke liye click karein →
            </Link>
          )}

          <div>
            <p className="text-xs tracking-widest text-slate-400">ORGANIZATION</p>
            <h3 className="mb-4 mt-1 text-lg font-semibold">Team Overview</h3>
            <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
              {stats.map((s) => (
                <div key={s.title} className={card}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{s.title}</span>
                    <span className="grid h-8 w-8 place-items-center rounded-lg border border-slate-700">{s.icon}</span>
                  </div>
                  <h2 className="mt-3 text-2xl font-bold">{s.value}</h2>
                </div>
              ))}
            </div>
          </div>

          <section className={card}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} className={box} placeholder="⌕ Staff dhoondein (naam, username, phone)..." />
            {term && (
              <div className="mt-3 text-sm">
                {found.length === 0 ? (
                  <p className="text-slate-400">Koi staff nahi mila.</p>
                ) : (
                  found.map((p) => (
                    <div key={p.id} className="flex justify-between border-t border-slate-800 py-2">
                      <span>{nameOf(p.id)} <span className="text-slate-500">@{p.username}</span></span>
                      <span className="text-slate-400">{p.phone || "—"}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>

          <div>
            <p className="text-xs tracking-widest text-slate-400">QUICK ACCESS</p>
            <h3 className="mb-4 mt-1 text-lg font-semibold">Modules</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {modules.map((m) => (
                <Link key={m.href} href={m.href} className={card + " hover:bg-slate-800"}>
                  <div className="text-2xl">{m.icon}</div>
                  <h3 className="mt-3 font-semibold">{m.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{m.desc}</p>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <section className={card}>
              <h2 className="mb-3 font-semibold">▣ Naye Tasks</h2>
              {tasks.length === 0 ? <p className="text-sm text-slate-400">Abhi koi task nahi.</p> : tasks.slice(0, 5).map((t) => (
                <div key={t.id} className="border-t border-slate-800 py-2 text-sm">
                  <p className="font-medium">{t.text}</p>
                  <p className="text-xs text-slate-400">{nameOf(t.assigned_to)} · {t.status}</p>
                </div>
              ))}
            </section>
            <section className={card}>
              <h2 className="mb-3 font-semibold">▤ Nayi Submissions</h2>
              {subs.length === 0 ? <p className="text-sm text-slate-400">Abhi koi submission nahi.</p> : subs.slice(0, 5).map((s) => (
                <div key={s.id} className="border-t border-slate-800 py-2 text-sm">
                  <p className="font-medium">{nameOf(s.user_id)}</p>
                  <p className="text-xs text-slate-400">{taskName(s.task_id)} · {s.status}</p>
                </div>
              ))}
            </section>
            <section className={card}>
              <h2 className="mb-3 font-semibold">✉ Announcements</h2>
              {msgs.length === 0 ? <p className="text-sm text-slate-400">Abhi koi announcement nahi.</p> : msgs.map((m) => (
                <div key={m.id} className="border-t border-slate-800 py-2 text-sm">
                  <p>{m.content}</p>
                  <p className="text-xs text-slate-400">{nameOf(m.sender_id)} · {new Date(m.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </section>
          </div>
        </>
      )}

      {tab === "profile" && (
        <form onSubmit={saveProfile} className={card + " max-w-2xl space-y-4"}>
          <h2 className="text-xl font-semibold">◉ Profile Edit</h2>
          <p className="text-sm text-slate-400">@{me?.username} · {me?.role === "super_admin" ? "Super Admin" : "Admin"}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={box} placeholder="First Name" />
            <input value={surname} onChange={(e) => setSurname(e.target.value)} className={box} placeholder="Surname" />
          </div>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={box} placeholder="Phone Number" />
          <input value={avatar} onChange={(e) => setAvatar(e.target.value)} className={box} placeholder="Profile photo ka link (https://...)" />
          <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-6 py-3 font-semibold disabled:opacity-50">
            {busy ? "Saving..." : "Save Profile"}
          </button>
        </form>
      )}

      {tab === "settings" && (
        <div className="max-w-2xl space-y-5">
          <section className={card + " space-y-4"}>
            <h2 className="text-xl font-semibold">◇ Team Code</h2>
            <p className="text-slate-400">Maujooda code: <b className="text-white">{me?.team_code || "—"}</b></p>
            {me?.role === "super_admin" ? (
              <form onSubmit={changeCode} className="flex flex-wrap gap-3">
                <input required value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())} className={box + " flex-1"} placeholder="Naya Team Code (jaise WIN01)" />
                <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-5 font-semibold disabled:opacity-50">Update</button>
              </form>
            ) : (
              <p className="text-sm text-slate-500">Team Code sirf Super Admin badal sakta hai.</p>
            )}
          </section>
          <form onSubmit={changePassword} className={card + " space-y-4"}>
            <h2 className="text-xl font-semibold">⚙ Password Badlein</h2>
            <input type="password" value={pass1} onChange={(e) => setPass1(e.target.value)} className={box} placeholder="Naya password (kam az kam 8)" />
            <input type="password" value={pass2} onChange={(e) => setPass2(e.target.value)} className={box} placeholder="Naya password dobara" />
            <button type="submit" disabled={busy} className="rounded-lg bg-blue-600 px-6 py-3 font-semibold disabled:opacity-50">
              {busy ? "Saving..." : "Change Password"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
