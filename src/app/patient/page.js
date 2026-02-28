"use client";

import { useState, useCallback, useEffect } from "react";
import Navigation from "../components/Navigation";
import VoiceDiary from "./components/VoiceDiary";
import DiaryHistory from "./components/DiaryHistory";
import MyPrescriptions from "./components/MyPrescriptions";
import { supabase } from "@/lib/supabase";

export default function PatientPortal() {
    const [entries, setEntries] = useState([]);
    const [user, setUser] = useState(null);

    // Get current user
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setUser(data.user);
        });
    }, []);

    // Load saved entries from shared store
    const loadEntries = useCallback(async () => {
        if (!user) return;
        try {
            const res = await fetch(`/api/diary-entries?patient_id=${user.id}`);
            const data = await res.json();
            if (data.success) {
                setEntries(data.entries || []);
            }
        } catch (err) {
            console.error("Failed to load entries:", err);
        }
    }, [user]);

    useEffect(() => {
        loadEntries();
    }, [loadEntries]);

    const handleNewEntry = useCallback(async (entry) => {
        try {
            await fetch("/api/diary-entries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entry, patientId: user?.id }),
            });
            // Re-fetch from server to avoid duplicates
            await loadEntries();
        } catch (err) {
            console.error("Failed to sync entry:", err);
            // Fallback: add locally if server fails
            setEntries((prev) => [entry, ...prev]);
        }
    }, [user, loadEntries]);



    const entryCount = entries.length;
    const avgSentiment = entries.length > 0
        ? (entries.reduce((sum, e) => sum + (e.sentiment || 0), 0) / entries.length).toFixed(2)
        : "—";
    const totalEntities = entries.reduce(
        (sum, e) => sum + (e.entities?.length || 0),
        0
    );

    return (
        <>
            <Navigation />
            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">Patient Health Diary</h1>
                    <p className="page-subtitle">
                        {user
                            ? `Welcome back! Log your symptoms, medications, and mood.`
                            : "Track your daily symptoms, medications, and mood with AI-powered insights."}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid-3 animate-fade-in" style={{ marginBottom: "1.5rem" }}>
                    <div className="card stat-card">
                        <div className="stat-value">{entryCount}</div>
                        <div className="stat-label">Diary Entries</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-value">{avgSentiment}</div>
                        <div className="stat-label">Avg Sentiment</div>
                    </div>
                    <div className="card stat-card">
                        <div className="stat-value">{totalEntities}</div>
                        <div className="stat-label">Entities Extracted</div>
                    </div>
                </div>

                <div className="grid-2">
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <VoiceDiary onNewEntry={handleNewEntry} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <MyPrescriptions />
                        <DiaryHistory entries={entries} />
                    </div>
                </div>
            </div>
        </>
    );
}
