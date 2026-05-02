// server/chat.js
const setupChat = (httpServer) => {
  const { Server } = require("socket.io");

  const io = new Server(httpServer, {
    cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] }
  });

  const chatRooms = {}; // { roomId: Message[] }

  io.on("connection", (socket) => {
    const { userId, role, name } = socket.handshake.query;

    console.log("🔌 Connected:", name, role);

    if (role === "admin") {
  socket.join("admin-room");

  Object.keys(chatRooms).forEach(room => socket.join(room));

  // ✅ SEND EXISTING CHAT DATA TO ADMIN
  socket.emit("chat-history-admin", chatRooms);
}
      else {
      const room = `room-${userId}`;
      socket.join(room);
      chatRooms[room] = chatRooms[room] || [];

      console.log(`👤 Tourist joined ${room}`);

      // Send chat history to tourist on reconnect
      socket.emit("chat-history", chatRooms[room]);

      // Notify admin panel of new tourist
      io.to("admin-room").emit("new-user", { userId, name, room });

      // ✅ FIX: delay join (important)
      setTimeout(() => {
        io.in("admin-room").socketsJoin(room);
        console.log(`🛠️ Admin forced to join ${room}`);
      }, 100);

      console.log(`[Chat] Tourist "${name}" joined ${room}`);
    }

    // Tourist → Server → Admin
    socket.on("tourist-message", ({ userId, name, message }) => {
      const room = `room-${userId}`;
      const msg  = { from: name, role: "user", message, timestamp: new Date() };

      console.log("📩 Tourist:", message); // ✅ debug

      chatRooms[room] = chatRooms[room] || [];
      chatRooms[room].push(msg);

      io.to(room).emit("new-message", msg); // back to tourist

      // ✅ DEBUG
      console.log("📡 Sending to admin-room");

      io.to("admin-room").emit("new-message-admin", { room, ...msg });
    });

    // Admin → Server → Tourist
    socket.on("admin-message", ({ room, message }) => {
      const msg = { from: "Authority 🛡️", role: "admin", message, timestamp: new Date() };

      console.log("📤 Admin:", message, "→", room); // ✅ debug

      chatRooms[room] = chatRooms[room] || [];
      chatRooms[room].push(msg);

      io.to(room).emit("new-message", msg); // to tourist
      io.to("admin-room").emit("new-message-admin", { room, ...msg });
    });

    socket.on("disconnect", () => {
      console.log(`[Chat] "${name}" disconnected`);
    });
  });
};

module.exports = setupChat;