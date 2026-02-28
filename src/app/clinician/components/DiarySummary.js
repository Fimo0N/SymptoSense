"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

export default function DiarySummary({ patient, entries, trendData }) {
    if (!patient) return null;

    // Calculate summary stats from entries
    const summary = useMemo(() => {
        if (!entries || entries.length === 0) return null;

        const symptomCounts = {};
        const medications = new Set();
        let totalSentiment = 0;

        entries.forEach((entry) => {
            totalSentiment += entry.sentiment || 0;
            entry.entities?.forEach((e) => {
                if (e.type === "symptom") {
                    const key = e.text.toLowerCase();
                    symptomCounts[key] = (symptomCounts[key] || 0) + 1;
                }
                if (e.type === "medication") {
                    medications.add(e.text);
                }
            });
        });

        const topSymptoms = Object.entries(symptomCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return {
            totalEntries: entries.length,
            avgSentiment: (totalSentiment / entries.length).toFixed(2),
            topSymptoms,
            medications: Array.from(medications),
        };
    }, [entries]);

    const miniChartData = useMemo(() => {
        if (!trendData) return null;
        return {
            labels: trendData.labels,
            datasets: [
                {
                    data: trendData.painLevels,
                    borderColor: "#f43f5e",
                    backgroundColor: "rgba(244, 63, 94, 0.1)",
                    borderWidth: 2,
                    pointRadius: 3,
                    tension: 0.4,
                    fill: true,
                },
            ],
        };
    }, [trendData]);

    const miniChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
            x: { display: false },
            y: { display: false, beginAtZero: true, max: 10 },
        },
    };

    const getSentimentEmoji = (score) => {
        if (score > 0.3) return "😊";
        if (score > 0) return "🙂";
        if (score > -0.3) return "😐";
        return "😟";
    };

    return (
        <div className="card animate-fade-in">
            <div className="card-header">
                <h2 className="card-title">
                    <span className="card-title-icon">📋</span>
                    7-Day AI Diary Summary
                </h2>
                <span className="badge badge-info">{patient.name}</span>
            </div>

            {!summary ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📭</div>
                    <p className="empty-state-text">No diary entries yet. Entries submitted by the patient will appear here automatically.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {/* Quick Stats Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                        <div style={{ textAlign: "center", padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                            <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--accent-teal)" }}>{summary.totalEntries}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Entries</div>
                        </div>
                        <div style={{ textAlign: "center", padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                            <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>
                                {getSentimentEmoji(parseFloat(summary.avgSentiment))} {summary.avgSentiment}
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Avg Mood</div>
                        </div>
                        <div style={{ textAlign: "center", padding: "0.75rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)" }}>
                            <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--accent-rose)" }}>{summary.topSymptoms.length}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Unique Symptoms</div>
                        </div>
                    </div>

                    {/* Mini Trend */}
                    {miniChartData && (
                        <div style={{ height: "80px" }}>
                            <Line data={miniChartData} options={miniChartOptions} />
                        </div>
                    )}

                    {/* Top Symptoms */}
                    <div>
                        <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                            Top Symptoms
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {summary.topSymptoms.map(([symptom, count]) => (
                                <span key={symptom} className="entity-tag entity-symptom">
                                    🔴 {symptom} ({count}x)
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Medications */}
                    <div>
                        <div style={{ fontSize: "0.78rem", fontWeight: "600", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
                            Medications Reported
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {summary.medications.map((med) => (
                                <span key={med} className="entity-tag entity-medication">
                                    💊 {med}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
