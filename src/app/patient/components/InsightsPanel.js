"use client";

export default function InsightsPanel({ insights }) {
    if (!insights || insights.length === 0) return null;

    return (
        <div className="card animate-fade-in animate-delay-4">
            <div className="card-header">
                <h2 className="card-title">
                    <span className="card-title-icon">💡</span>
                    AI Health Insights
                </h2>
            </div>
            <div>
                {insights.map((insight) => (
                    <div key={insight.id || insight.title} className="insight-item">
                        <div
                            className="insight-icon"
                            style={{ background: insight.bgColor }}
                        >
                            {insight.icon}
                        </div>
                        <div className="insight-content">
                            <div className="insight-title">{insight.title}</div>
                            <div className="insight-desc">{insight.description}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
