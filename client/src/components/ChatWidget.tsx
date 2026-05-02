import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

const ChatWidget = ({ user }: { user: { name: string; role: string } }) => {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput]     = useState("");
  const [unread, setUnread]   = useState(0);

  const userId  = useRef(`user-${Math.random().toString(36).slice(2)}`);
  const bottomRef = useRef<HTMLDivElement>(null);

  // =========================
  // SOCKET CONNECTION
  // =========================
  useEffect(() => {
    socket = io("http://localhost:5000", {
      query: { userId: userId.current, role: "user", name: user.name },
      transports: ["websocket"] // 🔥 important fix
    });

    socket.on("connect", () => {
      console.log("✅ Connected to server:", socket.id);
    });

    socket.on("chat-history", (history: any[]) => {
      console.log("📜 Chat history:", history);
      setMessages(history);
    });

    socket.on("new-message", (msg: any) => {
      console.log("📩 New message:", msg);
      setMessages(prev => [...prev, msg]);

      if (msg.role === "admin") {
        setUnread(u => u + 1);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected from server");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // =========================
  // AUTO SCROLL
  // =========================
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (open) setUnread(0);
  }, [messages, open]);

  // =========================
  // SEND MESSAGE
  // =========================
  const send = () => {
    if (!input.trim()) return;

    if (!socket || !socket.connected) {
      alert("Socket not connected!");
      return;
    }

    const msgData = {
      userId: userId.current,
      name: user.name,
      message: input.trim()
    };

    console.log("📤 Sending:", msgData);

    socket.emit("tourist-message", msgData);

    // OPTIONAL: show instantly (optimistic UI)
    setMessages(prev => [
      ...prev,
      {
        from: user.name,
        role: "user",
        message: input.trim()
      }
    ]);

    setInput("");
  };

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
      {open && (
        <div style={{
          width: 300, height: 420, background: "#1a1a2e",
          border: "1px solid #ff4d4d", borderRadius: 14,
          display: "flex", flexDirection: "column", marginBottom: 10,
          boxShadow: "0 8px 32px rgba(255,77,77,0.2)"
        }}>
          {/* Header */}
          <div style={{
            padding: "10px 14px", background: "#ff4d4d",
            borderRadius: "14px 14px 0 0", fontWeight: 700,
            color: "white", fontSize: 14
          }}>
            💬 Chat with Authority
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
            {messages.length === 0 && (
              <p style={{ color: "#555", fontSize: 12, textAlign: "center", marginTop: 20 }}>
                Send a message to connect with an authority officer.
              </p>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: m.role === "admin" ? "flex-start" : "flex-end",
                marginBottom: 8
              }}>
                <div style={{
                  background: m.role === "admin" ? "#2c2c54" : "#ff4d4d",
                  padding: "7px 11px", borderRadius: 10,
                  fontSize: 13, color: "white", maxWidth: "80%"
                }}>
                  {/* 🔥 FIX HERE */}
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>
                    {m.from || m.sender_name}
                  </div>
                  {m.message}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ display: "flex", padding: 8, gap: 6, borderTop: "1px solid #2a2a40" }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Type a message..."
              style={{
                flex: 1, padding: "7px 10px", borderRadius: 8,
                border: "1px solid #333", background: "#111",
                color: "white", fontSize: 13, outline: "none"
              }}
            />
            <button
              onClick={send}
              style={{
                background: "#ff4d4d", border: "none", borderRadius: 8,
                color: "white", padding: "7px 13px", cursor: "pointer",
                fontWeight: 600, fontSize: 13
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: "#ff4d4d", border: "none", borderRadius: "50%",
            width: 54, height: 54, fontSize: 24, cursor: "pointer",
            position: "relative", boxShadow: "0 4px 16px rgba(255,77,77,0.4)"
          }}
        >
          💬
          {unread > 0 && (
            <span style={{
              position: "absolute", top: 2, right: 2,
              background: "#f1c40f", borderRadius: "50%",
              width: 18, height: 18, fontSize: 11, fontWeight: 700,
              color: "#000", display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              {unread}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatWidget;