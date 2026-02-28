"use client";

export default function DiaryHistory({ entries }) {
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

    return (
        <div className="card animate-fade-in animate-delay-3">
            <div className="card-header">
                <h2 className="card-title">
                    <span className="card-title-icon">📖</span>
                    Diary History
                </h2>
                <span className="badge badge-info">{entries.length} entries</span>
            </div>
            <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                {entries.map((entry) => (
                    <div key={entry.id} className="diary-entry">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div className="diary-date">
                                {entry.date} · {entry.timestamp}
                            </div>
                            {getSentimentBadge(entry.sentimentLabel)}
                        </div>
                        <p className="diary-text">{entry.text}</p>
                        {entry.entities && entry.entities.length > 0 && (
                            <div className="diary-entities">
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
                    </div>
                ))}
            </div>
        </div>
    );
}
