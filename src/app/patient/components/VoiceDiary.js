"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createSpeechRecognizer, SUPPORTED_LANGUAGES } from "@/lib/azureServices";
import { supabase } from "@/lib/supabase";

export default function VoiceDiary({ onNewEntry }) {
    const [text, setText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [interimText, setInterimText] = useState("");
    const [recognizer, setRecognizer] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState("en-US");
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState("");
    const [sendMode, setSendMode] = useState("diary"); // "diary" or "consult"
    const [audioBlob, setAudioBlob] = useState(null);
    const [voiceAnalysis, setVoiceAnalysis] = useState(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    // Fetch available doctors
    useEffect(() => {
        async function loadDoctors() {
            try {
                const { data } = await supabase
                    .from("profiles")
                    .select("id, full_name, email")
                    .eq("role", "doctor");
                if (data) setDoctors(data);
            } catch (err) {
                console.error("Failed to load doctors:", err);
            }
        }
        loadDoctors();
    }, []);

    // Start audio recording for voice note
    const startAudioRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                setAudioBlob(blob);
                stream.getTracks().forEach((t) => t.stop());
            };

            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.start();
        } catch (err) {
            console.warn("Audio recording not available:", err);
        }
    };

    const handleStartRecording = useCallback(() => {
        // Start audio recording in parallel
        startAudioRecording();

        const rec = createSpeechRecognizer(
            (final, interim) => {
                setText(final);
                setInterimText(interim);
            },
            (error) => {
                console.warn("Speech recognition error:", error);
                setIsRecording(false);
            },
            (finalText) => {
                setText(finalText);
                setInterimText("");
                setIsRecording(false);
            },
            selectedLanguage
        );

        if (rec) {
            rec.start();
            setRecognizer(rec);
            setIsRecording(true);
        }
    }, [selectedLanguage]);

    const handleStopRecording = useCallback(() => {
        if (recognizer) {
            recognizer.stop();
            setRecognizer(null);
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
        setInterimText("");
    }, [recognizer]);

    const handleSubmit = useCallback(async () => {
        if (!text.trim()) return;
        setIsProcessing(true);

        try {
            // Process through AI
            const response = await fetch("/api/process-diary", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text.trim() }),
            });
            const data = await response.json();

            const entry = data.success && data.entry
                ? data.entry
                : {
                    id: `d-${Date.now()}`,
                    date: new Date().toISOString().split("T")[0],
                    timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
                    text: text.trim(),
                    entities: [],
                    sentiment: 0,
                    sentimentLabel: "Neutral",
                };

            // Get current user
            const { data: userData } = await supabase.auth.getUser();
            const userId = userData?.user?.id;

            if (sendMode === "consult" && selectedDoctor) {
                // Upload voice note as base64 data URL if available
                let voiceNoteUrl = null;
                if (audioBlob) {
                    const reader = new FileReader();
                    voiceNoteUrl = await new Promise((resolve) => {
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(audioBlob);
                    });
                }

                // Send as consultation to specific doctor
                const consultRes = await fetch("/api/consultations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        patientId: userId,
                        doctorId: selectedDoctor,
                        transcript: text.trim(),
                        language: selectedLanguage,
                        entities: entry.entities,
                        sentiment: entry.sentiment,
                        sentimentLabel: entry.sentimentLabel,
                        voiceNoteUrl,
                    }),
                });
                const consultData = await consultRes.json();
                if (consultData.success) {
                    console.log("[VoiceDiary] Consultation sent to doctor!");
                }
            }

            // Also save as diary entry
            onNewEntry?.(entry);

            // Sync to shared store
            try {
                await fetch("/api/diary-entries", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ entry, patientId: userId }),
                });
            } catch (err) {
                console.error("Sync failed:", err);
            }
            // Run voice analysis
            try {
                const analysisRes = await fetch("/api/voice-analysis", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        transcript: text.trim(),
                        sentiment: entry.sentiment,
                        sentimentLabel: entry.sentimentLabel || entry.sentiment_label,
                    }),
                });
                const analysisData = await analysisRes.json();
                if (analysisData.success) setVoiceAnalysis(analysisData.analysis);
            } catch (err) {
                console.warn("Voice analysis failed:", err);
            }

        } catch (error) {
            console.error("Submit error:", error);
        }

        setText("");
        setAudioBlob(null);
        setIsProcessing(false);
    }, [text, onNewEntry, sendMode, selectedDoctor, audioBlob, selectedLanguage]);

    const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);

    return (
        <div className="card card-glass animate-fade-in">
            <div className="card-header">
                <h2 className="card-title">
                    <span className="card-title-icon">🎙️</span>
                    Voice Health Diary
                </h2>
                {isProcessing && (
                    <div className="loading-dots"><span></span><span></span><span></span></div>
                )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Send Mode Toggle */}
                <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                        className={`btn ${sendMode === "diary" ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => setSendMode("diary")}
                        style={{ flex: 1, fontSize: "0.82rem", padding: "8px" }}
                    >
                        📝 Save to Diary
                    </button>
                    <button
                        className={`btn ${sendMode === "consult" ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => setSendMode("consult")}
                        style={{ flex: 1, fontSize: "0.82rem", padding: "8px" }}
                    >
                        📤 Send to Doctor
                    </button>
                </div>

                {/* Doctor Selector (visible when sending to doctor) */}
                {sendMode === "consult" && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            ⚕️ Doctor:
                        </label>
                        <select
                            className="patient-select"
                            value={selectedDoctor}
                            onChange={(e) => setSelectedDoctor(e.target.value)}
                            style={{ flex: 1 }}
                        >
                            <option value="">Select a doctor...</option>
                            {doctors.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    Dr. {doc.full_name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Language Selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        🌐 Language:
                    </label>
                    <select
                        className="patient-select"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        disabled={isRecording}
                        style={{ flex: 1 }}
                    >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                                {lang.flag} {lang.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Recording Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <button
                        className={`record-btn ${isRecording ? "recording" : ""}`}
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                    >
                        {isRecording ? "⏹" : "🎤"}
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                            {isRecording ? (
                                <span style={{ color: "var(--accent-rose)" }}>
                                    Recording in {currentLang?.label || "English"}...
                                    {sendMode === "consult" ? " 🔴 Voice note will be saved" : ""}
                                </span>
                            ) : (
                                sendMode === "consult" ? "Tap to record a voice note for your doctor" : "Tap to record or type below"
                            )}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            {sendMode === "consult"
                                ? "Your voice note + transcript will be sent to the doctor"
                                : `Speak in ${currentLang?.label || "any language"} — describe symptoms, medications, mood`
                            }
                        </div>
                    </div>
                </div>

                {/* Audio playback preview */}
                {audioBlob && !isRecording && (
                    <div style={{ padding: "8px 12px", background: "rgba(20, 184, 166, 0.05)", borderRadius: "var(--radius-sm)" }}>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>🔊 Voice note recorded:</div>
                        <audio controls src={URL.createObjectURL(audioBlob)} style={{ width: "100%", height: "32px" }} />
                    </div>
                )}

                {/* Interim text */}
                {interimText && (
                    <div style={{ padding: "8px 12px", background: "rgba(20, 184, 166, 0.05)", borderRadius: "var(--radius-sm)", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                        {interimText}
                    </div>
                )}

                {/* Text input */}
                <textarea
                    className="textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={sendMode === "consult"
                        ? "Describe your symptoms to send to your doctor..."
                        : 'E.g., "I woke up with a massive headache, took 400mg Ibuprofen..."'
                    }
                    rows={4}
                />

                {/* Submit */}
                <button
                    className="btn btn-primary"
                    onClick={handleSubmit}
                    disabled={!text.trim() || isProcessing || (sendMode === "consult" && !selectedDoctor)}
                >
                    {isProcessing ? (
                        <><div className="loading-dots"><span></span><span></span><span></span></div> Processing...</>
                    ) : sendMode === "consult" ? (
                        <><span>📤</span> Send to Doctor</>
                    ) : (
                        <><span>✨</span> Analyze & Save</>
                    )}
                </button>

                {/* Voice Analysis Results */}
                {voiceAnalysis && (
                    <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
                        <div style={{ fontSize: "0.78rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "10px" }}>
                            🧠 Voice Tone Analysis
                        </div>
                        <div className="voice-analysis-card">
                            {/* Stress */}
                            <div className="voice-metric">
                                <div className="voice-metric-icon">{voiceAnalysis.stress?.level === "high" || voiceAnalysis.stress?.level === "critical" ? "🔴" : voiceAnalysis.stress?.level === "moderate" ? "🟡" : "🟢"}</div>
                                <div className="voice-metric-label">Stress</div>
                                <div className="voice-metric-value" style={{ color: voiceAnalysis.stress?.score > 60 ? "#f43f5e" : voiceAnalysis.stress?.score > 30 ? "#f59e0b" : "#22c55e" }}>
                                    {voiceAnalysis.stress?.level || "low"}
                                </div>
                                <div className="voice-metric-sub">Score: {voiceAnalysis.stress?.score || 0}/100</div>
                            </div>
                            {/* Emotion */}
                            <div className="voice-metric">
                                <div className="voice-metric-icon">
                                    {voiceAnalysis.emotion?.primary === "Distressed" ? "😰" : voiceAnalysis.emotion?.primary === "Anxious" ? "😟" : voiceAnalysis.emotion?.primary === "Sad" ? "😢" : voiceAnalysis.emotion?.primary === "Hopeful" ? "😊" : "😐"}
                                </div>
                                <div className="voice-metric-label">Emotion</div>
                                <div className="voice-metric-value" style={{ color: "var(--accent-blue-light)" }}>
                                    {voiceAnalysis.emotion?.primary || "Neutral"}
                                </div>
                                <div className="voice-metric-sub">Variance: {voiceAnalysis.emotion?.variance || "stable"}</div>
                            </div>
                            {/* Fatigue */}
                            <div className="voice-metric">
                                <div className="voice-metric-icon">{voiceAnalysis.fatigue?.level === "severe" ? "😴" : voiceAnalysis.fatigue?.level === "moderate" ? "🥱" : "⚡"}</div>
                                <div className="voice-metric-label">Fatigue</div>
                                <div className="voice-metric-value" style={{ color: voiceAnalysis.fatigue?.score > 50 ? "#f59e0b" : "#22c55e" }}>
                                    {voiceAnalysis.fatigue?.level || "none"}
                                </div>
                                <div className="voice-metric-sub">Score: {voiceAnalysis.fatigue?.score || 0}/100</div>
                            </div>
                        </div>

                        {/* Wellness bar */}
                        <div style={{ marginTop: "12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Overall Wellness</span>
                                <span style={{ fontSize: "0.78rem", fontWeight: "700", color: voiceAnalysis.overallWellness > 70 ? "#22c55e" : voiceAnalysis.overallWellness > 40 ? "#f59e0b" : "#f43f5e" }}>
                                    {Math.round(voiceAnalysis.overallWellness || 0)}%
                                </span>
                            </div>
                            <div style={{ height: "8px", background: "var(--bg-secondary)", borderRadius: "4px", overflow: "hidden" }}>
                                <div style={{
                                    height: "100%", borderRadius: "4px", transition: "width 0.6s ease",
                                    width: `${voiceAnalysis.overallWellness || 0}%`,
                                    background: voiceAnalysis.overallWellness > 70 ? "linear-gradient(90deg, #22c55e, #14b8a6)" : voiceAnalysis.overallWellness > 40 ? "linear-gradient(90deg, #f59e0b, #fbbf24)" : "linear-gradient(90deg, #f43f5e, #fb7185)",
                                }} />
                            </div>
                        </div>

                        {/* Risk factors */}
                        {voiceAnalysis.riskFactors?.length > 0 && (
                            <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                {voiceAnalysis.riskFactors.map((f, i) => (
                                    <span key={i} style={{ padding: "3px 10px", borderRadius: "var(--radius-full)", background: "rgba(244, 63, 94, 0.08)", border: "1px solid rgba(244, 63, 94, 0.2)", fontSize: "0.7rem", color: "#f43f5e" }}>
                                        ⚠️ {f}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
