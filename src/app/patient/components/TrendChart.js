"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export default function TrendChart({ trendData }) {
    const chartData = useMemo(
        () => ({
            labels: trendData?.labels || [],
            datasets: [
                {
                    label: "Pain Level",
                    data: trendData?.painLevels || [],
                    borderColor: "#f43f5e",
                    backgroundColor: "rgba(244, 63, 94, 0.1)",
                    borderWidth: 2,
                    pointRadius: 5,
                    pointBackgroundColor: "#f43f5e",
                    pointBorderColor: "#0a0e1a",
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: true,
                },
                {
                    label: "Mood Score",
                    data: trendData?.moodScores || [],
                    borderColor: "#14b8a6",
                    backgroundColor: "rgba(20, 184, 166, 0.08)",
                    borderWidth: 2,
                    pointRadius: 5,
                    pointBackgroundColor: "#14b8a6",
                    pointBorderColor: "#0a0e1a",
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: true,
                },
                {
                    label: "Medication Doses",
                    data: trendData?.medicationDoses || [],
                    borderColor: "#3b82f6",
                    backgroundColor: "rgba(59, 130, 246, 0.08)",
                    borderWidth: 2,
                    pointRadius: 5,
                    pointBackgroundColor: "#3b82f6",
                    pointBorderColor: "#0a0e1a",
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: false,
                    borderDash: [5, 5],
                },
            ],
        }),
        [trendData]
    );

    const options = useMemo(
        () => ({
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false,
            },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        color: "#94a3b8",
                        font: { family: "Inter", size: 12, weight: "500" },
                        usePointStyle: true,
                        pointStyle: "circle",
                        padding: 20,
                    },
                },
                tooltip: {
                    backgroundColor: "#1a2236",
                    titleColor: "#f1f5f9",
                    bodyColor: "#94a3b8",
                    borderColor: "rgba(148, 163, 184, 0.2)",
                    borderWidth: 1,
                    padding: 12,
                    titleFont: { family: "Inter", weight: "600" },
                    bodyFont: { family: "Inter" },
                    cornerRadius: 8,
                },
            },
            scales: {
                x: {
                    grid: {
                        color: "rgba(148, 163, 184, 0.06)",
                    },
                    ticks: {
                        color: "#64748b",
                        font: { family: "Inter", size: 11 },
                    },
                },
                y: {
                    beginAtZero: true,
                    max: 10,
                    grid: {
                        color: "rgba(148, 163, 184, 0.06)",
                    },
                    ticks: {
                        color: "#64748b",
                        font: { family: "Inter", size: 11 },
                        stepSize: 2,
                    },
                },
            },
        }),
        []
    );

    return (
        <div className="card animate-fade-in animate-delay-2">
            <div className="card-header">
                <h2 className="card-title">
                    <span className="card-title-icon">📈</span>
                    7-Day Health Trends
                </h2>
            </div>
            <div style={{ height: "300px", position: "relative" }}>
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
}
