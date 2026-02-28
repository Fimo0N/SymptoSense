"use client";

import { useState, useCallback } from "react";
import { createSpeechRecognizer, SUPPORTED_LANGUAGES } from "@/lib/azureServices";

export default function DictationTool({ onGenerateSOAP, sampleDictation }) {
    const [text, setText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [interimText, setInterimText] = useState("");
    const [recognizer, setRecognizer] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedLanguage, setSelectedLanguage] = useState("en-US");

    const handleStartRecording = useCallback(() => {
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
        setIsRecording(false);
        setInterimText("");
    }, [recognizer]);

    const handleGenerateSOAP = useCallback(async () => {
        if (!text.trim()) return;
        setIsGenerating(true);
        try {
            await onGenerateSOAP?.(text);
        } catch (error) {
            console.error("SOAP generation error:", error);
        }
        setIsGenerating(false);
    }, [text, onGenerateSOAP]);

    const handleUseSample = useCallback(() => {
        setText(sampleDictation || "");
    }, [sampleDictation]);

    const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLanguage);

    return (
        <div className="card card-glass animate-fade-in animate-delay-1">
            <div className="card-header">
                <h2 className="card-title">
                    <span className="card-title-icon">🎙️</span>
                    Clinical Dictation Tool
                </h2>
                {isGenerating && (
                    <div className="loading-dots">
                        <span></span><span></span><span></span>
                    </div>
                )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Language Selector */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        🌐 Language:
                    </label>
                    <select
                        className="select"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        disabled={isRecording}
                        id="clinician-language-select"
                        style={{
                            flex: 1,
                            padding: "0.5rem 0.75rem",
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "0.85rem",
                            cursor: "pointer",
                        }}
                    >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>
                                {lang.flag} {lang.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Recording controls */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <button
                        className={`record-btn ${isRecording ? "recording" : ""}`}
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        aria-label={isRecording ? "Stop dictation" : "Start dictation"}
                        id="clinician-record-btn"
                    >
                        {isRecording ? "⏹" : "🎤"}
                    </button>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "600", marginBottom: "4px" }}>
                            {isRecording ? (
                                <span style={{ color: "var(--accent-rose)" }}>
                                    Dictating in {currentLang?.label || "English"}... Speak your clinical notes
                                </span>
                            ) : (
                                "Tap to dictate or type your clinical notes"
                            )}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            Speak in {currentLang?.label || "any language"} — the AI will structure it into a SOAP note
                        </div>
                    </div>
                </div>

                {/* Interim text display */}
                {interimText && (
                    <div
                        style={{
                            padding: "8px 12px",
                            background: "rgba(20, 184, 166, 0.05)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.85rem",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                        }}
                    >
                        {interimText}
                    </div>
                )}

                {/* Text input */}
                <textarea
                    className="textarea"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder='E.g., "Patient presents with a 3-day history of severe headaches. Vitals normal. Assessment is acute migraine. Plan is to prescribe Sumatriptan..."'
                    rows={6}
                    id="clinician-dictation-textarea"
                />

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <button
                        className="btn btn-primary"
                        onClick={handleGenerateSOAP}
                        disabled={!text.trim() || isGenerating}
                        id="generate-soap-btn"
                    >
                        {isGenerating ? (
                            <>
                                <div className="loading-dots">
                                    <span></span><span></span><span></span>
                                </div>
                                Generating SOAP Note...
                            </>
                        ) : (
                            <>
                                <span>📝</span> Generate SOAP Note
                            </>
                        )}
                    </button>
                    <button
                        className="btn btn-secondary"
                        onClick={handleUseSample}
                        id="use-sample-dictation-btn"
                    >
                        <span>📋</span> Use Sample Dictation
                    </button>
                    {text && (
                        <button
                            className="btn btn-ghost"
                            onClick={() => setText("")}
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
