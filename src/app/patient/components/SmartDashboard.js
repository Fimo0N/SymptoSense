"use client";

import { useState, useEffect, useMemo } from "react";

export default function SmartDashboard({ entries = [] }) {
    const [activeTab, setActiveTab] = useState("heatmap");

    // Process entries into daily data
    const dailyData = useMemo(() => {
        const grouped = {};
        entries.forEach((e) => {
            const date = new Date(e.created_at || e.date).toISOString().split("T")[0];
            if (!grouped[date]) grouped[date] = { entries: [], symptoms: [], sentiment: 0, severity: "mild", count: 0 };
            grouped[date].entries.push(e);
            grouped[date].count++;
            grouped[date].sentiment += e.sentiment || 0;
            const syms = (e.entities || []).filter((en) => en.type === "symptom").map((en) => en.text);
            grouped[date].symptoms.push(...syms);
            if (e.severity === "serious") grouped[date].severity = "serious";
            else if (e.severity === "moderate" && grouped[date].severity !== "serious") grouped[date].severity = "moderate";
        });

        Object.keys(grouped).forEach((d) => {
            grouped[d].avgSentiment = grouped[d].count > 0 ? grouped[d].sentiment / grouped[d].count : 0;
        });

        return grouped;
    }, [entries]);

    // Weekly health score
    const healthScore = useMemo(() => {
        if (entries.length === 0) return { score: 0, trend: "stable", factors: [] };

        const recent = entries.slice(0, 14); // Last 14 entries
        const avgSentiment = recent.reduce((s, e) => s + (e.sentiment || 0), 0) / recent.length;
        const seriousCount = recent.filter((e) => e.severity === "serious").length;
        const moderateCount = recent.filter((e) => e.severity === "moderate").length;
        const totalSymptoms = recent.reduce((s, e) => s + ((e.entities || []).filter((en) => en.type === "symptom").length), 0);

        let score = 75;
        score += avgSentiment * 15;
        score -= seriousCount * 12;
        score -= moderateCount * 5;
        score -= totalSymptoms * 2;
        score = Math.max(0, Math.min(100, Math.round(score)));

        const factors = [];
        if (avgSentiment < -0.3) factors.push("Negative mood pattern");
        if (seriousCount > 0) factors.push(`${seriousCount} serious entries`);
        if (totalSymptoms > 5) factors.push("Multiple symptoms reported");
        if (avgSentiment > 0.2) factors.push("Positive outlook");
        if (seriousCount === 0 && moderateCount === 0) factors.push("No severe episodes");

        const trend = avgSentiment > 0.1 ? "improving" : avgSentiment < -0.2 ? "declining" : "stable";
        return { score, trend, factors };
    }, [entries]);

    // Symptom frequency
    const symptomFrequency = useMemo(() => {
        const freq = {};
        entries.forEach((e) => {
            (e.entities || []).filter((en) => en.type === "symptom").forEach((en) => {
                const key = en.text.toLowerCase();
                freq[key] = (freq[key] || 0) + 1;
            });
        });
        return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);
    }, [entries]);

    // Heatmap data (last 4 weeks)
    const heatmapData = useMemo(() => {
        const weeks = [];
        const today = new Date();
        for (let w = 3; w >= 0; w--) {
            const week = [];
            for (let d = 0; d < 7; d++) {
                const date = new Date(today);
                date.setDate(today.getDate() - (w * 7 + (6 - d)));
                const key = date.toISOString().split("T")[0];
                const dayData = dailyData[key];
                week.push({
                    date: key,
                    day: date.toLocaleDateString("en", { weekday: "short" }),
                    hasData: !!dayData,
                    severity: dayData?.severity || "none",
                    symptoms: dayData?.symptoms?.length || 0,
                    sentiment: dayData?.avgSentiment || 0,
                });
            }
            weeks.push(week);
        }
        return weeks;
    }, [dailyData]);

    // Timeline data (last 14 entries)
    const timelineData = useMemo(() => {
        return entries.slice(0, 14).reverse().map((e) => ({
            date: new Date(e.created_at || e.date).toLocaleDateString("en", { month: "short", day: "numeric" }),
            sentiment: e.sentiment || 0,
            severity: e.severity || "mild",
            symptoms: (e.entities || []).filter((en) => en.type === "symptom").length,
        }));
    }, [entries]);

    if (entries.length === 0) {
        return (
            <div className="card card-glass animate-fade-in">
                <div className="card-header">
                    <h2 className="card-title"><span className="card-title-icon">📊</span> Health Analytics</h2>
                </div>
                <div className="empty-state">
                    <div className="empty-state-icon">📈</div>
                    <p className="empty-state-text">Start logging diary entries to see your health analytics.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card card-glass animate-fade-in">
            <div className="card-header">
                <h2 className="card-title"><span className="card-title-icon">📊</span> Health Analytics</h2>
            </div>

            {/* Health Score Card */}
            <div className="health-score-card animate-scale-in">
                <div className="health-score-ring animate-float">
                    <svg viewBox="0 0 120 120" width="120" height="120">
                        <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                        <circle
                            cx="60" cy="60" r="52"
                            fill="none"
                            stroke={healthScore.score > 70 ? "#10b981" : healthScore.score > 40 ? "#f59e0b" : "#be123c"}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeDasharray={`${(healthScore.score / 100) * 327} 327`}
                            transform="rotate(-90 60 60)"
                            style={{ transition: "stroke-dasharray 1.5s cubic-bezier(0.4, 0, 0.2, 1)" }}
                        />
                        <text x="60" y="55" textAnchor="middle" fill="white" fontSize="28" fontWeight="800">{healthScore.score}</text>
                        <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="10" fontWeight="500">HEALTH SCORE</text>
                    </svg>
                </div>
                <div className="health-score-details stagger-container">
                    <div className="health-score-trend" style={{ animationDelay: "0.1s", animationName: "fade-in", animationDuration: "0.5s", animationFillMode: "forwards", opacity: 0 }}>
                        <span>{healthScore.trend === "improving" ? "📈" : healthScore.trend === "declining" ? "📉" : "➡️"}</span>
                        <span style={{ textTransform: "capitalize" }}>{healthScore.trend}</span>
                    </div>
                    <div className="health-score-factors stagger-container">
                        {healthScore.factors.map((f, i) => (
                            <span key={i} className="health-factor-tag">{f}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="dash-tabs">
                {[
                    { id: "heatmap", icon: "🗓️", label: "Symptom Heatmap" },
                    { id: "timeline", icon: "📈", label: "Mood Timeline" },
                    { id: "correlations", icon: "🔗", label: "Correlations" },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        className={`dash-tab ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.icon}</span> {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="dash-content">
                {activeTab === "heatmap" && (
                    <div>
                        <div className="dash-section-title">🗓️ 4-Week Symptom Heatmap</div>
                        <div className="heatmap-container">
                            <div className="heatmap-labels">
                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                                    <span key={d} className="heatmap-label">{d}</span>
                                ))}
                            </div>
                            <div className="heatmap-grid">
                                {heatmapData.map((week, wi) => (
                                    <div key={wi} className="heatmap-week">
                                        {week.map((day, di) => (
                                            <div
                                                key={di}
                                                className={`heatmap-cell ${day.hasData ? `heatmap-${day.severity}` : "heatmap-empty"}`}
                                                title={`${day.date}: ${day.hasData ? `${day.symptoms} symptoms, severity: ${day.severity}` : "No data"}`}
                                            >
                                                {day.symptoms > 0 && <span className="heatmap-count">{day.symptoms}</span>}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                            <div className="heatmap-legend">
                                <span className="heatmap-legend-item"><span className="heatmap-cell heatmap-empty" style={{ width: 14, height: 14 }} /> No data</span>
                                <span className="heatmap-legend-item"><span className="heatmap-cell heatmap-mild" style={{ width: 14, height: 14 }} /> Mild</span>
                                <span className="heatmap-legend-item"><span className="heatmap-cell heatmap-moderate" style={{ width: 14, height: 14 }} /> Moderate</span>
                                <span className="heatmap-legend-item"><span className="heatmap-cell heatmap-serious" style={{ width: 14, height: 14 }} /> Serious</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "timeline" && (
                    <div>
                        <div className="dash-section-title">📈 Mood & Severity Timeline</div>
                        <div className="timeline-chart">
                            {/* Mood line */}
                            <div className="timeline-bars">
                                {timelineData.map((d, i) => {
                                    const moodHeight = ((d.sentiment + 1) / 2) * 100;
                                    const severityColor = d.severity === "serious" ? "#f43f5e" : d.severity === "moderate" ? "#f59e0b" : "#22c55e";
                                    return (
                                        <div key={i} className="timeline-bar-group">
                                            <div className="timeline-bar-container">
                                                {/* Severity indicator */}
                                                <div
                                                    className="timeline-severity-dot"
                                                    style={{ backgroundColor: severityColor, bottom: `${Math.max(5, moodHeight)}%` }}
                                                    title={`Severity: ${d.severity}`}
                                                />
                                                {/* Mood bar */}
                                                <div
                                                    className="timeline-mood-bar"
                                                    style={{
                                                        height: `${Math.max(8, moodHeight)}%`,
                                                        background: d.sentiment > 0.2 ? "linear-gradient(to top, #22c55e40, #22c55e)" : d.sentiment < -0.2 ? "linear-gradient(to top, #f43f5e40, #f43f5e)" : "linear-gradient(to top, #f59e0b40, #f59e0b)",
                                                    }}
                                                    title={`Mood: ${d.sentiment.toFixed(2)}`}
                                                />
                                                {/* Symptom count overlay */}
                                                {d.symptoms > 0 && (
                                                    <div className="timeline-symptom-badge">{d.symptoms}</div>
                                                )}
                                            </div>
                                            <div className="timeline-date">{d.date}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="timeline-legend">
                                <span>📊 Bar = Mood level</span>
                                <span>🔴 Dot = Severity</span>
                                <span>🏷️ Badge = Symptom count</span>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "correlations" && (
                    <div>
                        <div className="dash-section-title">🔗 Symptom Frequency & Correlations</div>

                        {/* Top symptoms bar chart */}
                        <div className="correlation-section">
                            <div className="correlation-subtitle">Top Symptoms</div>
                            {symptomFrequency.length === 0 ? (
                                <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", padding: "12px 0" }}>No symptoms extracted yet.</div>
                            ) : (
                                <div className="symptom-bars stagger-container">
                                    {symptomFrequency.map(([name, count], i) => (
                                        <div key={i} className="symptom-bar-row">
                                            <div className="symptom-bar-label">{name}</div>
                                            <div className="symptom-bar-track">
                                                <div
                                                    className="symptom-bar-fill"
                                                    style={{
                                                        width: `${(count / (symptomFrequency[0]?.[1] || 1)) * 100}%`,
                                                        background: i === 0 ? "linear-gradient(90deg, #be123c, #fb7185)" : i < 3 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "var(--gradient-primary)",
                                                        transition: "width 1s cubic-bezier(0.16, 1, 0.3, 1) 0.3s"
                                                    }}
                                                />
                                            </div>
                                            <div className="symptom-bar-count">{count}×</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sentiment vs Severity correlation */}
                        <div className="correlation-section" style={{ marginTop: "1.5rem" }}>
                            <div className="correlation-subtitle">Mood vs Severity Distribution</div>
                            <div className="correlation-grid stagger-container">
                                {["mild", "moderate", "serious"].map((sev) => {
                                    const sevEntries = entries.filter((e) => e.severity === sev);
                                    const avgSent = sevEntries.length > 0
                                        ? (sevEntries.reduce((s, e) => s + (e.sentiment || 0), 0) / sevEntries.length).toFixed(2)
                                        : "—";
                                    const color = sev === "serious" ? "#be123c" : sev === "moderate" ? "#f59e0b" : "#10b981";
                                    return (
                                        <div key={sev} className="correlation-cell">
                                            <div className="correlation-severity" style={{ color }}>{sev === "serious" ? "🚨" : sev === "moderate" ? "⚠️" : "✅"} {sev}</div>
                                            <div className="correlation-value">{sevEntries.length}</div>
                                            <div className="correlation-meta">entries</div>
                                            <div className="correlation-mood" style={{ color: avgSent > 0 ? "#10b981" : avgSent < 0 ? "#be123c" : "#94a3b8" }}>
                                                avg mood: {avgSent}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
