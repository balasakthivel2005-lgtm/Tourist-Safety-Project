import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';
import MapView from './components/MapView';
import SOSButton from './components/SOSButton';
import IncidentForm from './components/IncidentForm';
import AdminDashboard from './components/AdminDashboard';
import Toast from './components/Toast';
import 'leaflet/dist/leaflet.css';
import './App.css';
// ============================================================
// LOGIN PAGE
// ============================================================
const LoginPage = ({ onLogin }: { onLogin: (user: any) => void }) => {
  const [name, setName] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Simple admin password — change as needed
  const ADMIN_PASSWORD = 'admin123';

  const handleTouristLogin = () => {
    if (!name.trim()) {
      alert('Please enter your name before logging in.');
      return;
    }
    onLogin({ name: name.trim(), role: 'user' });
  };

  const handleAdminLogin = () => {
    if (!adminName.trim()) {
      setAdminError('Please enter your admin name.');
      return;
    }
    if (!adminPassword.trim()) {
      setAdminError('Please enter your password.');
      return;
    }
    if (adminPassword !== ADMIN_PASSWORD) {
      setAdminError('Incorrect password. Try again.');
      return;
    }
    onLogin({ name: adminName.trim(), role: 'admin' });
  };

  if (showAdminLogin) {
    return (
      <div className="login-container">
        <div className="login-box">
          <h2 style={{ color: '#f1c40f' }}>🔐 AUTHORITY LOGIN</h2>
          <p style={{ color: '#888', marginBottom: '20px' }}>Admin Access Only</p>

          <input
            placeholder="Enter Admin Name"
            className="login-input"
            value={adminName}
            onChange={e => { setAdminName(e.target.value); setAdminError(''); }}
          />
          <input
            placeholder="Enter Password"
            type="password"
            className="login-input"
            value={adminPassword}
            onChange={e => { setAdminPassword(e.target.value); setAdminError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
            style={{ marginTop: 10 }}
          />

          {adminError && (
            <p style={{ color: '#ff4d4d', fontSize: 13, marginTop: 8 }}>{adminError}</p>
          )}

          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', marginTop: 14 }}>
            <button className="admin-login-btn" onClick={handleAdminLogin}>
              🔓 Login as Authority
            </button>
            <button
              className="login-btn"
              style={{ background: '#333' }}
              onClick={() => { setShowAdminLogin(false); setAdminError(''); }}
            >
              ← Back to Tourist Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 style={{ color: '#ff4d4d' }}>🛡️ SAFE-TOUR LOGIN</h2>
        <p style={{ color: '#888', marginBottom: '20px' }}>Secure Access Portal</p>
        <input
          placeholder="Enter Your Name"
          className="login-input"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleTouristLogin()}
        />
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', marginTop: 14 }}>
          <button className="login-btn" onClick={handleTouristLogin}>
            Login as Tourist
          </button>
          <button className="admin-login-btn" onClick={() => setShowAdminLogin(true)}>
            Login as Authority (Admin)
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// CHAT WIDGET — Tourist floating bubble (bottom-right)
// ============================================================
let touristSocket: Socket;

const ChatWidget = ({ user }: { user: { name: string; role: string } }) => {
  const [open, setOpen]         = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput]       = useState('');
  const [unread, setUnread]     = useState(0);
  const userId    = useRef(`user-${Math.random().toString(36).slice(2)}`);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    touristSocket = io('http://localhost:5000', {
      query: { userId: userId.current, role: 'user', name: user.name }
    });
    touristSocket.on('chat-history', (history: any[]) => setMessages(history));
    touristSocket.on('new-message', (msg: any) => {
      setMessages(prev => [...prev, msg]);
      if (msg.role === 'admin') setUnread(u => u + 1);
    });
    return () => { touristSocket.disconnect(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (open) setUnread(0);
  }, [messages, open]);

  const sendMessage = () => {
    if (!input.trim()) return;
    touristSocket.emit('tourist-message', {
      userId: userId.current,
      name: user.name,
      message: input.trim()
    });
    setInput('');
  };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999 }}>
      {open && (
        <div style={{
          width: 300, height: 420, background: '#1a1a2e',
          border: '1px solid #ff4d4d', borderRadius: 14,
          display: 'flex', flexDirection: 'column', marginBottom: 10,
          boxShadow: '0 8px 32px rgba(255,77,77,0.2)'
        }}>
          <div style={{
            padding: '10px 14px', background: '#ff4d4d',
            borderRadius: '14px 14px 0 0', fontWeight: 700,
            color: 'white', fontSize: 14
          }}>
            💬 Chat with Authority
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
            {messages.length === 0 && (
              <p style={{ color: '#555', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
                Send a message to connect with an authority officer.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'admin' ? 'flex-start' : 'flex-end',
                marginBottom: 8
              }}>
                <div style={{
                  background: m.role === 'admin' ? '#2c2c54' : '#ff4d4d',
                  padding: '7px 11px', borderRadius: 10,
                  fontSize: 13, color: 'white', maxWidth: '80%'
                }}>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 2 }}>{m.from}</div>
                  {m.message}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div style={{ display: 'flex', padding: 8, gap: 6, borderTop: '1px solid #2a2a40' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              style={{
                flex: 1, padding: '7px 10px', borderRadius: 8,
                border: '1px solid #333', background: '#111',
                color: 'white', fontSize: 13, outline: 'none'
              }}
            />
            <button
              onClick={sendMessage}
              style={{
                background: '#ff4d4d', border: 'none', borderRadius: 8,
                color: 'white', padding: '7px 13px', cursor: 'pointer',
                fontWeight: 600, fontSize: 13
              }}
            >Send</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            background: '#ff4d4d', border: 'none', borderRadius: '50%',
            width: 54, height: 54, fontSize: 24, cursor: 'pointer',
            position: 'relative', boxShadow: '0 4px 16px rgba(255,77,77,0.4)'
          }}
        >
          💬
          {unread > 0 && (
            <span style={{
              position: 'absolute', top: 2, right: 2,
              background: '#f1c40f', borderRadius: '50%',
              width: 18, height: 18, fontSize: 11, fontWeight: 700,
              color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>{unread}</span>
          )}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// ADMIN CHAT — Panel shown inside Admin view
// ============================================================
let adminSocket: Socket;

const AdminChat = ({ adminName }: { adminName: string }) => {
  const [rooms, setRooms]           = useState<Record<string, any[]>>({});
  const [users, setUsers]           = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [input, setInput]           = useState('');
  const [unreadMap, setUnreadMap]   = useState<Record<string, number>>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    adminSocket = io('http://localhost:5000', {
      query: { userId: 'admin', role: 'admin', name: adminName }
    });

    adminSocket.on('new-user', ({ userId, name, room }: any) => {
      setUsers(prev => prev.find(u => u.room === room) ? prev : [...prev, { userId, name, room }]);
      setRooms(prev => ({ ...prev, [room]: prev[room] || [] }));
    });

    adminSocket.on('new-message-admin', ({ room, ...msg }: any) => {
      setRooms(prev => ({ ...prev, [room]: [...(prev[room] || []), msg] }));
      if (msg.role === 'user') {
        setUnreadMap(prev => ({ ...prev, [room]: (prev[room] || 0) + 1 }));
      }
    });

    return () => { adminSocket.disconnect(); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [rooms, activeRoom]);

  const openRoom = (room: string) => {
    setActiveRoom(room);
    setUnreadMap(prev => ({ ...prev, [room]: 0 }));
  };

  const sendReply = () => {
    if (!input.trim() || !activeRoom) return;
    adminSocket.emit('admin-message', { room: activeRoom, message: input.trim() });
    setInput('');
  };

  const activeMessages = activeRoom ? (rooms[activeRoom] || []) : [];
  const activeUser     = users.find(u => u.room === activeRoom);

  return (
    <div style={{
      display: 'flex', height: 520, background: '#0f0f1a',
      borderRadius: 14, overflow: 'hidden', border: '1px solid #2a2a40',
      marginTop: 20
    }}>
      <div style={{
        width: 210, background: '#13132a',
        borderRight: '1px solid #2a2a40',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{
          padding: '14px 16px', fontWeight: 700, color: '#ff4d4d',
          fontSize: 13, borderBottom: '1px solid #2a2a40', letterSpacing: 0.5
        }}>
          🛡️ ONLINE TOURISTS
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {users.length === 0 && (
            <p style={{ padding: 16, color: '#444', fontSize: 12 }}>
              Waiting for tourists to connect...
            </p>
          )}
          {users.map(u => (
            <div
              key={u.room}
              onClick={() => openRoom(u.room)}
              style={{
                padding: '11px 16px', cursor: 'pointer',
                background: activeRoom === u.room ? '#1e1e40' : 'transparent',
                borderBottom: '1px solid #1a1a2e', color: 'white',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <span style={{ fontSize: 13 }}>👤 {u.name}</span>
              {(unreadMap[u.room] || 0) > 0 && (
                <span style={{
                  background: '#ff4d4d', borderRadius: 10,
                  padding: '2px 7px', fontSize: 11, fontWeight: 700, color: 'white'
                }}>
                  {unreadMap[u.room]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid #2a2a40',
          color: activeUser ? '#f1c40f' : '#444', fontSize: 13, fontWeight: 600
        }}>
          {activeUser
            ? `💬 Chatting with ${activeUser.name}`
            : '← Select a tourist to start chatting'}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {activeMessages.length === 0 && activeRoom && (
            <p style={{ color: '#444', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
              No messages yet. Say hello!
            </p>
          )}
          {activeMessages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: m.role === 'admin' ? 'flex-end' : 'flex-start',
              marginBottom: 10
            }}>
              <div style={{
                background: m.role === 'admin' ? '#ff4d4d' : '#1e1e40',
                padding: '8px 12px', borderRadius: 10,
                fontSize: 13, color: 'white', maxWidth: '75%'
              }}>
                <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 3 }}>{m.from}</div>
                {m.message}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {activeRoom && (
          <div style={{
            display: 'flex', padding: 10, gap: 8,
            borderTop: '1px solid #2a2a40', background: '#0f0f1a'
          }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendReply()}
              placeholder={`Reply to ${activeUser?.name}...`}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: 8,
                border: '1px solid #333', background: '#1a1a2e',
                color: 'white', fontSize: 13, outline: 'none'
              }}
            />
            <button
              onClick={sendReply}
              style={{
                background: '#ff4d4d', border: 'none', borderRadius: 8,
                color: 'white', padding: '8px 16px', cursor: 'pointer',
                fontWeight: 700, fontSize: 13
              }}
            >Send</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================
function App() {
  const [user, setUser]               = useState<{name: string, role: 'user' | 'admin'} | null>(null);
  const [location, setLocation]       = useState<{ lat: number; lng: number } | null>(null);
  const [incidents, setIncidents]     = useState<any[]>([]);
  const [error, setError]             = useState<string | null>(null);
  const [address, setAddress]         = useState('Locating...');
  const [view, setView]               = useState<'map' | 'admin'>('map');
  const [toast, setToast]             = useState<string | null>(null);
  const [focusIncident, setFocusIncident] = useState<any>(null);

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  useEffect(() => {
    if (location) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${location.lat}&lon=${location.lng}`)
        .then(res => res.json())
        .then(data => {
          const locName = data.address?.city || data.address?.town || data.address?.village || 'Unknown Area';
          setAddress(locName);
        })
        .catch(() => setAddress('Unknown Location'));
    }
  }, [location]);

  const fetchIncidents = useCallback(async (msg?: string) => {
    try {
      const res = await axios.get('http://localhost:5000/api/incidents');
      setIncidents(res.data);
      if (msg) setToast(msg);
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('Location access denied'),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [fetchIncidents]);

  useEffect(() => {
    if (!location || incidents.length === 0) return;
    incidents.forEach((inc: any) => {
      const dist = getDistance(location.lat, location.lng, inc.lat, inc.lng);
      if (dist < 1) {
        const audio = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');
        audio.play();
        alert(` Danger Nearby!\nType: ${inc.type}\n${inc.description}\nDistance: ${dist.toFixed(2)} km`);
      }
    });
  }, [incidents, location]);

  if (!user) {
    return <LoginPage onLogin={(userData) => setUser(userData)} />;
  }

  const currentLat = location?.lat ?? 0;
  const currentLng = location?.lng ?? 0;

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div>
          <h2 style={{ color: '#ff4d4d' }}>🛡️ SAFE-TOUR</h2>
          <p style={{ opacity: 0.9, fontSize: '0.9rem', color: '#f1c40f' }}>
            Hello, {user.name} ({user.role})
          </p>
          <p style={{ fontSize: '0.8rem', color: '#888' }}>📍 {address}</p>
        </div>

        {user.role === 'admin' && (
          <div style={{ margin: '15px 0' }}>
            <button onClick={() => setView('map')}>🌍 Map View</button>
            <button onClick={() => setView('admin')}>🚨 Admin Panel</button>
          </div>
        )}

        {view === 'map' && (
          <>
            <div className="sos-card">
              <SOSButton lat={location?.lat ?? null} lng={location?.lng ?? null} />
              <IncidentForm
                lat={currentLat}
                lng={currentLng}
                onSuccess={() => fetchIncidents('✅ Incident reported successfully')}
              />
            </div>

            <div className="alerts-feed">
              <h4>Recent Alerts</h4>
              {incidents.length > 0 ? (
                incidents.map((inc: any) => (
                  <div
                    key={inc.id}
                    onClick={() => setFocusIncident(inc)}
                    style={{
                      border: '1px solid red', background: '#2c0000',
                      padding: '6px', marginBottom: '6px',
                      borderRadius: '5px', color: 'white', cursor: 'pointer'
                    }}
                  >
                    ⚠️ {inc.type} - {inc.description}
                  </div>
                ))
              ) : (
                <p>No incidents yet</p>
              )}
            </div>
          </>
        )}
      </aside>

      <main className="map-container">
        {view === 'map' ? (
          location ? (
            <MapView
              lat={location.lat}
              lng={location.lng}
              incidents={incidents}
              focus={focusIncident}
            />
          ) : (
            <h2 style={{ color: 'white', textAlign: 'center' }}>
              🛰️ Loading location...
            </h2>
          )
        ) : (
          <>
            <AdminDashboard incidents={incidents} refresh={fetchIncidents} />
            <AdminChat adminName={user.name} />
          </>
        )}
      </main>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {user.role === 'user' && <ChatWidget user={user} />}
    </div>
  );
}
export default App;