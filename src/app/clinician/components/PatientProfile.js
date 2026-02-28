"use client";

import { useState, useEffect, useMemo } from "react";
import SmartDashboard from "@/app/patient/components/SmartDashboard";
import { openPrescriptionReceipt } from "@/lib/receiptUtils";

export default function PatientProfile({ patientId, patientName, onBack }) {
    const [consultations, setConsultations] = useState([]);
    const [diaryEntries, setDiaryEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("voicenotes");
    const [expandedNote, setExpandedNote] = useState(null);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const [cRes, dRes] = await Promise.all([
                    fetch(`/api/consultations?patient_id=${patientId}`),
                    fetch(`/api/diary-entries?patient_id=${patientId}`),
                ]);
                const cData = await cRes.json();
                const dData = await dRes.json();
                if (cData.success) setConsultations(cData.consultations);
                if (dData.success) setDiaryEntries(dData.entries || []);
            } catch (err) {
                console.error("Failed to load patient data:", err);
            }
            setLoading(false);
        }
        if (patientId) load();
    }, [patientId]);

    const pending = consultations.filter((c) => c.status === "pending");
    const approved = consultations.filter((c) => c.status === "approved");
    const serious = consultations.filter((c) => c.severity === "serious");

    // Parse AI rec helper
    function parseRec(raw) {
        try {
            if (typeof raw === "string") return JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
            if (raw && typeof raw === "object") return raw;
        } catch { }
        return {};
    }

    const getEntityClass = (type) => {
        switch (type) {
            case "symptom": return "entity-symptom";
            case "medication": return "entity-medication";
            case "dosage": return "entity-dosage";
            case "condition": return "entity-condition";
            default: return "entity-symptom";
        }
    };

    const getEntityIcon = (type) => {
        switch (type) {
            case "symptom": return "🔴";
            case "medication": return "💊";
            case "dosage": return "📏";
            case "condition": return "🏥";
            default: return "📌";
        }
    };

    return (
        <div className="animate-fade-in">
            {/* Back Button + Header */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1.5rem" }}>
                <button className="btn btn-ghost" onClick={onBack} style={{ padding: "6px 12px" }}>
                    ← Back
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "700", fontSize: "1rem" }}>
                            {patientName?.charAt(0)?.toUpperCase() || "P"}
                        </div>
                        {patientName || "Patient"}
                    </h2>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                    {pending.length > 0 && <span className="badge badge-warning">{pending.length} Pending</span>}
                    {approved.length > 0 && <span className="badge badge-positive">{approved.length} Approved</span>}
                    {serious.length > 0 && <span className="badge badge-critical">{serious.length} Serious</span>}
                </div>
            </div>

            {loading ? (
                <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
                    <div className="loading-dots"><span></span><span></span><span></span></div>
                    <div style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>Loading patient records...</div>
                </div>
            ) : (
                <>
                    {/* Tab Navigation */}
                    <div className="dash-tabs" style={{ marginBottom: "1.25rem" }}>
                        {[
                            { id: "voicenotes", icon: "🎙️", label: `Voice Notes (${consultations.length})` },
                            { id: "analytics", icon: "📊", label: "Health Analytics" },
                        ].map((tab) => (
                            <button key={tab.id} className={`dash-tab ${activeTab === tab.id ? "active" : ""}`} onClick={() => setActiveTab(tab.id)}>
                                <span>{tab.icon}</span> {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === "voicenotes" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }} className="stagger-container">
                            {consultations.length === 0 ? (
                                <div className="card">
                                    <div className="empty-state">
                                        <div className="empty-state-icon">🎙️</div>
                                        <p className="empty-state-text">No voice notes from this patient yet.</p>
                                    </div>
                                </div>
                            ) : (
                                consultations.map((c) => {
                                    const isOpen = expandedNote === c.id;
                                    const rec = parseRec(c.ai_recommendation);
                                    const rd = c.receipt_data || {};
                                    const rxItems = rd.prescription || [];
                                    const severityColor = c.severity === "serious" ? "#f43f5e" : c.severity === "moderate" ? "#f59e0b" : "#22c55e";

                                    return (
                                        <div key={c.id} className="card" style={{ borderLeft: `3px solid ${severityColor}`, overflow: "hidden" }}>
                                            {/* Header row */}
                                            <div
                                                onClick={() => setExpandedNote(isOpen ? null : c.id)}
                                                style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                                            >
                                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                                    <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: `${severityColor}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                                                        {c.status === "approved" ? "✅" : "⏳"}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)" }}>
                                                            {new Date(c.created_at).toLocaleDateString("en", { month: "long", day: "numeric", year: "numeric" })}
                                                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "400", marginLeft: "8px" }}>
                                                                {new Date(c.created_at).toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                                            {c.transcript?.substring(0, 80)}{c.transcript?.length > 80 ? "..." : ""}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                    <span className={`badge ${c.status === "approved" ? "badge-positive" : "badge-warning"}`} style={{ fontSize: "0.68rem" }}>
                                                        {c.status}
                                                    </span>
                                                    <span className={`badge`} style={{ fontSize: "0.68rem", background: `${severityColor}15`, color: severityColor, border: `1px solid ${severityColor}30` }}>
                                                        {c.severity}
                                                    </span>
                                                    <span style={{ fontSize: "1rem", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
                                                </div>
                                            </div>

                                            {/* Expanded content */}
                                            {isOpen && (
                                                <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "12px", borderTop: "1px solid var(--border-subtle)" }}>
                                                    {/* Full transcript */}
                                                    <div style={{ padding: "12px 14px", background: "rgba(20, 184, 166, 0.03)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-teal)", marginTop: "12px" }}>
                                                        <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-teal)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>📝 Full Transcript (English)</div>
                                                        <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.7" }}>{c.transcript}</div>
                                                        {c.entities && c.entities.length > 0 && (
                                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                                                                {c.entities.map((e, i) => (
                                                                    <span key={i} className={`entity-tag ${getEntityClass(e.type)}`}>
                                                                        {getEntityIcon(e.type)} {e.text}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Voice note player */}
                                                    {c.voice_note_url && (
                                                        <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "6px" }}>🔊 Voice Recording</div>
                                                            <audio controls src={c.voice_note_url} style={{ width: "100%", height: "36px" }} />
                                                        </div>
                                                    )}

                                                    {/* AI Diagnosis */}
                                                    {rec.diagnosis && (
                                                        <div style={{ padding: "12px 14px", background: "rgba(59, 130, 246, 0.03)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-blue)" }}>
                                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-blue-light)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>🔍 AI Diagnosis</div>
                                                            <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>{rec.diagnosis}</div>
                                                        </div>
                                                    )}

                                                    {/* Medications */}
                                                    {rec.medications?.length > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>💊 AI Recommended Medications</div>
                                                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px" }}>
                                                                {rec.medications.map((med, i) => (
                                                                    <div key={i} style={{ padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                                                                        <div style={{ fontWeight: "600", fontSize: "0.85rem", color: "var(--text-primary)", marginBottom: "4px" }}>💊 {med.name}</div>
                                                                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                                                            {med.quantity || med.dosage} · {med.timing} · {med.duration}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Doctor Response */}
                                                    {c.doctor_response && (
                                                        <div style={{ padding: "12px 14px", background: "rgba(34, 197, 94, 0.03)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-green)" }}>
                                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-green)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>✍️ Your Response</div>
                                                            <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>{c.doctor_response}</div>
                                                        </div>
                                                    )}

                                                    {/* Prescription receipt */}
                                                    {rxItems.length > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>📋 Prescription</div>
                                                            <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                                                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", padding: "8px 12px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)", fontSize: "0.7rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                                                                    <span>Medicine</span><span>Qty</span><span>Timing</span><span>Expiry</span>
                                                                </div>
                                                                {rxItems.map((rx, i) => (
                                                                    <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", padding: "10px 12px", borderBottom: i < rxItems.length - 1 ? "1px solid var(--border-subtle)" : "none", fontSize: "0.84rem" }}>
                                                                        <span style={{ fontWeight: "600" }}>{rx.name}</span>
                                                                        <span style={{ color: "var(--text-secondary)" }}>{rx.quantity || rx.dosage}</span>
                                                                        <span style={{ color: "var(--text-secondary)" }}>{rx.timing}</span>
                                                                        <span style={{ color: "var(--accent-amber)", fontSize: "0.78rem" }}>{rx.expiry || rx.duration}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Receipt download */}
                                                    {c.receipt_hash && (
                                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                            <div style={{ flex: 1, fontSize: "0.68rem", fontFamily: "monospace", color: "var(--accent-teal)", opacity: 0.7 }}>
                                                                🔐 {c.receipt_hash.substring(0, 32)}...
                                                            </div>
                                                            <button className="btn btn-secondary" onClick={() => openPrescriptionReceipt(c)} style={{ fontSize: "0.78rem", padding: "6px 14px" }}>
                                                                📥 Download Receipt
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {/* Analytics Tab */}
                    {activeTab === "analytics" && (
                        <SmartDashboard entries={diaryEntries} />
                    )}
                </>
            )}
        </div>
    );
}
