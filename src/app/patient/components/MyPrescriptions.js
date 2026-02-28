"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { openPrescriptionReceipt } from "@/lib/receiptUtils";

export default function MyPrescriptions() {
    const [consultations, setConsultations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        async function load() {
            const { data: userData } = await supabase.auth.getUser();
            if (!userData?.user?.id) { setLoading(false); return; }

            try {
                const res = await fetch(`/api/consultations?patient_id=${userData.user.id}`);
                const data = await res.json();
                if (data.success) setConsultations(data.consultations);
            } catch (err) {
                console.error("Failed to load prescriptions:", err);
            }
            setLoading(false);
        }
        load();
        const interval = setInterval(load, 10000);
        return () => clearInterval(interval);
    }, []);

    const approved = consultations.filter((c) => c.status === "approved");
    const pending = consultations.filter((c) => c.status === "pending");

    if (loading) {
        return (
            <div className="card card-glass animate-fade-in">
                <div className="card-header">
                    <h2 className="card-title"><span className="card-title-icon">📋</span> My Prescriptions</h2>
                </div>
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                    <div className="loading-dots"><span></span><span></span><span></span></div>
                    Loading prescriptions...
                </div>
            </div>
        );
    }

    return (
        <div className="card card-glass animate-fade-in">
            <div className="card-header">
                <h2 className="card-title"><span className="card-title-icon">📋</span> My Prescriptions</h2>
                <div style={{ display: "flex", gap: "6px" }}>
                    {approved.length > 0 && <span className="badge badge-positive">{approved.length} Approved</span>}
                    {pending.length > 0 && <span className="badge badge-warning">{pending.length} Pending</span>}
                </div>
            </div>

            {consultations.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <p className="empty-state-text">No prescriptions yet. Send a voice note to your doctor to get started.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {consultations.map((c) => {
                        const isExpanded = expandedId === c.id;
                        const rd = c.receipt_data || {};
                        const rxItems = rd.prescription || [];
                        const isApproved = c.status === "approved";

                        return (
                            <div key={c.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", overflow: "hidden", borderColor: isApproved ? "rgba(34, 197, 94, 0.3)" : undefined }}>
                                {/* Header */}
                                <div
                                    onClick={() => setExpandedId(isExpanded ? null : c.id)}
                                    style={{ padding: "12px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", background: isApproved ? "rgba(34, 197, 94, 0.03)" : "transparent" }}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                        <span style={{ fontSize: "1.3rem" }}>{isApproved ? "✅" : "⏳"}</span>
                                        <div>
                                            <div style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                                                {isApproved ? "Prescription from Dr. " + (c.doctor?.full_name || "Doctor") : "Awaiting Doctor Review"}
                                            </div>
                                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                                {new Date(c.created_at).toLocaleDateString()} · {c.severity}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span className={`badge ${isApproved ? "badge-positive" : "badge-warning"}`}>
                                            {isApproved ? "✅ Approved" : "⏳ Pending"}
                                        </span>
                                        <span style={{ fontSize: "1rem", transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0)" }}>▾</span>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                        {/* Your message */}
                                        <div style={{ padding: "10px 14px", background: "rgba(20, 184, 166, 0.03)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-teal)" }}>
                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-teal)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Your Message (Translated)</div>
                                            <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>{c.transcript}</div>
                                        </div>

                                        {/* Prescription table (only if approved) */}
                                        {isApproved && rxItems.length > 0 && (
                                            <div>
                                                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-green)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>💊 Your Prescription</div>
                                                <div style={{ border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                                                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", padding: "8px 12px", background: "rgba(34, 197, 94, 0.06)", borderBottom: "1px solid rgba(34, 197, 94, 0.15)", fontSize: "0.7rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                                                        <span>Medicine</span>
                                                        <span>Quantity</span>
                                                        <span>Timing</span>
                                                        <span>Expiry</span>
                                                    </div>
                                                    {rxItems.map((rx, i) => (
                                                        <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr 1fr", padding: "10px 12px", borderBottom: i < rxItems.length - 1 ? "1px solid var(--border-subtle)" : "none", fontSize: "0.84rem", alignItems: "center" }}>
                                                            <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>💊 {rx.name}</span>
                                                            <span style={{ color: "var(--text-secondary)" }}>{rx.quantity || rx.dosage || "As prescribed"}</span>
                                                            <span style={{ color: "var(--text-secondary)" }}>{rx.timing}</span>
                                                            <span style={{ fontSize: "0.78rem", color: "var(--accent-amber)" }}>{rx.expiry || "30 days"}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Doctor's Response */}
                                        {c.doctor_response && (
                                            <div style={{ padding: "10px 14px", background: "rgba(59, 130, 246, 0.03)", borderRadius: "var(--radius-sm)", borderLeft: "3px solid var(--accent-blue)" }}>
                                                <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--accent-blue-light)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>Doctor's Notes</div>
                                                <div style={{ fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: "1.6" }}>{c.doctor_response}</div>
                                            </div>
                                        )}

                                        {/* SHA-256 Receipt (only if approved) */}
                                        {isApproved && c.receipt_hash && (
                                            <div style={{ padding: "10px 14px", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                                                    <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)" }}>🔐 DIGITAL RECEIPT · {rd.receipt_id || "RX"}</span>
                                                    <span className="badge badge-positive" style={{ fontSize: "0.65rem" }}>SHA-256 Verified</span>
                                                </div>
                                                <div style={{ fontSize: "0.65rem", fontFamily: "monospace", color: "var(--accent-teal)", wordBreak: "break-all", opacity: 0.8 }}>{c.receipt_hash}</div>
                                                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
                                                    Issued: {new Date(c.approved_at).toLocaleString()} · Expires: {rd.expires_at ? new Date(rd.expires_at).toLocaleDateString() : "30 days"}
                                                </div>
                                            </div>
                                        )}

                                        {/* Download Button */}
                                        {isApproved && c.receipt_hash && (
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => openPrescriptionReceipt(c)}
                                                style={{ width: "100%" }}
                                            >
                                                📥 Download Prescription Receipt
                                            </button>
                                        )}

                                        {/* Pending state */}
                                        {!isApproved && (
                                            <div style={{ textAlign: "center", padding: "12px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                                                ⏳ Your doctor is reviewing your voice note. You'll receive a prescription once approved.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
