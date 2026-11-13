
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

function reply(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

async function getUser(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) return null;

  return data.user;
}

async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, first_name, surname, username, role, team_code")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return data;
}

async function canManageMember(actor: any, target: any) {
  if (actor.id === target.id) return false;

  if (actor.role === "founder_owner") return true;

  if (actor.team_code !== target.team_code) return false;

  if (actor.role === "super_admin") {
    return ["admin", "staff"].includes(target.role);
  }

  if (actor.role === "admin") {
    return target.role === "staff";
  }

  return false;
}

// GET: Chats, team members, messages aur permissions
export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request);

    if (!user) {
      return reply({ error: "Unauthorized. Please login." }, 401);
    }

    const profile = await getProfile(user.id);

    if (!profile) {
      return reply({ error: "Profile not found." }, 404);
    }

    // Available members
    let availableMembersQuery = supabaseAdmin
      .from("profiles")
      .select("id, first_name, surname, username, role, team_code");

    if (profile.role === "founder_owner") {
      availableMembersQuery = availableMembersQuery.in(
        "role",
        ["super_admin", "admin", "staff"]
      );
    } else if (profile.role === "super_admin") {
      availableMembersQuery = availableMembersQuery
        .eq("team_code", profile.team_code)
        .in("role", ["admin", "staff"]);
    } else if (profile.role === "admin") {
      availableMembersQuery = availableMembersQuery
        .eq("team_code", profile.team_code)
        .eq("role", "staff");
    } else {
      availableMembersQuery = availableMembersQuery.eq("id", user.id);
    }

    const { data: availableMembers, error: availableError } =
      await availableMembersQuery.order("first_name");

    if (availableError) {
      return reply({ error: availableError.message }, 500);
    }

    const { data: memberships, error: memberError } =
      await supabaseAdmin
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", user.id);

    if (memberError) {
      return reply({ error: memberError.message }, 500);
    }

    const conversationIds = [
      ...new Set(
        (memberships || []).map((item) => item.conversation_id)
      ),
    ];

    if (conversationIds.length === 0) {
      return reply({
        conversations: [],
        members: [],
        profiles: [],
        messages: [],
        permissions: [],
        availableMembers: availableMembers || [],
      });
    }

    const { data: conversations, error: conversationError } =
      await supabaseAdmin
        .from("conversations")
        .select("*")
        .in("id", conversationIds)
        .order("created_at", { ascending: false });

    if (conversationError) {
      return reply({ error: conversationError.message }, 500);
    }

    const { data: members, error: membersError } =
      await supabaseAdmin
        .from("conversation_members")
        .select("*")
        .in("conversation_id", conversationIds);

    if (membersError) {
      return reply({ error: membersError.message }, 500);
    }

    const memberIds = [
      ...new Set((members || []).map((item) => item.user_id)),
    ];

    let profiles: any[] = [];
    let permissions: any[] = [];

    if (memberIds.length > 0) {
      const { data: profileData, error: profilesError } =
        await supabaseAdmin
          .from("profiles")
          .select("id, first_name, surname, username, role, team_code")
          .in("id", memberIds);

      if (profilesError) {
        return reply({ error: profilesError.message }, 500);
      }

      profiles = profileData || [];

      const { data: permissionData, error: permissionsError } =
        await supabaseAdmin
          .from("chat_permissions")
          .select("*")
          .in("user_id", memberIds);

      if (permissionsError) {
        return reply({ error: permissionsError.message }, 500);
      }

      permissions = permissionData || [];
    }

    const { data: messages, error: messagesError } =
      await supabaseAdmin
        .from("messages")
        .select("*")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false })
        .limit(200);

    if (messagesError) {
      return reply({ error: messagesError.message }, 500);
    }

    return reply({
      conversations: conversations || [],
      members: members || [],
      profiles,
      messages: messages || [],
      permissions,
      availableMembers: availableMembers || [],
    });
  } catch (error: any) {
    return reply({ error: error.message || "Server error." }, 500);
  }
}

