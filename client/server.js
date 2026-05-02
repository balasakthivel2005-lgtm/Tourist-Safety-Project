import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const PORT = 5000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

// --- IN-MEMORY STORAGE ---
let incidents = [];
let nextId = 1;
const chatRooms = {}; // { roomId: Message[] }

// --- HELPERS ---
const isValidIncident = (desc) => {
    const text = desc.toLowerCase().trim();
    if (text.length < 5) return false;
    const keywords = [
        "attack", "theft", "robbery", "accident",
        "fire", "injury", "danger", "unsafe",
        "crime", "emergency", "strike", "protest",
        "harassment", "assault", "vandalism", "bully"
    ];
    return keywords.some(k => text.includes(k));
};

const getSeverity = (desc) => {
    const text = desc.toLowerCase();
    if (text.includes("attack") || text.includes("fire") || text.includes("emergency")) return "HIGH";
    if (text.includes("theft") || text.includes("accident")) return "MEDIUM";
    return "LOW";
};

// --- ROUTES ---

// GET all incidents
app.get('/api/incidents', (req, res) => {
    res.json(incidents);
});

// POST a new incident
app.post('/api/incidents', (req, res) => {
    const { type, description, lat, lng, severity, suggestion } = req.body;

    if (!type || !description) {
        return res.status(400).json({ error: 'type and description are required' });
    }

    if (!isValidIncident(description)) {
        return res.status(400).json({
            error: 'Invalid incident. Use meaningful description like theft, accident, danger.'
        });
    }

    const newIncident = {
        id: nextId++,
        type,
        description,
        lat: lat || 0,
        lng: lng || 0,
        severity: severity || getSeverity(description),
        suggestion: suggestion || '',
        timestamp: new Date().toISOString()
    };

    incidents.push(newIncident);
    console.log('New incident reported:', newIncident);

    res.status(201).json(newIncident);
});

// DELETE an incident
app.delete('/api/incidents/:id', (req, res) => {
    const id = parseInt(req.params.id);
    incidents = incidents.filter(inc => inc.id !== id);
    res.json({ message: 'Incident deleted' });
});

// SOS ROUTE
app.post('/api/sos', (req, res) => {
    const { lat, lng, name } = req.body;
    console.log(`🚨 SOS ALERT from ${name} at ${lat}, ${lng}`);
    res.json({ message: 'SOS received', lat, lng });
});

// --- HTTP SERVER ---
const httpServer = createServer(app);

// --- SOCKET.IO CHAT SETUP ---
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

io.on("connection", (socket) => {
    const { userId, role, name } = socket.handshake.query;

    if (role === "admin") {
        socket.join("admin-room");
        Object.keys(chatRooms).forEach(room => socket.join(room));
        console.log(`[Chat] 🛡️ Admin "${name}" connected`);

    } else {
        const room = `room-${userId}`;
        socket.join(room);
        chatRooms[room] = chatRooms[room] || [];

        socket.emit("chat-history", chatRooms[room]);

        io.to("admin-room").emit("new-user", { userId, name, room });

        io.in("admin-room").socketsJoin(room);

        console.log(`[Chat] 👤 Tourist "${name}" joined ${room}`);
    }

    socket.on("tourist-message", ({ userId, name, message }) => {
        const room = `room-${userId}`;
        const msg = { from: name, role: "user", message, timestamp: new Date() };

        chatRooms[room] = chatRooms[room] || [];
        chatRooms[room].push(msg);

        io.to(room).emit("new-message", msg);
        io.to("admin-room").emit("new-message-admin", { room, ...msg });
    });

    socket.on("admin-message", ({ room, message }) => {
        const msg = { from: "Authority 🛡️", role: "admin", message, timestamp: new Date() };

        chatRooms[room] = chatRooms[room] || [];
        chatRooms[room].push(msg);

        io.to(room).emit("new-message", msg);
        io.to("admin-room").emit("new-message-admin", { room, ...msg });
    });

    socket.on("disconnect", () => {
        console.log(`[Chat] "${name}" disconnected`);
    });
});

// --- START SERVER ---
httpServer.listen(PORT, () => {
    console.log(`✅ SAFE-TOUR backend running at http://localhost:${PORT}`);
});