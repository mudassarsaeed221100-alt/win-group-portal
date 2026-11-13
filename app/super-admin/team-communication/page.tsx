
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Person = {
  id: string;
  first_name: string | null;
  surname: string | null;
  username: string | null;
  role: string;
  team_code: string | null;
};

type Conversation = {
  id: string;
  title: string | null;
  conversation_type: "private" | "group" | "team";
  team_code: string | null;
  created_at: string;
};

type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  message_text: string;
  created_at: string;
};

type Permission = {
  user_id: string;
  can_send: boolean;
};

export default function TeamCommunicationPage() {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dataError, setDataError] = useState("");
  const [notice, setNotice] = useState("");

  const [myId, setMyId] = useState("");
  const [myRole, setMyRole] = useState("");
  const [myTeamCode, setMyTeamCode] = useState("");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Person[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [availableMembers, setAvailableMembers] = useState<Person[]>([]);

  const [selectedConversation, setSelectedConversation] = useState("");
  const [messageText, setMessageText] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [chatType, setChatType] = useState<"private" | "group" | "team">("private");
  const [chatTitle, setChatTitle] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeam, setSelectedTeam] = useState("");

  const [permissionLoading, setPermissionLoading] = useState("");

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  }, []);

  const loadData = useCallback(async () => {
    try {
      const token = await getToken();

      if (!token) {
        setDataError("Login session nahi mili. Dobara login karein.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/team-communication", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Data load nahi ho saka.");
      }

      setConversations(result.conversations || []);
      setMembers(result.members || []);
      setProfiles(result.profiles || []);
      setMessages(result.messages || []);
      setPermissions(result.permissions || []);
      setAvailableMembers(result.availableMembers || []);

      setMyId((await supabase.auth.getUser()).data.user?.id || "");

      setSelectedConversation((current) => {
        if (
          current &&
          (result.conversations || []).some(
            (chat: Conversation) => chat.id === current
          )
        ) {
          return current;
        }

        return result.conversations?.[0]?.id || "";
      });

      setDataError("");
    } catch (error: any) {
      setDataError(error.message || "Koi masla aa gaya.");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadData]);

  const currentPermission = permissions.find(
    (permission) => permission.user_id === myId
  );

  const canSend = currentPermission?.can_send !== false;

  const currentChat = conversations.find(
    (chat) => chat.id === selectedConversation
  );

  const currentChatMembers = useMemo(() => {
    if (!selectedConversation) return [];

    const ids = members
      .filter((item) => item.conversation_id === selectedConversation)
      .map((item) => item.user_id);

    return profiles.filter((person) => ids.includes(person.id));
  }, [members, profiles, selectedConversation]);

  const currentMessages = useMemo(() => {
    return messages
      .filter((message) => message.conversation_id === selectedConversation)
      .slice()
      .reverse();
  }, [messages, selectedConversation]);

  function personName(person?: Person | null) {
    if (!person) return "Unknown Member";

    const name = `${person.first_name || ""} ${person.surname || ""}`.trim();

    return name || person.username || "Member";
  }

  function getChatName(chat: Conversation) {
    if (chat.title) return chat.title;

    const chatMembers = members
      .filter((item) => item.conversation_id === chat.id)
      .map((item) => profiles.find((person) => person.id === item.user_id))
      .filter(Boolean) as Person[];

    if (chat.conversation_type === "private") {
      const other = chatMembers.find((person) => person.id !== myId);
      return other ? personName(other) : "Private Chat";
    }

    if (chat.conversation_type === "team") {
      return "Team Chat";
    }

    return "Group Chat";
  }

  function getRoleLabel(role: string) {
    return role.replaceAll("_", " ").replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
  }

  function canManage(person: Person) {
    if (person.id === myId) return false;

    if (myRole === "founder_owner") return true;

    if (person.team_code !== myTeamCode) return false;

    if (myRole === "super_admin") {
      return ["admin", "staff"].includes(person.role);
    }

    if (myRole === "admin") {
      return person.role === "staff";
    }

    return false;
  }

  async function postAction(body: any) {
    const token = await getToken();

    if (!token) {
      throw new Error("Login session nahi mili.");
    }

    const response = await fetch("/api/team-communication", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Request complete nahi hui.");
    }

    return result;
  }

  async function sendMessage() {
    if (!messageText.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      setNotice("");

      await postAction({
        action: "send_message",
        conversationId: selectedConversation,
        messageText: messageText.trim(),
      });

      setMessageText("");
      await loadData();
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setSending(false);
    }
  }

  function toggleSelectedUser(userId: string) {
    setSelectedUsers((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId]
    );
  }

  async function createConversation() {
    if (creating) return;

    if (chatType === "private" && selectedUsers.length !== 1) {
      setNotice("Private chat ke liye aik member select karein.");
      return;
    }

    if (chatType === "group" && selectedUsers.length < 2) {
      setNotice("Group chat ke liye kam az kam 2 members select karein.");
      return;
    }

    if (chatType === "team" && myRole === "founder_owner" && !selectedTeam) {
      setNotice("Team select karein.");
      return;
    }

    try {
      setCreating(true);
      setNotice("");

      const result = await postAction({
        action: "create_conversation",
        conversationType: chatType,
        title: chatTitle.trim(),
        userIds: selectedUsers,
        teamCode:
          chatType === "team" && myRole === "founder_owner"
            ? selectedTeam
            : undefined,
      });

      await loadData();

      setSelectedConversation(result.conversation.id);
      setShowCreate(false);
      setChatTitle("");
      setSelectedUsers([]);
      setSelectedTeam("");
      setNotice("Chat successfully create ho gayi.");
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function changePermission(person: Person, canSendValue: boolean) {
    try {
      setPermissionLoading(person.id);
      setNotice("");

      await postAction({
        action: "change_permission",
        targetUserId: person.id,
        canSend: canSendValue,
      });

      await loadData();

      setNotice(
        `${personName(person)} ki chat permission ${
          canSendValue ? "ON" : "OFF"
        } ho gayi.`
      );
    } catch (error: any) {
      setNotice(error.message);
    } finally {
      setPermissionLoading("");
    }
  }

  useEffect(() => {
    async function loadMyProfile() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, team_code")
        .eq("id", data.user.id)
        .single();

      if (profile) {
        setMyRole(profile.role || "");
        setMyTeamCode(profile.team_code || "");
      }
    }

    loadMyProfile();
  }, []);

  const teamCodes = Array.from(
    new Set(
      availableMembers
        .map((person) => person.team_code)
        .filter((code): code is string => Boolean(code))
    )
  );

  const manageableMembers = availableMembers.filter(canManage);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 text-center">
        <p className="text-lg font-semibold text-slate-700">
          Team Communication load ho raha hai...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
              Team Communication Center
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Team members ke sath private aur group communication.
            </p>
          </div>

          <button
            onClick={() => {
              setShowCreate(!showCreate);
              setNotice("");
            }}
            className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            + New Chat
          </button>
        </div>

        {dataError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {dataError}
          </div>
        )}

        {notice && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800">
            {notice}
          </div>
        )}

        {showCreate && (
          <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Create New Chat
              </h2>

              <button
                onClick={() => setShowCreate(false)}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Chat Type
              </label>

              <select
                value={chatType}
                onChange={(event) => {
                  setChatType(
                    event.target.value as "private" | "group" | "team"
                  );
                  setSelectedUsers([]);
                  setNotice("");
                }}
                className="w-full rounded-lg border border-slate-300 p-3"
              >
                <option value="private">Private One-to-One Chat</option>
                <option value="group">Group / Multiple Members</option>
                <option value="team">Complete Team Chat</option>
              </select>
            </div>

            {chatType !== "private" && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Group Name (Optional)
                </label>

                <input
                  value={chatTitle}
                  onChange={(event) => setChatTitle(event.target.value)}
                  placeholder="Group ka naam likhein"
                  className="w-full rounded-lg border border-slate-300 p-3"
                />
              </div>
            )}

            {chatType === "team" && myRole === "founder_owner" && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Select Team Code
                </label>

                <select
                  value={selectedTeam}
                  onChange={(event) => setSelectedTeam(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3"
                >
                  <option value="">Team select karein</option>
                  {teamCodes.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {chatType !== "team" && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Members Select Karein
                </label>

                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
                  {availableMembers.length === 0 && (
                    <p className="text-sm text-slate-500">
                      Koi available member nahi mila.
                    </p>
                  )}

                  {availableMembers
                    .filter((person) => person.id !== myId)
                    .map((person) => (
                      <label
                        key={person.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50"
                      >
                        <input
                          type={chatType === "private" ? "radio" : "checkbox"}
                          checked={selectedUsers.includes(person.id)}
                          onChange={() => {
                            if (chatType === "private") {
                              setSelectedUsers([person.id]);
                            } else {
                              toggleSelectedUser(person.id);
                            }
                          }}
                        />

                        <span className="font-medium text-slate-800">
                          {personName(person)}
                        </span>

                        <span className="ml-auto text-xs text-slate-500">
                          {getRoleLabel(person.role)}
                        </span>
                      </label>
                    ))}
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  {chatType === "private"
                    ? "Private chat mein aik member select karein."
                    : `${selectedUsers.length} members selected`}
                </p>
              </div>
            )}

            <button
              onClick={createConversation}
              disabled={creating}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Chat"}
            </button>
          </section>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
            <h2 className="mb-4 font-bold text-slate-900">
              My Conversations
            </h2>

            {conversations.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                Abhi koi chat nahi hai. New Chat par click karke shuru karein.
              </p>
            ) : (
              <div className="space-y-2">
                {conversations.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedConversation(chat.id)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      selectedConversation === chat.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <p className="font-semibold text-slate-900">
                      {getChatName(chat)}
                    </p>

                    <p className="mt-1 text-xs capitalize text-slate-500">
                      {chat.conversation_type} chat
                    </p>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="flex min-h-[600px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-6">
            {currentChat ? (
              <>
                <div className="border-b border-slate-200 p-4">
                  <h2 className="font-bold text-slate-900">
                    {getChatName(currentChat)}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {currentChatMembers.length} chat members
                  </p>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                  {currentMessages.length === 0 && (
                    <p className="py-12 text-center text-sm text-slate-500">
                      Abhi koi message nahi. Pehla message bhejein.
                    </p>
                  )}

                  {currentMessages.map((message) => {
                    const sender = profiles.find(
                      (person) => person.id === message.sender_id
                    );

                    const ownMessage = message.sender_id === myId;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          ownMessage ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-4 py-3 ${
                            ownMessage
                              ? "bg-blue-600 text-white"
                              : "border border-slate-200 bg-white text-slate-800"
                          }`}
                        >
                          {!ownMessage && (
                            <p className="mb-1 text-xs font-bold text-blue-700">
                              {personName(sender)}
                            </p>
                          )}

                          <p className="whitespace-pre-wrap break-words text-sm">
                            {message.message_text}
                          </p>

                          <p
                            className={`mt-2 text-right text-[10px] ${
                              ownMessage
                                ? "text-blue-100"
                                : "text-slate-400"
                            }`}
                          >
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-200 p-4">
                  {!canSend ? (
                    <div className="rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-800">
                      Aapki chat permission OFF hai. Aap purane messages dekh
                      sakte hain lekin naye messages nahi bhej sakte.
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <textarea
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !event.shiftKey
                          ) {
                            event.preventDefault();
                            sendMessage();
                          }
                        }}
                        placeholder="Apna message likhein..."
                        rows={2}
                        maxLength={5000}
                        className="min-w-0 flex-1 resize-none rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-500"
                      />

                      <button
                        onClick={sendMessage}
                        disabled={sending || !messageText.trim()}
                        className="self-end rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {sending ? "..." : "Send"}
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                <h2 className="text-xl font-bold text-slate-800">
                  Team Communication
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  Chat shuru karne ke liye New Chat par click karein ya apni
                  conversation select karein.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
            <h2 className="mb-3 font-bold text-slate-900">
              Chat Permissions
            </h2>

            <p className="mb-4 text-xs text-slate-500">
              Members ki chat sending permission ON/OFF karein.
            </p>

            {manageableMembers.length === 0 ? (
              <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
                Manage karne ke liye koi member available nahi.
              </p>
            ) : (
              <div className="space-y-3">
                {manageableMembers.map((person) => {
                  const permission = permissions.find(
                    (item) => item.user_id === person.id
                  );

                  const enabled = permission?.can_send !== false;

                  return (
                    <div
                      key={person.id}
                      className="rounded-lg border border-slate-200 p-3"
                    >
                      <p className="font-semibold text-slate-800">
                        {personName(person)}
                      </p>

                      <p className="mb-3 text-xs text-slate-500">
                        {getRoleLabel(person.role)}
                      </p>

                      <button
                        disabled={permissionLoading === person.id}
                        onClick={() =>
                          changePermission(person, !enabled)
                        }
                        className={`w-full rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                          enabled
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-red-600 hover:bg-red-700"
                        }`}
                      >
                        {permissionLoading === person.id
                          ? "Updating..."
                          : enabled
                          ? "Chat ON"
                          : "Chat OFF"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 border-t border-slate-200 pt-4">
              <h3 className="mb-2 font-semibold text-slate-800">
                Work Management
              </h3>

              <a
                href="/super-admin/work-tasks"
                className="block rounded-lg bg-slate-100 px-3 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Open Work Tasks
              </a>

              <a
                href="/super-admin/staff-performance"
                className="mt-2 block rounded-lg bg-slate-100 px-3 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Staff Performance
              </a>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