// POST: Chat create, message send aur Chat ON/OFF
export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request);

    if (!user) {
      return reply({ error: "Unauthorized. Please login." }, 401);
    }

    const actor = await getProfile(user.id);

    if (!actor) {
      return reply({ error: "Profile not found." }, 404);
    }

    const body = await request.json();
    const { action } = body;

    // SEND MESSAGE
    if (action === "send_message") {
      const conversationId = body.conversationId;
      const messageText = String(body.messageText || "").trim();

      if (!conversationId || !messageText) {
        return reply({
          error: "Chat and message are required.",
        }, 400);
      }

      if (messageText.length > 5000) {
        return reply({ error: "Message is too long." }, 400);
      }

      const { data: membership } = await supabaseAdmin
        .from("conversation_members")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!membership) {
        return reply({
          error: "You are not a member of this chat.",
        }, 403);
      }

      const { data: permission } = await supabaseAdmin
        .from("chat_permissions")
        .select("can_send")
        .eq("user_id", user.id)
        .maybeSingle();

      if (permission && permission.can_send === false) {
        return reply({
          error: "Your chat permission is OFF. You cannot send messages.",
        }, 403);
      }

      const { data: message, error } = await supabaseAdmin
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          message_text: messageText,
        })
        .select("*")
        .single();

      if (error) {
        return reply({ error: error.message }, 500);
      }

      return reply({ success: true, message });
    }

    // CREATE PRIVATE, GROUP OR TEAM CHAT
    if (action === "create_conversation") {
      const conversationType = body.conversationType;
      const title = String(body.title || "").trim() || null;

      const rawUserIds: unknown[] = Array.isArray(body.userIds)
        ? body.userIds
        : [];

      const selectedIds: string[] = [
        ...new Set(
          rawUserIds.filter(
            (id): id is string => typeof id === "string"
          )
        ),
      ];

      if (!["private", "group", "team"].includes(conversationType)) {
        return reply({ error: "Invalid chat type." }, 400);
      }

      let teamCode = actor.team_code;

      if (actor.role === "founder_owner" && body.teamCode) {
        teamCode = body.teamCode;
      }

      if (conversationType === "team") {
        if (!teamCode) {
          return reply({ error: "Team Code is required." }, 400);
        }

        const { data: teamProfiles, error } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("team_code", teamCode)
          .in("role", ["super_admin", "admin", "staff"]);

        if (error) {
          return reply({ error: error.message }, 500);
        }

        selectedIds.push(
          ...(teamProfiles || []).map((person) => person.id)
        );
      }

      const allMemberIds = [...new Set([...selectedIds, user.id])];

      if (
        conversationType === "private" &&
        allMemberIds.length !== 2
      ) {
        return reply({
          error: "Private chat must contain exactly two members.",
        }, 400);
      }

      if (
        ["group", "team"].includes(conversationType) &&
        allMemberIds.length < 2
      ) {
        return reply({
          error: "At least one other member is required.",
        }, 400);
      }

      const { data: selectedProfiles, error: selectedError } =
        await supabaseAdmin
          .from("profiles")
          .select("id, role, team_code")
          .in("id", allMemberIds);

      if (selectedError) {
        return reply({ error: selectedError.message }, 500);
      }

      if (
        !selectedProfiles ||
        selectedProfiles.length !== allMemberIds.length
      ) {
        return reply({
          error: "One or more members were not found.",
        }, 404);
      }

      if (actor.role !== "founder_owner") {
        const invalidMember = selectedProfiles.some(
          (person) => person.team_code !== actor.team_code
        );

        if (invalidMember) {
          return reply({
            error: "You can only create chats with your own team members.",
          }, 403);
        }

        if (actor.role === "admin") {
          const invalidRole = selectedProfiles.some(
            (person) =>
              person.id !== user.id && person.role !== "staff"
          );

          if (invalidRole) {
            return reply({
              error: "Admin can only create chats with Staff members.",
            }, 403);
          }
        }

        if (actor.role === "super_admin") {
          const invalidRole = selectedProfiles.some(
            (person) =>
              person.id !== user.id &&
              !["admin", "staff"].includes(person.role)
          );

          if (invalidRole) {
            return reply({
              error: "You can only chat with Admin and Staff members.",
            }, 403);
          }
        }
      }

      const { data: conversation, error: createError } =
        await supabaseAdmin
          .from("conversations")
          .insert({
            title,
            conversation_type: conversationType,
            team_code: teamCode,
            created_by: user.id,
          })
          .select("*")
          .single();

      if (createError) {
        return reply({ error: createError.message }, 500);
      }

      const memberRows = allMemberIds.map((memberId) => ({
        conversation_id: conversation.id,
        user_id: memberId,
      }));

      const { error: insertMembersError } = await supabaseAdmin
        .from("conversation_members")
        .insert(memberRows);

      if (insertMembersError) {
        await supabaseAdmin
          .from("conversations")
          .delete()
          .eq("id", conversation.id);

        return reply({ error: insertMembersError.message }, 500);
      }

      return reply({ success: true, conversation }, 201);
    }

    // CHANGE CHAT SEND PERMISSION
    if (action === "change_permission") {
      const targetUserId = body.targetUserId;
      const canSend = body.canSend;

      if (
        typeof targetUserId !== "string" ||
        typeof canSend !== "boolean"
      ) {
        return reply({
          error: "Target member and permission value are required.",
        }, 400);
      }

      const target = await getProfile(targetUserId);

      if (!target) {
        return reply({ error: "Member not found." }, 404);
      }

      const allowed = await canManageMember(actor, target);

      if (!allowed) {
        return reply({
          error: "You do not have permission to change this member's chat setting.",
        }, 403);
      }

      const { error } = await supabaseAdmin
        .from("chat_permissions")
        .upsert(
          {
            user_id: targetUserId,
            can_send: canSend,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        return reply({ error: error.message }, 500);
      }

      return reply({
        success: true,
        message: canSend
          ? "Chat permission turned ON."
          : "Chat permission turned OFF.",
      });
    }

    return reply({ error: "Invalid action." }, 400);
  } catch (error: any) {
    return reply({ error: error.message || "Server error." }, 500);
  }
}
