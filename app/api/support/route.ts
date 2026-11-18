import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as db } from "../../../lib/supabase-admin";

const CLOSED = ["resolved", "closed"];
const nm = (p: any) => (p ? `${p.first_name || ""} ${p.surname || ""}`.trim() || p.username || "User" : "User");
const err = (m: string, s = 400) => NextResponse.json({ error: m }, { status: s });

async function getMe(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  if (!data?.user) return null;
  const { data: p } = await db.from("profiles")
    .select("id, role, team_code, first_name, surname, username").eq("id", data.user.id).single();
  return p;
}

function flags(me: any, t: any, owner: any) {
  const isOwner = t.user_id === me.id;
  let see = isOwner;
  if (me.role === "founder_owner") see = see || !!t.escalated;
  if (["admin", "super_admin"].includes(me.role))
    see = see || (!!owner && owner.role === "staff" && owner.team_code === me.team_code && t.escalated !== "complaint");
  const closed = CLOSED.includes(t.status);
  const canSolve = see && !closed && !isOwner && (me.role === "founder_owner" || !t.escalated);
  const canEscalate = see && !closed && !isOwner && ["admin", "super_admin"].includes(me.role) && !t.escalated;
  return { see, isOwner, closed, canSolve, canEscalate };
}

async function getTicket(id: string) {
  const { data: t } = await db.from("support_tickets").select("*").eq("id", id).single();
  if (!t) return null;
  const { data: owner } = await db.from("profiles")
    .select("id, role, team_code, first_name, surname, username").eq("id", t.user_id).single();
  return { t, owner };
}

async function addMsg(ticket_id: string, me: any, message: string, system = false) {
  await db.from("support_messages").insert({
    ticket_id, sender_id: system ? null : me.id,
    sender_name: system ? "System" : nm(me), sender_role: system ? "system" : me.role, message,
  });
}

export async function GET(req: NextRequest) {
  const me = await getMe(req);
  if (!me) return err("Login karein", 401);

  const ticketId = req.nextUrl.searchParams.get("ticket");
  if (ticketId) {
    const x = await getTicket(ticketId);
    if (!x) return err("Ticket nahi mila", 404);
    if (!flags(me, x.t, x.owner).see) return err("Not allowed", 403);
    const { data } = await db.from("support_messages").select("*")
      .eq("ticket_id", ticketId).order("created_at", { ascending: true });
    let messages = data || [];
    if (messages.length === 0) {
      messages = [{ id: "m0", sender_id: x.t.user_id, sender_name: nm(x.owner), sender_role: x.owner?.role, message: x.t.message, created_at: x.t.created_at }];
      if (x.t.admin_reply) messages.push({ id: "m1", sender_id: x.t.reviewed_by, sender_name: "Jawab", sender_role: "admin", message: x.t.admin_reply, created_at: x.t.reviewed_at || x.t.updated_at });
    }
    return NextResponse.json({ messages });
  }

  let list: any[] = [];
  const { data: own } = await db.from("support_tickets").select("*").eq("user_id", me.id);
  list = own || [];

  if (["admin", "super_admin"].includes(me.role) && me.team_code) {
    const { data: staff } = await db.from("profiles").select("id").eq("role", "staff").eq("team_code", me.team_code);
    const ids = (staff || []).map((s: any) => s.id);
    if (ids.length) {
      const { data } = await db.from("support_tickets").select("*").in("user_id", ids);
      list = list.concat((data || []).filter((t: any) => t.escalated !== "complaint"));
    }
  }
  if (me.role === "founder_owner") {
    const { data } = await db.from("support_tickets").select("*").not("escalated", "is", null);
    list = list.concat((data || []).filter((t: any) => t.user_id !== me.id));
  }

  const userIds = [...new Set(list.map((t) => t.user_id))];
  let people: any[] = [];
  if (userIds.length) {
    const { data } = await db.from("profiles")
      .select("id, role, team_code, first_name, surname, username").in("id", userIds);
    people = data || [];
  }

  const tickets = list.map((t) => {
    const owner = people.find((p) => p.id === t.user_id);
    const f = flags(me, t, owner);
    return { ...t, owner_name: nm(owner), owner_role: owner?.role, can_solve: f.canSolve, can_escalate: f.canEscalate, mine: f.isOwner };
  }).sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

  return NextResponse.json({ me: { id: me.id, role: me.role, name: nm(me) }, tickets });
}

export async function POST(req: NextRequest) {
  const me = await getMe(req);
  if (!me) return err("Login karein", 401);
  const b = await req.json();
  const now = new Date().toISOString();

  if (b.action === "create") {
    if (me.role === "founder_owner") return err("Founder ticket nahi banata");
    if (!b.subject?.trim() || !b.message?.trim()) return err("Subject aur message likhein");
    const escalated = me.role === "staff" ? (b.type === "complaint" ? "complaint" : null) : "help";
    const priority = ["low", "normal", "high", "urgent"].includes(b.priority) ? b.priority : "normal";
    const { data: t, error } = await db.from("support_tickets").insert({
      user_id: me.id, subject: b.subject.trim(), message: b.message.trim(),
      category: b.category || "general", priority, status: "open", escalated,
    }).select().single();
    if (error) return err(error.message);
    await addMsg(t.id, me, b.message.trim());
    return NextResponse.json({ ok: true, id: t.id });
  }

  const x = await getTicket(b.ticket_id || "");
  if (!x) return err("Ticket nahi mila", 404);
  const f = flags(me, x.t, x.owner);
  if (!f.see) return err("Not allowed", 403);

  if (b.action === "send") {
    if (f.closed) return err("Ye chat band ho chuki hai");
    if (!b.message?.trim()) return err("Message likhein");
    await addMsg(x.t.id, me, b.message.trim());
    const status = !f.isOwner && x.t.status === "open" ? "in_progress" : x.t.status;
    await db.from("support_tickets").update({ status, updated_at: now }).eq("id", x.t.id);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "solve") {
    if (!f.canSolve) return err("Aap ye masla band nahi kar sakte", 403);
    await db.from("support_tickets").update({ status: "resolved", reviewed_by: me.id, reviewed_at: now, updated_at: now }).eq("id", x.t.id);
    await addMsg(x.t.id, me, `✅ Masla hal ho gaya (${nm(me)})`, true);
    return NextResponse.json({ ok: true });
  }

  if (b.action === "escalate") {
    if (!f.canEscalate) return err("Founder ko nahi bhej sakte", 403);
    if (!b.reason?.trim()) return err("Wajah likhein");
    await db.from("support_tickets").update({ escalated: "help", escalation_reason: b.reason.trim(), updated_at: now }).eq("id", x.t.id);
    await addMsg(x.t.id, me, `⬆️ ${nm(me)} ne Founder ko bheja. Wajah: ${b.reason.trim()}`, true);
    return NextResponse.json({ ok: true });
  }

  return err("Galat action");
}
