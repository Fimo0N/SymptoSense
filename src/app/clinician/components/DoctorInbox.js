"use client";

import { useState, useCallback } from "react";
import { openPrescriptionReceipt } from "@/lib/receiptUtils";

export default function DoctorInbox({ consultations, onApprove, onRefresh }) {
    const [expandedId, setExpandedId] = useState(null);
    const [doctorResponse, setDoctorResponse] = useState("");
    const [isApproving, setIsApproving] = useState(false);
    const [rejectedConsults, setRejectedConsults] = useState({}); // Track which consults have rejected AI notes

    // Manual form state
    const [manualAssessment, setManualAssessment] = useState("");
    const [manualMeds, setManualMeds] = useState("");
    const [manualAdvice, setManualAdvice] = useState("");

    const handleApprove = useCallback(async (consultId, isRejected = false) => {
        if (isRejected && (!manualAssessment.trim() || !manualAdvice.trim())) {
            return; // Don't allow empty submission if rejected
        }
        setIsApproving(true);
        // If rejected, pass a flag so the API knows to ignore the AI recommendation for the receipt
        await onApprove?.(consultId, isRejected ? manualAssessment : doctorResponse, true, isRejected, {
            assessment: manualAssessment,
            medications: manualMeds,
            advice: manualAdvice
        });
        setDoctorResponse("");
        setManualAssessment("");
        setManualMeds("");
        setManualAdvice("");
        setExpandedId(null);
        setIsApproving(false);
        setRejectedConsults(prev => ({ ...prev, [consultId]: false })); // Reset
    }, [doctorResponse, manualAssessment, manualMeds, manualAdvice, onApprove]);

    const handleRejectAI = (consultId) => {
        setRejectedConsults(prev => ({ ...prev, [consultId]: true }));
        setDoctorResponse(""); // Clear any existing response
        setManualAssessment("");
        setManualMeds("");
        setManualAdvice("");
    };

    const cancelReject = (consultId) => {
        setRejectedConsults(prev => ({ ...prev, [consultId]: false }));
    };

    const getSeverityClass = (severity) => {
        if (severity === "serious") return "severity-serious";
        if (severity === "moderate") return "severity-moderate";
        return "severity-mild";
    };

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

    const getStatusBadge = (status) => {
        const map = {
            pending: { class: "badge-warning", label: "⏳ Pending" },
            reviewed: { class: "badge-info", label: "👁️ Reviewed" },
            approved: { class: "badge-positive", label: "✅ Approved" },
            rejected: { class: "badge-negative", label: "❌ Rejected" },
        };
        return map[status] || map.pending;
    };

    if (!consultations || consultations.length === 0) {
        return (
            <div className="card animate-fade-in">
                <div className="card-header">
                    <h2 className="card-title">
                        <span className="card-title-icon">📬</span>
                        Patient Messages
                    </h2>
                    <button className="btn btn-ghost" onClick={onRefresh}>🔄</button>
                </div>
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <p className="empty-state-text">No patient voice notes yet. They will appear here when patients send consultations.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card animate-fade-in">
            <div className="card-header">
                <h2 className="card-title">
                    <span className="card-title-icon">📬</span>
                    Patient Messages
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span className="badge badge-info">{consultations.length} Messages</span>
                    <button className="btn btn-ghost" onClick={onRefresh}>🔄</button>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }} className="stagger-container">
                {consultations.map((consult) => {
                    const isExpanded = expandedId === consult.id;
                    const statusBadge = getStatusBadge(consult.status);
                    const isRejected = rejectedConsults[consult.id] === true;

                    // Parse AI recommendation (might be string or object)
                    let rec = {};
                    try {
                        const raw = consult.ai_recommendation;
                        if (typeof raw === "string") {
                            // Strip markdown code fences if present
                            const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
                            rec = JSON.parse(cleaned);
                        } else if (raw && typeof raw === "object") {
                            // If it's already an object but has a nested string
                            if (typeof raw.diagnosis === "string" && raw.diagnosis.startsWith("{")) {
                                rec = JSON.parse(raw.diagnosis);
                            } else {
                                rec = raw;
                            }
                        }
                    } catch {
                        // If all parsing fails, try to extract from the raw text
                        const raw = consult.ai_recommendation;
                        if (typeof raw === "string") {
                            rec = { diagnosis: raw, medications: [], advice: "", followUp: "" };
                        }
                    }

                    return (
                        <div
                            key={consult.id}
                            style={{
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "var(--radius-md)",
                                overflow: "hidden",
                                transition: "all 0.3s ease",
                                borderColor: isExpanded ? "var(--accent-teal)" : undefined,
                            }}
                        >
                            {/* Header - Click to expand */}
                            <div
                                onClick={() => setExpandedId(isExpanded ? null : consult.id)}
                                style={{
                                    padding: "1rem",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    background: isExpanded ? "rgba(20, 184, 166, 0.03)" : "transparent",
                                    transition: "background 0.2s",
                                }}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <div style={{
                                        width: "40px", height: "40px", borderRadius: "50%",
                                        background: "var(--gradient-primary)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "1.1rem", flexShrink: 0,
                                    }}>
                                        {consult.voice_note_url ? "🎤" : "📝"}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: "600", fontSize: "0.9rem" }}>
                                            {consult.patient?.full_name || "Patient"}
                                        </div>
                                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                            {new Date(consult.created_at).toLocaleString()} · {consult.language || "en-US"}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span className={`badge ${getSeverityClass(consult.severity)}`}>
                                        {consult.severity}
                                    </span>
                                    <span className={`badge ${statusBadge.class}`}>
                                        {statusBadge.label}
                                    </span>
                                    <span style={{ fontSize: "1.1rem", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>
                                        ▾
                                    </span>
                                </div>
                            </div>

                            {/* Expanded Medical Report */}
                            {isExpanded && (
                                <div style={{ padding: "0 1rem 1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                                    {/* Voice Note Playback */}
                                    {consult.voice_note_url && (
                                        <div style={{ padding: "12px", background: "rgba(59, 130, 246, 0.05)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(59, 130, 246, 0.15)" }}>
                                            <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--accent-blue-light)", marginBottom: "8px" }}>
                                                🔊 Voice Note from Patient
                                            </div>
                                            <audio controls src={consult.voice_note_url} style={{ width: "100%", height: "40px" }} />
                                        </div>
                                    )}

                                    {/* Transcript */}
                                    <div style={{ padding: "12px", background: "rgba(20, 184, 166, 0.03)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(20, 184, 166, 0.15)" }}>
                                        <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--accent-teal)", marginBottom: "6px" }}>
                                            📝 Transcript (English)
                                        </div>
                                        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.7" }}>
                                            {consult.transcript}
                                        </p>
                                        {consult.entities && consult.entities.length > 0 && (
                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                                                {consult.entities.map((e, i) => (
                                                    <span
                                                        key={i}
                                                        className={`entity-tag ${getEntityClass(e.type)}`}
                                                    >
                                                        {getEntityIcon(e.type)} {e.text}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Recommendation - Structured Medical Report */}
                                    {!isRejected ? (
                                        <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid rgba(139, 92, 246, 0.15)" }}>
                                            {/* Header */}
                                            <div style={{ padding: "12px 16px", background: "linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.05))", borderBottom: "1px solid rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", gap: "8px" }}>
                                                <span style={{ fontSize: "1.2rem" }}>🧠</span>
                                                <span style={{ fontSize: "0.88rem", fontWeight: "700", color: "var(--accent-purple-light)" }}>AI Medical Analysis</span>
                                                <span className="badge badge-info" style={{ marginLeft: "auto", fontSize: "0.68rem" }}>GPT-4o</span>
                                            </div>

                                            <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                                                {/* Diagnosis */}
                                                <div style={{ padding: "12px 16px", background: "rgba(59, 130, 246, 0.04)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-blue)" }}>
                                                    <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-blue-light)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                                                        🔍 Clinical Assessment
                                                    </div>
                                                    <div style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: "1.7" }}>
                                                        {rec.diagnosis || "Pending AI analysis..."}
                                                    </div>
                                                </div>

                                                {/* Medications */}
                                                {rec.medications && rec.medications.length > 0 && (
                                                    <div>
                                                        <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                                                            💊 Recommended Medications
                                                        </div>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                                            {rec.medications.map((med, i) => (
                                                                <div key={i} style={{
                                                                    padding: "12px 16px",
                                                                    background: "var(--bg-secondary)",
                                                                    borderRadius: "var(--radius-sm)",
                                                                    border: "1px solid var(--border-subtle)",
                                                                }}>
                                                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                                                                        <span style={{ fontSize: "0.92rem", fontWeight: "700", color: "var(--text-primary)" }}>
                                                                            💊 {med.name}
                                                                        </span>
                                                                        <span className="badge badge-info" style={{ fontSize: "0.7rem" }}>
                                                                            {med.dosage}
                                                                        </span>
                                                                    </div>
                                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                                                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                                                            <span>⏰</span>
                                                                            <span><strong>Timing:</strong> {med.timing}</span>
                                                                        </div>
                                                                        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                                                            <span>📅</span>
                                                                            <span><strong>Duration:</strong> {med.duration}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Advice + Follow-up */}
                                                <div style={{ display: "grid", gridTemplateColumns: rec.followUp ? "1fr 1fr" : "1fr", gap: "10px" }}>
                                                    {rec.advice && (
                                                        <div style={{ padding: "10px 14px", background: "rgba(34, 197, 94, 0.04)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-green)" }}>
                                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-green)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                                                                💡 Patient Advice
                                                            </div>
                                                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                                                                {rec.advice}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {rec.followUp && (
                                                        <div style={{ padding: "10px 14px", background: "rgba(245, 158, 11, 0.04)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-amber)" }}>
                                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-amber)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                                                                📋 Follow-Up
                                                            </div>
                                                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>
                                                                {rec.followUp}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ borderRadius: "var(--radius-md)", padding: "16px", background: "rgba(239, 68, 68, 0.05)", border: "1px dashed var(--accent-red-light)" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                                                <span style={{ fontSize: "1.2rem" }}>🚫</span>
                                                <span style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--accent-red)" }}>AI Analysis Rejected</span>
                                            </div>
                                            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0", lineHeight: "1.5" }}>
                                                You have opted to discard the AI-generated assessment. You must now manually write the complete clinical assessment and follow-up plan to generate the patient's digital receipt.
                                            </p>
                                        </div>
                                    )}

                                    {/* Digital Prescription Receipt (shown after approval) */}
                                    {consult.receipt_hash && (() => {
                                        const rd = consult.receipt_data || {};
                                        const rxItems = rd.prescription || [];
                                        return (
                                            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                                                {/* Receipt Header */}
                                                <div style={{ padding: "14px 16px", background: "linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(20, 184, 166, 0.06))", borderBottom: "1px solid rgba(34, 197, 94, 0.12)", display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <span style={{ fontSize: "1.4rem" }}>📋</span>
                                                    <div>
                                                        <div style={{ fontSize: "0.92rem", fontWeight: "700", color: "var(--accent-green)" }}>Digital Prescription Receipt</div>
                                                        <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{rd.receipt_id || "RX-" + consult.id?.slice(0, 8)}</div>
                                                    </div>
                                                    <span className="badge badge-positive" style={{ marginLeft: "auto", fontSize: "0.68rem" }}>🔐 SHA-256 Verified</span>
                                                </div>

                                                <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                                                    {/* Patient & Doctor Info */}
                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                                        <div style={{ padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                                                            <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Patient</div>
                                                            <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>{rd.patient_name || consult.patient?.full_name || "Patient"}</div>
                                                        </div>
                                                        <div style={{ padding: "10px 12px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                                                            <div style={{ fontSize: "0.68rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Prescribing Doctor</div>
                                                            <div style={{ fontSize: "0.88rem", fontWeight: "600", color: "var(--text-primary)", marginTop: "2px" }}>Dr. {rd.doctor_name || consult.doctor?.full_name || "Doctor"}</div>
                                                        </div>
                                                    </div>

                                                    {/* Prescription Items Table */}
                                                    {rxItems.length > 0 && (
                                                        <div>
                                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>💊 Prescribed Medications</div>
                                                            <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                                                                {/* Table Header */}
                                                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", padding: "8px 12px", background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-subtle)", fontSize: "0.7rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                                                    <span>Medicine</span>
                                                                    <span>Quantity</span>
                                                                    <span>Timing</span>
                                                                    <span>Expiry</span>
                                                                </div>
                                                                {/* Table Rows */}
                                                                {rxItems.map((rx, i) => (
                                                                    <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", padding: "10px 12px", borderBottom: i < rxItems.length - 1 ? "1px solid var(--border-subtle)" : "none", fontSize: "0.84rem", alignItems: "center" }}>
                                                                        <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>💊 {rx.name}</span>
                                                                        <span style={{ color: "var(--text-secondary)" }}>{rx.quantity || rx.dosage || "As prescribed"}</span>
                                                                        <span style={{ color: "var(--text-secondary)" }}>{rx.timing}</span>
                                                                        <span style={{ fontSize: "0.78rem", color: "var(--accent-amber)" }}>{rx.expiry || rx.duration || "30 days"}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Doctor's Response */}
                                                    {consult.doctor_response && (
                                                        <div style={{ padding: "10px 14px", borderLeft: "3px solid var(--accent-green)", background: "rgba(34, 197, 94, 0.03)", borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}>
                                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-green)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Doctor's Notes</div>
                                                            <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>{consult.doctor_response}</div>
                                                        </div>
                                                    )}

                                                    {/* Hash & Timestamp */}
                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "10px", alignItems: "end" }}>
                                                        <div>
                                                            <div style={{ fontSize: "0.68rem", fontWeight: "600", color: "var(--text-muted)", marginBottom: "4px" }}>SHA-256 HASH SIGNATURE</div>
                                                            <div style={{ fontSize: "0.68rem", fontFamily: "monospace", color: "var(--accent-teal)", wordBreak: "break-all", padding: "8px 10px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>{consult.receipt_hash}</div>
                                                        </div>
                                                        <div style={{ textAlign: "right", fontSize: "0.78rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                                            <div>✅ {new Date(consult.approved_at).toLocaleDateString()}</div>
                                                            <div style={{ fontSize: "0.72rem" }}>{new Date(consult.approved_at).toLocaleTimeString()}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Download Button */}
                                    {consult.receipt_hash && (
                                        <button
                                            className="btn btn-secondary"
                                            onClick={() => openPrescriptionReceipt(consult)}
                                            style={{ width: "100%" }}
                                        >
                                            📥 View & Download Prescription Receipt
                                        </button>
                                    )}

                                    {/* Doctor Response + Approve (only for pending) */}
                                    {consult.status === "pending" && (
                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                            {!isRejected ? (
                                                <textarea
                                                    className="textarea"
                                                    placeholder="Add your medical response, additional notes, or prescription adjustments..."
                                                    value={expandedId === consult.id ? doctorResponse : ""}
                                                    onChange={(e) => setDoctorResponse(e.target.value)}
                                                    rows={4}
                                                />
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "14px", background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-medium)" }}>
                                                    <div style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>✍️ Manual Receipt Entry</div>
                                                    <textarea
                                                        className="textarea"
                                                        placeholder="🔍 Clinical Assessment (Required)"
                                                        value={expandedId === consult.id ? manualAssessment : ""}
                                                        onChange={(e) => setManualAssessment(e.target.value)}
                                                        rows={3}
                                                    />
                                                    <textarea
                                                        className="textarea"
                                                        placeholder="💊 Prescribed Medications (e.g., Ibuprofen 400mg twice daily)"
                                                        value={expandedId === consult.id ? manualMeds : ""}
                                                        onChange={(e) => setManualMeds(e.target.value)}
                                                        rows={2}
                                                    />
                                                    <textarea
                                                        className="textarea"
                                                        placeholder="💡 Patient Advice & Follow-up (Required)"
                                                        value={expandedId === consult.id ? manualAdvice : ""}
                                                        onChange={(e) => setManualAdvice(e.target.value)}
                                                        rows={3}
                                                    />
                                                </div>
                                            )}
                                            <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                                                {!isRejected ? (
                                                    <>
                                                        <button
                                                            className="btn"
                                                            onClick={() => handleRejectAI(consult.id)}
                                                            disabled={isApproving}
                                                            style={{
                                                                background: "rgba(239, 68, 68, 0.1)", color: "var(--accent-red-light)",
                                                                border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: "0.85rem", flex: 0.3
                                                            }}
                                                        >
                                                            🚫 Reject AI Note
                                                        </button>
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={() => handleApprove(consult.id, false)}
                                                            disabled={isApproving}
                                                            style={{ flex: 1 }}
                                                        >
                                                            {isApproving ? (
                                                                <><div className="loading-dots"><span></span><span></span><span></span></div> Generating Receipt...</>
                                                            ) : (
                                                                <>✅ Approve & Generate Digital Receipt</>
                                                            )}
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            className="btn"
                                                            onClick={() => cancelReject(consult.id)}
                                                            disabled={isApproving}
                                                            style={{
                                                                background: "rgba(255, 255, 255, 0.1)", color: "var(--text-secondary)",
                                                                border: "1px solid rgba(255, 255, 255, 0.1)", fontSize: "0.85rem"
                                                            }}
                                                        >
                                                            Cancel Rejection
                                                        </button>
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={() => handleApprove(consult.id, true)}
                                                            disabled={isApproving || !manualAssessment.trim() || !manualAdvice.trim()}
                                                            style={{ flex: 1, background: (!manualAssessment.trim() || !manualAdvice.trim()) ? "var(--bg-tertiary)" : "linear-gradient(135deg, var(--accent-teal), var(--accent-blue))" }}
                                                        >
                                                            {isApproving ? (
                                                                <><div className="loading-dots"><span></span><span></span><span></span></div> Generating Manual Receipt...</>
                                                            ) : (
                                                                <>✅ Submit Manual Review & Generate Receipt</>
                                                            )}
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
