const express = require('express'); 
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2');
const setupChat = require('./chat');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// --- MYSQL CONNECTION ---
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Bala@2005',
    database: 'safetour'
});

db.connect(err => {
    if (err) {
        console.error('❌ DB Connection Failed:', err);
    } else {
        console.log('MySQL Connected');
    }
});
// --- IN-MEMORY (kept as you wrote) ---
let incidents = [];
let nextId = 1;
const chatRooms = {};

// --- HELPERS ---
const isValidIncident = (desc) => {
    const text = desc.toLowerCase().trim();
    if (text.length < 5) return false;
    const keywords = [
        "attack","theft","robbery","accident","fire","injury",
        "danger","unsafe","crime","emergency","strike",
        "protest","harassment","assault","vandalism","bully"
    ];
    return keywords.some(k => text.includes(k));
};

const getSeverity = (desc) => {
    const text = desc.toLowerCase();
    if (text.includes("attack") || text.includes("fire") || text.includes("emergency")) return "HIGH";
    if (text.includes("theft") || text.includes("accident")) return "MEDIUM";
    return "LOW";
};

// ============================================================
// ROUTES
// ============================================================

app.get('/api/incidents', (req, res) => {
    db.query('SELECT * FROM incidents ORDER BY id DESC', (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'DB fetch failed' });
        }
        res.json(results);
    });
});

app.post('/api/incidents', (req, res) => {
    const { type, description, lat, lng, severity, suggestion } = req.body;

    if (!type || !description) {
        return res.status(400).json({ error: 'type and description are required' });
    }

    if (!isValidIncident(description)) {
        return res.status(400).json({
            error: 'Invalid incident.'
        });
    }

    const finalSeverity = severity || getSeverity(description);

    const sql = `
        INSERT INTO incidents (type, description, lat, lng, severity, suggestion)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [type, description, lat || 0, lng || 0, finalSeverity, suggestion || ''], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'DB insert failed' });
        }

        res.status(201).json({
            id: result.insertId,
            type,
            description,
            lat,
            lng,
            severity: finalSeverity,
            suggestion
        });
    });
});

app.delete('/api/incidents/:id', (req, res) => {
    const id = parseInt(req.params.id);

    db.query('DELETE FROM incidents WHERE id = ?', [id], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Delete failed' });
        }

        res.json({ message: 'Incident deleted from DB' });
    });
});

// ============================================================
// SOS ROUTE
// ============================================================
app.post('/api/sos', (req, res) => {
    const { lat, lng, user_id } = req.body;

    db.query(
        `INSERT INTO sos_alerts (name, lat, lng) VALUES (?, ?, ?)`,
        [user_id || 'Unknown', lat, lng],
        (err) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'SOS failed' });
            }

            res.json({ message: '🚨 SOS sent successfully!' });
        }
    );
});

// --- HTTP SERVER ---
const httpServer = createServer(app);

// --- SOCKET.IO ---
const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

// ============================================================
// ✅ CHAT WITH DATABASE (ADDED ONLY)
// ============================================================

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

        // ✅ LOAD FROM DATABASE
        db.query(
            "SELECT * FROM chat_messages WHERE room = ? ORDER BY timestamp ASC",
            [room],
            (err, results) => {
                if (!err) {
                    socket.emit("chat-history", results);
                } else {
                    socket.emit("chat-history", []);
                }
            }
        );

        io.to("admin-room").emit("new-user", { userId, name, room });
        io.in("admin-room").socketsJoin(room);

        console.log(`[Chat] 👤 Tourist "${name}" joined ${room}`);
    }
    socket.on("tourist-message", ({ userId, name, message }) => {
        const room = `room-${userId}`;
        const msg = { from: name, role: "user", message, timestamp: new Date() };
        chatRooms[room] = chatRooms[room] || [];
        chatRooms[room].push(msg);

        // ✅ SAVE TO DB
        db.query(
            "INSERT INTO chat_messages (room, sender_name, role, message) VALUES (?, ?, ?, ?)",
            [room, name, "user", message]
        );
        // ✅ SAVE USER MESSAGE TO DB
        db.query(
    "INSERT INTO chat_messages (room, sender, role, message) VALUES (?, ?, ?, ?)",
    [room, name, "user", message],
    (err) => {
        if (err) console.error("DB Insert Error:", err);
    }
);
        io.to(room).emit("new-message", msg);
        io.to("admin-room").emit("new-message-admin", { room, ...msg });
    });

    // ===============================
    // ADMIN MESSAGE
    // ===============================
    socket.on("admin-message", ({ room, message }) => {
        const msg = { from: "Authority 🛡️", role: "admin", message, timestamp: new Date() };

        chatRooms[room] = chatRooms[room] || [];
        chatRooms[room].push(msg);

        // ✅ SAVE TO DB
        db.query(
            "INSERT INTO chat_messages (room, sender_name, role, message) VALUES (?, ?, ?, ?)",
            [room, "Authority", "admin", message]
        );
        // ✅ SAVE ADMIN MESSAGE TO DB
        db.query(
        "INSERT INTO chat_messages (room, sender, role, message) VALUES (?, ?, ?, ?)",
        [room, "Authority", "admin", message],
        (err) => {
        if (err) console.error("DB Insert Error:", err);
    }
);

        io.to(room).emit("new-message", msg);
        io.to("admin-room").emit("new-message-admin", { room, ...msg });
    });

    socket.on("disconnect", () => {
        console.log(`[Chat] "${name}" disconnected`);
    });
});
httpServer.listen(PORT, () => {
    console.log(`SAFE-TOUR backend running at http://localhost:${PORT}`);
});