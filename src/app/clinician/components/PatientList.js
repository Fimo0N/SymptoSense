"use client";

export default function PatientList({ patients, selectedId, onSelect }) {
    const getStatusDot = (status) => {
        switch (status) {
            case "active": return "online";
            case "needs-review": return "warning";
            default: return "offline";
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case "active": return "Active";
            case "needs-review": return "Needs Review";
            default: return "Inactive";
        }
    };

    return (
        <div className="card clinician-sidebar">
            <div className="card-header">
                <h2 className="card-title">
                    <span className="card-title-icon">👥</span>
                    Patients
                </h2>
                <span className="badge badge-info">{patients.length}</span>
            </div>
            <div>
                {patients.map((patient) => (
                    <div
                        key={patient.id}
                        className={`patient-item ${selectedId === patient.id ? "active" : ""}`}
                        onClick={() => onSelect(patient.id)}
                        id={`patient-item-${patient.id}`}
                    >
                        <div
                            className="patient-avatar"
                            style={{ background: `${patient.color}20`, color: patient.color }}
                        >
                            {patient.initials}
                        </div>
                        <div className="patient-info">
                            <div className="patient-name">{patient.name}</div>
                            <div className="patient-meta">
                                <span className={`status-dot ${getStatusDot(patient.status)}`} />{" "}
                                {getStatusLabel(patient.status)} · {patient.condition}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
