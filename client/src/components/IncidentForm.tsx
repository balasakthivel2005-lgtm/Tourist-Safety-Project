import { useState } from 'react';
import axios from 'axios';

const IncidentForm = ({ lat, lng, onSuccess }: any) => {
    const [type, setType] = useState('Unsafe');
    const [desc, setDesc] = useState('');
    const [loading, setLoading] = useState(false);

    // --- AI classification state (NEW) ---
    const [classifying, setClassifying] = useState(false);
    const [aiResult, setAiResult] = useState<{ type: string; severity: string; suggestion: string } | null>(null);

    // 🔥 keywords for valid incidents
    const validKeywords = [
        "attack", "theft", "robbery", "accident", "fire",
        "injury", "danger", "unsafe", "crime", "emergency",
        "strike", "protest", "harassment", "assault", "vandalism"
    ];

    const isValidDescription = (text: string) => {
        const lower = text.toLowerCase();
        if (lower.length < 5) return false;
        return validKeywords.some(keyword => lower.includes(keyword));
    };

    // --- NEW: Call Claude API via backend to classify ---
    const handleClassify = async () => {
        if (!desc.trim()) {
            alert("⚠️ Please describe the incident first.");
            return;
        }
        if (!isValidDescription(desc)) {
            alert("❌ Invalid report! Please enter a meaningful incident (e.g. theft, accident, danger)");
            return;
        }
        setClassifying(true);
        setAiResult(null);
        try {
            const res = await axios.post('http://localhost:5000/api/classify', { description: desc });
            setAiResult(res.data);
            setType(res.data.type); // auto-set the dropdown to AI's classified type
        } catch {
            alert("🤖 AI classification failed. You can still submit manually.");
        }
        setClassifying(false);
    };

    const submit = async () => {
        if (!desc.trim()) {
            alert("⚠️ Please describe the incident");
            return;
        }
        if (!isValidDescription(desc)) {
            alert("❌ Invalid report! Please enter a meaningful incident (e.g. theft, accident, danger)");
            return;
        }
        if (!lat || !lng) {
            alert("📍 Waiting for location...");
            return;
        }
        try {
            setLoading(true);
            await axios.post('http://localhost:5000/api/incidents', {
                type,
                description: desc,
                severity: aiResult?.severity || 'Medium',   // NEW: AI severity
                suggestion: aiResult?.suggestion || '',      // NEW: AI suggestion
                lat,
                lng
            });
            alert("✅ Incident reported successfully!");
            setDesc('');
            setAiResult(null); // NEW: clear AI result after submit
            onSuccess();
        } catch (error) {
            console.error(error);
            alert("❌ Failed to submit. Check backend.");
        } finally {
            setLoading(false);
        }
    };

    // Severity badge colors (NEW)
    const severityColor: Record<string, string> = {
        Low: '#27ae60',
        Medium: '#f39c12',
        High: '#e67e22',
        Critical: '#e74c3c',
    };

    return (
        <div style={{ marginTop: '10px' }}>
            <select
                value={type}
                onChange={(e) => setType(e.target.value)}
            >
                <option value="Unsafe">Unsafe</option>
                <option value="Theft">Theft</option>
                <option value="Medical">Medical</option>
                <option value="Harassment">Harassment</option>
                <option value="Accident">Accident</option>
            </select>

            <input
                placeholder="Describe incident (e.g. theft, accident...)"
                value={desc}
                onChange={(e) => { setDesc(e.target.value); setAiResult(null); }}
                style={{ marginTop: '5px', width: '100%' }}
            />

            {/* NEW: AI Classify button */}
            <button
                onClick={handleClassify}
                disabled={classifying || !desc.trim()}
                style={{
                    marginTop: '5px',
                    background: '#1a3a5f',
                    color: '#60a5fa',
                    padding: '6px',
                    border: '1px solid #2d4a7a',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    width: '100%',
                    fontWeight: 600
                }}
            >
                {classifying ? "🤖 Analysing..." : "🤖 Auto-Classify with AI"}
            </button>

            {/* NEW: AI result card — shows type, severity, suggestion */}
            {aiResult && (
                <div style={{
                    marginTop: '8px',
                    background: '#1a1d27',
                    border: `1px solid ${severityColor[aiResult.severity] || '#888'}`,
                    borderRadius: '8px',
                    padding: '8px 10px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>
                            🏷️ {aiResult.type}
                        </span>
                        <span style={{
                            fontSize: '0.72rem', fontWeight: 600,
                            padding: '2px 8px', borderRadius: '12px',
                            background: `${severityColor[aiResult.severity]}33`,
                            color: severityColor[aiResult.severity] || '#888',
                        }}>
                            {aiResult.severity} Risk
                        </span>
                    </div>
                    <p style={{ margin: '5px 0 0', fontSize: '0.78rem', color: '#9ca3af' }}>
                        💡 {aiResult.suggestion}
                    </p>
                </div>
            )}

            <button
                onClick={submit}
                disabled={loading}
                style={{
                    marginTop: '5px',
                    background: '#e74c3c',
                    color: 'white',
                    padding: '6px',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    width: '100%'
                }}
            >
                {loading ? "Submitting..." : "Submit Report"}
            </button>
        </div>
    );
};

export default IncidentForm;
