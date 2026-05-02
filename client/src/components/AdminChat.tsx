import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

interface Message {
  from: string;
  role: "user" | "admin";
  message: string;
  timestamp: string;
}

interface TouristUser {
  userId: string;
  name: string;
  room: string;
}

const AdminChat = ({ adminName }: { adminName: string }) => {
  const [rooms, setRooms]         = useState<Record<string, Message[]>>({});
  const [users, setUsers]         = useState<TouristUser[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [input, setInput]         = useState("");
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket = io("http://localhost:5000", {
      query: { userId: "admin", role: "admin", name: adminName }
    });

    socket.on("new-user", ({ userId, name, room }: TouristUser) => {
      setUsers(prev =>
        prev.find(u => u.room === room) ? prev : [...prev, { userId, name, room }]
      );
      setRooms(prev => ({ ...prev, [room]: prev[room] || [] }));
    });

    socket.on("new-message-admin", ({ room, ...msg }: { room: string } & Message) => {
      setRooms(prev => ({ ...prev, [room]: [...(prev[room] || []), msg] }));
      if (msg.role === "user") {
        setUnreadMap(prev => ({ ...prev, [room]: (prev[room] || 0) + 1 }));
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rooms, activeRoom]);

  const openRoom = (room: string) => {
    setActiveRoom(room);
    setUnreadMap(prev => ({ ...prev, [room]: 0 }));
  };

  const send = () => {
    if (!input.trim() || !activeRoom) return;
    socket.emit("admin-message", { room: activeRoom, message: input.trim() });
    setInput("");
  };

  const activeMessages = activeRoom ? (rooms[activeRoom] || []) : [];
  const activeUser     = users.find(u => u.room === activeRoom);

  return (
    <div style={{
      display: "flex", height: 520, background: "#0f0f1a",
      borderRadius: 14, overflow: "hidden", border: "1px solid #2a2a40"
    }}>
      {/* ── Left: Tourist list ── */}
      <div style={{ width: 210, background: "#13132a", borderRight: "1px solid #2a2a40", display: "flex", flexDirection: "column" }}>
        <div style={{
          padding: "14px 16px", fontWeight: 700, color: "#ff4d4d",
          fontSize: 13, borderBottom: "1px solid #2a2a40", letterSpacing: 0.5
        }}>
          🛡️ ONLINE TOURISTS
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {users.length === 0 && (
            <p style={{ padding: 16, color: "#444", fontSize: 12 }}>
              Waiting for tourists to connect...
            </p>
          )}
          {users.map(u => (
            <div
              key={u.room}
              onClick={() => openRoom(u.room)}
              style={{
                padding: "11px 16px", cursor: "pointer",
                background: activeRoom === u.room ? "#1e1e40" : "transparent",
                borderBottom: "1px solid #1a1a2e", color: "white",
                display: "flex", justifyContent: "space-between", alignItems: "center",
                transition: "background 0.2s"
              }}
            >
              <span style={{ fontSize: 13 }}>👤 {u.name}</span>
              {(unreadMap[u.room] || 0) > 0 && (
                <span style={{
                  background: "#ff4d4d", borderRadius: 10,
                  padding: "2px 7px", fontSize: 11, fontWeight: 700, color: "white"
                }}>
                  {unreadMap[u.room]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right: Chat area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Chat header */}
        <div style={{
          padding: "12px 16px", borderBottom: "1px solid #2a2a40",
          color: activeUser ? "#f1c40f" : "#444", fontSize: 13, fontWeight: 600
        }}>
          {activeUser ? `💬 Chatting with ${activeUser.name}` : "← Select a tourist to start chatting"}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
          {activeMessages.length === 0 && activeRoom && (
            <p style={{ color: "#444", fontSize: 12, textAlign: "center", marginTop: 20 }}>
              No messages yet. Say hello!
            </p>
          )}
          {activeMessages.map((m, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: m.role === "admin" ? "flex-end" : "flex-start",
              marginBottom: 10
            }}>
              <div style={{
                background: m.role === "admin" ? "#ff4d4d" : "#1e1e40",
                padding: "8px 12px", borderRadius: 10,
                fontSize: 13, color: "white", maxWidth: "75%"
              }}>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 3 }}>{m.from}</div>
                {m.message}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {activeRoom && (
          <div style={{
            display: "flex", padding: 10, gap: 8,
            borderTop: "1px solid #2a2a40", background: "#0f0f1a"
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder={`Reply to ${activeUser?.name}...`}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 8,
                border: "1px solid #333", background: "#1a1a2e",
                color: "white", fontSize: 13, outline: "none"
              }}
            />
            <button
              onClick={send}
              style={{
                background: "#ff4d4d", border: "none", borderRadius: 8,
                color: "white", padding: "8px 16px", cursor: "pointer",
                fontWeight: 700, fontSize: 13
              }}
            >Send</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;
