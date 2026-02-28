"use client";

import { useState, useCallback, useEffect } from "react";

export default function SOAPNote({ soapData, onSave }) {
    const [editedData, setEditedData] = useState(soapData);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // Sync with incoming soapData
    useEffect(() => {
        setEditedData(soapData);
        setSaved(false);
    }, [soapData]);

    const handleChange = useCallback((section, value) => {
        setEditedData((prev) => ({ ...prev, [section]: value }));
        setSaved(false);
    }, []);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        // Simulate save delay
        await new Promise((resolve) => setTimeout(resolve, 800));
        onSave?.(editedData);
        setIsSaving(false);
        setSaved(true);
        // Clear saved indicator after 3s
        setTimeout(() => setSaved(false), 3000);
    }, [editedData, onSave]);

    if (!soapData) {
        return (
            <div className="card animate-fade-in animate-delay-2">
                <div className="card-header">
                    <h2 className="card-title">
                        <span className="card-title-icon">📋</span>
                        SOAP Note
                    </h2>
                </div>
                <div className="empty-state">
                    <div className="empty-state-icon">📝</div>
                    <p className="empty-state-text">
                        Dictate or type clinical notes above, then click "Generate SOAP Note" to see the structured output here.
                    </p>
                </div>
            </div>
        );
    }

    const sections = [
        { key: "subjective", label: "Subjective", cssClass: "soap-s", icon: "🗣️" },
        { key: "objective", label: "Objective", cssClass: "soap-o", icon: "🔍" },
        { key: "assessment", label: "Assessment", cssClass: "soap-a", icon: "🧠" },
        { key: "plan", label: "Plan", cssClass: "soap-p", icon: "📋" },
    ];

    return (
        <div className="card animate-scale-in">
            <div className="card-header">
                <h2 className="card-title">
                    <span className="card-title-icon">📋</span>
                    SOAP Note
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {saved && (
                        <span className="badge badge-positive">✓ Saved</span>
                    )}
                    <span className="badge badge-info">AI Generated</span>
                </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
                {sections.map(({ key, label, cssClass, icon }) => (
                    <div key={key} className={`soap-section ${cssClass}`}>
                        <div className="soap-label">{icon} {label}</div>
                        <textarea
                            className="soap-textarea"
                            value={editedData?.[key] || ""}
                            onChange={(e) => handleChange(key, e.target.value)}
                            rows={3}
                            id={`soap-${key}-textarea`}
                        />
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    id="save-soap-btn"
                >
                    {isSaving ? (
                        <>
                            <div className="loading-dots">
                                <span></span><span></span><span></span>
                            </div>
                            Saving...
                        </>
                    ) : (
                        <>
                            <span>💾</span> Save to Record
                        </>
                    )}
                </button>
                <button
                    className="btn btn-ghost"
                    onClick={() => {
                        setEditedData(soapData);
                        setSaved(false);
                    }}
                >
                    Reset
                </button>
            </div>
        </div>
    );
}
