import axios from 'axios';
import { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Incident {
    id: number;
    type: string;
    description: string;
    lat: number;
    lng: number;
    status: string;
    created_at: string;
}

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

let socket: Socket;

const AdminDashboard = ({ incidents, refresh }: { incidents: Incident[], refresh: () => void }) => {

    const [rooms, setRooms] = useState<Record<string, Message[]>>({});
    const [users, setUsers] = useState<TouristUser[]>([]);
    const [activeRoom, setActiveRoom] = useState<string | null>(null);
    const [input, setInput] = useState("");
    const bottomRef = useRef<HTMLDivElement>(null);

    // ✅ CONNECT SOCKET
    useEffect(() => {
        socket = io("http://localhost:5000", {
            query: { userId: "admin", role: "admin", name: "Authority" }
        });

        // 🔥 NEW USER CONNECT
        socket.on("new-user", ({ userId, name, room }: TouristUser) => {
            setUsers(prev =>
                prev.find(u => u.room === room) ? prev : [...prev, { userId, name, room }]
            );
            setRooms(prev => ({ ...prev, [room]: prev[room] || [] }));
        });

        // 🔥 RECEIVE MESSAGE
        socket.on("new-message-admin", ({ room, ...msg }: { room: string } & Message) => {
            setRooms(prev => ({
                ...prev,
                [room]: [...(prev[room] || []), msg]
            }));
        });

        // 🔥 IMPORTANT: GET EXISTING ROOMS WHEN ADMIN CONNECTS
        socket.on("chat-history-admin", (data: Record<string, Message[]>) => {
            setRooms(data);

            const userList = Object.keys(data).map(room => ({
                userId: room.replace("room-", ""),
                name: "Tourist",
                room
            }));

            setUsers(userList);
        });

        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [rooms, activeRoom]);

    // ✅ SEND REPLY
    const sendReply = () => {
        if (!input.trim() || !activeRoom) return;

        socket.emit("admin-message", {
            room: activeRoom,
            message: input.trim()
        });

        setInput("");
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("Are you sure you want to remove this alert?")) {
            try {
                await axios.delete(`http://localhost:5000/api/incidents/${id}`);
                refresh();
            } catch (err) {
                console.error("Delete failed", err);
            }
        }
    };

    const activeMessages = activeRoom ? rooms[activeRoom] || [] : [];

    return (
        <div style={{ display: 'flex', gap: '20px', color: 'white' }}>

            {/* INCIDENT PANEL */}
            <div style={{ flex: 1 }}>
                <h2>🚨 Authority Control System</h2>

                <table style={{ width: '100%', marginTop: '20px' }}>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Description</th>
                            <th>Coordinates</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {incidents.map((inc) => (
                            <tr key={inc.id}>
                                <td>{inc.type}</td>
                                <td>{inc.description}</td>
                                <td>{inc.lat}, {inc.lng}</td>
                                <td>
                                    <button onClick={() => handleDelete(inc.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* CHAT PANEL */}
            <div style={{
                width: '350px',
                background: '#1a1a2e',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column'
            }}>

                <h3 style={{ padding: '10px', background: '#ff4d4d' }}>
                    💬 Tourist Chat
                </h3>

                {/* USERS */}
                <div style={{ padding: '10px', borderBottom: '1px solid #333' }}>
                    {users.map(u => (
                        <div
                            key={u.room}
                            onClick={() => setActiveRoom(u.room)}
                            style={{
                                cursor: 'pointer',
                                padding: '5px',
                                background: activeRoom === u.room ? '#333' : 'transparent'
                            }}
                        >
                            👤 {u.name} ({u.room})
                        </div>
                    ))}
                </div>

                {/* MESSAGES */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                    {activeMessages.map((m, i) => (
                        <div key={i} style={{
                            textAlign: m.role === 'admin' ? 'right' : 'left'
                        }}>
                            <p><b>{m.from}:</b> {m.message}</p>
                        </div>
                    ))}
                    <div ref={bottomRef}></div>
                </div>

                {/* INPUT */}
                {activeRoom && (
                    <div style={{ display: 'flex', padding: '10px' }}>
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && sendReply()}
                            style={{ flex: 1 }}
                        />
                        <button onClick={sendReply}>Send</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;