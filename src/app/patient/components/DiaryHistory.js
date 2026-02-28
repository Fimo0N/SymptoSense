"use client";

import { useState } from "react";

export default function DiaryHistory({ entries }) {
    const [expandedId, setExpandedId] = useState(null);

    if (!entries || entries.length === 0) {
        return (
            <div className="card animate-fade-in animate-delay-3">
                <div className="card-header">
                    <h2 className="card-title">
                        <span className="card-title-icon">📖</span>
                        Diary History
                    </h2>
                </div>
                <div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <p className="empty-state-text">No diary entries yet. Use the voice diary above to log your first entry!</p>
                </div>
            </div>
        );
    }

    const getSentimentBadge = (label) => {
        if (!label) return null;
        const lower = label.toLowerCase();
        if (lower.includes("positive")) return <span className="badge badge-positive">😊 {label}</span>;
        if (lower.includes("negative")) return <span className="badge badge-negative">😟 {label}</span>;
        return <span className="badge badge-neutral">😐 {label}</span>;
    };

    const getSeverityBadge = (severity) => {
        if (!severity) return null;
        const map = {
            serious: { color: "var(--accent-red)", bg: "rgba(239,68,68,0.1)", icon: "🚨" },
            moderate: { color: "var(--accent-amber)", bg: "rgba(245,158,11,0.1)", icon: "⚠️" },
            mild: { color: "var(--accent-green)", bg: "rgba(34,197,94,0.1)", icon: "✅" },
        };
        const s = map[severity] || map.mild;
        return (
            <span style={{
                padding: "3px 10px", borderRadius: "12px", fontSize: "0.7rem", fontWeight: "700",
                background: s.bg, color: s.color, textTransform: "uppercase", letterSpacing: "0.5px"
            }}>
                {s.icon} {severity}
            </span>
        );
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

    const formatDateTime = (entry) => {
        if (entry.created_at) {
            const d = new Date(entry.created_at);
            return {
                date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
                time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }),
            };
        }
        return { date: entry.date || "—", time: entry.timestamp || "" };
    };

    const getSentimentColor = (score) => {
        if (score >= 0.3) return "var(--accent-green)";
        if (score <= -0.3) return "var(--accent-red)";
        return "var(--accent-amber)";
    };

    const getSentimentPercent = (score) => Math.round(((score + 1) / 2) * 100);

    return (
        <div className="card animate-fade-in animate-delay-3">
            <div className="card-header">
                <h2 className="card-title">
                    <span className="card-title-icon">📖</span>
                    Diary History
                </h2>
                <span className="badge badge-info">{entries.length} entries</span>
            </div>
            <div style={{ maxHeight: "500px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                {entries.map((entry) => {
                    const isExpanded = expandedId === entry.id;
                    const { date, time } = formatDateTime(entry);
                    const sentimentScore = entry.sentiment || 0;

                    return (
                        <div
                            key={entry.id}
                            onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                            style={{
                                border: isExpanded ? "1px solid var(--accent-teal)" : "1px solid var(--border-subtle)",
                                borderRadius: "var(--radius-md)",
                                padding: "12px 14px",
                                cursor: "pointer",
                                transition: "all 0.25s ease",
                                background: isExpanded ? "rgba(20,184,166,0.03)" : "transparent",
                            }}
                        >
                            {/* Header Row: Date/Time + Severity + Sentiment */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "600" }}>
                                        📅 {date}
                                    </span>
                                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                                        🕐 {time}
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    {getSeverityBadge(entry.severity)}
                                    {getSentimentBadge(entry.sentimentLabel || entry.sentiment_label)}
                                </div>
                            </div>

                            {/* Text Preview */}
                            <p style={{
                                fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: "1.5",
                                margin: "0 0 8px 0",
                                overflow: isExpanded ? "visible" : "hidden",
                                textOverflow: isExpanded ? "unset" : "ellipsis",
                                whiteSpace: isExpanded ? "normal" : "nowrap",
                            }}>
                                {entry.text}
                            </p>

                            {/* Entity Tags (always visible) */}
                            {entry.entities && entry.entities.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: isExpanded ? "10px" : "0" }}>
                                    {entry.entities.map((entity, idx) => (
                                        <span
                                            key={idx}
                                            className={`entity-tag ${getEntityClass(entity.type)}`}
                                        >
                                            {getEntityIcon(entity.type)} {entity.text}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Expanded Detail Panel */}
                            {isExpanded && (
                                <div style={{
                                    marginTop: "10px", paddingTop: "10px",
                                    borderTop: "1px solid var(--border-subtle)",
                                    display: "flex", flexDirection: "column", gap: "10px",
                                    animation: "fadeIn 0.3s ease",
                                }}>
                                    {/* Sentiment Score Bar */}
                                    <div>
                                        <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                                            📊 Sentiment Analysis
                                        </div>
                                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                            <div style={{
                                                flex: 1, height: "8px", borderRadius: "4px",
                                                background: "rgba(255,255,255,0.06)", overflow: "hidden"
                                            }}>
                                                <div style={{
                                                    width: `${getSentimentPercent(sentimentScore)}%`,
                                                    height: "100%", borderRadius: "4px",
                                                    background: `linear-gradient(90deg, var(--accent-red), var(--accent-amber), var(--accent-green))`,
                                                    transition: "width 0.5s ease",
                                                }} />
                                            </div>
                                            <span style={{
                                                fontSize: "0.82rem", fontWeight: "700",
                                                color: getSentimentColor(sentimentScore),
                                                minWidth: "45px", textAlign: "right",
                                            }}>
                                                {sentimentScore > 0 ? "+" : ""}{sentimentScore.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Stats Grid */}
                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                                        <div style={{
                                            padding: "10px", borderRadius: "var(--radius-sm)",
                                            background: "rgba(255,255,255,0.03)", textAlign: "center",
                                            border: "1px solid var(--border-subtle)",
                                        }}>
                                            <div style={{ fontSize: "1.1rem", fontWeight: "800", color: getSentimentColor(sentimentScore) }}>
                                                {getSentimentPercent(sentimentScore)}%
                                            </div>
                                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                                Wellness
                                            </div>
                                        </div>
                                        <div style={{
                                            padding: "10px", borderRadius: "var(--radius-sm)",
                                            background: "rgba(255,255,255,0.03)", textAlign: "center",
                                            border: "1px solid var(--border-subtle)",
                                        }}>
                                            <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--accent-blue-light)" }}>
                                                {entry.entities?.length || 0}
                                            </div>
                                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                                Entities
                                            </div>
                                        </div>
                                        <div style={{
                                            padding: "10px", borderRadius: "var(--radius-sm)",
                                            background: "rgba(255,255,255,0.03)", textAlign: "center",
                                            border: "1px solid var(--border-subtle)",
                                        }}>
                                            <div style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)" }}>
                                                {entry.language || "en-US"}
                                            </div>
                                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                                                Language
                                            </div>
                                        </div>
                                    </div>

                                    {/* Entity Breakdown */}
                                    {entry.entities && entry.entities.length > 0 && (
                                        <div>
                                            <div style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                                                🔬 Detected Medical Entities
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                                {entry.entities.map((entity, idx) => (
                                                    <div key={idx} style={{
                                                        display: "flex", justifyContent: "space-between", alignItems: "center",
                                                        padding: "6px 10px", borderRadius: "var(--radius-sm)",
                                                        background: "rgba(255,255,255,0.02)",
                                                        border: "1px solid var(--border-subtle)",
                                                    }}>
                                                        <span style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>
                                                            {getEntityIcon(entity.type)} {entity.text}
                                                        </span>
                                                        <span style={{
                                                            fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase",
                                                            fontWeight: "600", letterSpacing: "0.5px",
                                                        }}>
                                                            {entity.type} {entity.confidence ? `· ${Math.round(entity.confidence * 100)}%` : ""}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textAlign: "center", paddingTop: "4px" }}>
                                        Click anywhere to collapse
                                    </div>
                                </div>
                            )}

                            {/* Expand hint */}
                            {!isExpanded && (
                                <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "4px", textAlign: "right" }}>
                                    Click to view full analysis →
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
