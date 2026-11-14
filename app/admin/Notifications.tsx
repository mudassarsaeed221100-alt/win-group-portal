
"use client";

import { useState } from "react";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
  read: boolean;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState("all");

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  function markAsRead(id: number) {
    setNotifications((previous) =>
      previous.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    );
  }

  function markAllAsRead() {
    setNotifications((previous) =>
      previous.map((n) => ({ ...n, read: true }))
    );
  }

  function deleteNotification(id: number) {
    setNotifications((previous) =>
      previous.filter((n) => n.id !== id)
    );
  }

  function clearAll() {
    setNotifications([]);
  }

  return (
    <div className="notifications-page">
      <style jsx>{`
        .notifications-page {
          color: #172033;
          width: 100%;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
          margin-bottom: 22px;
        }
        .header h1 {
          font-size: 25px;
          margin: 0 0 6px;
        }
        .header p {
          color: #64748b;
          margin: 0;
          font-size: 14px;
        }
        .count-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px;
          margin-bottom: 20px;
        }
        .count-card span {
          color: #64748b;
          font-size: 13px;
        }
        .count-card strong {
          display: block;
          font-size: 27px;
          margin-top: 5px;
        }
        .toolbar {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 15px;
        }
        .filters {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        button {
          cursor: pointer;
          border: 1px solid #e2e8f0;
          background: white;
          color: #334155;
          padding: 9px 14px;
          border-radius: 8px;
          font-size: 13px;
        }
        button.active {
          background: #172554;
          color: white;
          border-color: #172554;
        }
        button:disabled {
          opacity: .45;
          cursor: not-allowed;
        }
        .danger {
          color: #dc2626;
          border-color: #fecaca;
        }
        .notification {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          padding: 17px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          gap: 15px;
          align-items: flex-start;
        }
        .notification.unread {
          border-left: 4px solid #2563eb;
          background: #f8fbff;
        }
        .notification h3 {
          margin: 0 0 7px;
          font-size: 15px;
        }
        .notification p {
          margin: 0 0 9px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.5;
        }
        .meta {
          font-size: 11px;
          color: #94a3b8;
        }
        .actions {
          display: flex;
          gap: 7px;
          flex-wrap: wrap;
        }
        .empty {
          background: white;
          border: 1px dashed #cbd5e1;
          border-radius: 12px;
          text-align: center;
          padding: 45px 15px;
          color: #64748b;
        }
        .empty strong {
          display: block;
          color: #334155;
          margin-bottom: 7px;
        }
        @media (max-width: 600px) {
          .notification {
            flex-direction: column;
          }
          .header h1 {
            font-size: 21px;
          }
        }
      `}</style>

      <div className="header">
        <div>
          <h1>Notifications</h1>
          <p>Apni team ki updates aur notifications dekhein.</p>
        </div>
        <button
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
        >
          Mark All as Read
        </button>
      </div>

      <div className="count-card">
        <span>Unread Notifications</span>
        <strong>{unreadCount}</strong>
      </div>

      <div className="toolbar">
        <div className="filters">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={filter === "unread" ? "active" : ""}
            onClick={() => setFilter("unread")}
          >
            Unread
          </button>
          <button
            className={filter === "read" ? "active" : ""}
            onClick={() => setFilter("read")}
          >
            Read
          </button>
        </div>

        <button
          className="danger"
          onClick={clearAll}
          disabled={notifications.length === 0}
        >
          Clear All
        </button>
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="empty">
          <strong>No Notifications</strong>
          Abhi koi notification available nahi hai.
        </div>
      ) : (
        filteredNotifications.map((notification) => (
          <div
            className={`notification ${
              notification.read ? "" : "unread"
            }`}
            key={notification.id}
          >
            <div>
              <h3>{notification.title}</h3>
              <p>{notification.message}</p>
              <div className="meta">
                {notification.type} · {notification.created_at}
              </div>
            </div>

            <div className="actions">
              {!notification.read && (
                <button onClick={() => markAsRead(notification.id)}>
                  Mark Read
                </button>
              )}
              <button
                className="danger"
                onClick={() => deleteNotification(notification.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
