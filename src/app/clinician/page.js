"use client";

import { useState, useCallback, useEffect } from "react";
import Navigation from "../components/Navigation";
import DoctorInbox from "./components/DoctorInbox";
import PatientProfile from "./components/PatientProfile";
import { supabase } from "@/lib/supabase";

export default function ClinicianPortal() {
    const [consultations, setConsultations] = useState([]);
    const [doctorUser, setDoctorUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showToast, setShowToast] = useState(false);
    const [toastMsg, setToastMsg] = useState("");
    const [selectedPatientFilter, setSelectedPatientFilter] = useState("all");
    const [viewingProfile, setViewingProfile] = useState(null); // { id, name }
    const [searchQuery, setSearchQuery] = useState("");
    const [severityFilter, setSeverityFilter] = useState("all"); // "all", "serious", "moderate", "mild"
    const [showFilters, setShowFilters] = useState(false);

    // Get current doctor user
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setDoctorUser(data.user);
        });
    }, []);

    // Fetch consultations
    const fetchData = useCallback(async () => {
        if (!doctorUser?.id) return;
        try {
            const res = await fetch(`/api/consultations?doctor_id=${doctorUser.id}`);
            const data = await res.json();
            if (data.success) setConsultations(data.consultations);
        } catch (err) {
            console.error("Fetch error:", err);
        }
        setIsLoading(false);
    }, [doctorUser]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 8000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Approve consultation
    const handleApproveConsultation = useCallback(async (consultId, response, approved, isRejected = false, manualData = null) => {
        try {
            const res = await fetch("/api/consultations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ consultationId: consultId, doctorResponse: response, approved, isRejected, manualData }),
            });
            const data = await res.json();
            if (data.success) {
                toast("✅ Prescription approved & digital receipt generated");
                fetchData();
            }
        } catch (err) {
            console.error("Approval error:", err);
        }
    }, [fetchData]);

    function toast(msg) {
        setToastMsg(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
    }

    // Extract unique patients from consultations and determine sort metrics
    const patientsMap = {};
    const severityWeight = { serious: 3, moderate: 2, mild: 1 };

    consultations.forEach((c) => {
        const pid = c.patient_id;
        if (!pid) return;

        const weight = severityWeight[c.severity] || 0;
        const time = new Date(c.created_at).getTime();

        if (!patientsMap[pid]) {
            patientsMap[pid] = {
                id: pid,
                name: c.patient?.full_name || "Patient",
                email: c.patient?.email || "",
                maxSeverityWeight: weight,
                latestConsultTime: time,
                hasSerious: c.severity === "serious",
                hasModerate: c.severity === "moderate",
                hasMild: c.severity === "mild"
            };
        } else {
            if (weight > patientsMap[pid].maxSeverityWeight) {
                patientsMap[pid].maxSeverityWeight = weight;
            }
            if (time > patientsMap[pid].latestConsultTime) {
                patientsMap[pid].latestConsultTime = time;
            }
            if (c.severity === "serious") patientsMap[pid].hasSerious = true;
            if (c.severity === "moderate") patientsMap[pid].hasModerate = true;
            if (c.severity === "mild") patientsMap[pid].hasMild = true;
        }
    });

    // Filter & Sort:
    let filteredPatients = Object.values(patientsMap);

    // Apply Name/ID Search
    if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        filteredPatients = filteredPatients.filter(p =>
            p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
        );
    }

    // Apply Severity Filter
    if (severityFilter !== "all") {
        filteredPatients = filteredPatients.filter(p => {
            if (severityFilter === "serious") return p.hasSerious;
            if (severityFilter === "moderate") return p.hasModerate;
            if (severityFilter === "mild") return p.hasMild;
            return true;
        });
    }

    filteredPatients.sort((a, b) => {
        if (b.maxSeverityWeight !== a.maxSeverityWeight) {
            return b.maxSeverityWeight - a.maxSeverityWeight;
        }
        return b.latestConsultTime - a.latestConsultTime;
    });

    // Filter consultations
    const filtered = selectedPatientFilter === "all"
        ? consultations
        : consultations.filter((c) => c.patient_id === selectedPatientFilter);

    // Stats
    const pending = consultations.filter((c) => c.status === "pending").length;
    const approved = consultations.filter((c) => c.status === "approved").length;
    const serious = consultations.filter((c) => c.severity === "serious").length;

    return (
        <>
            <Navigation />
            <div className="page-container">
                <div className="page-header">
                    <h1 className="page-title">Clinician Dashboard</h1>
                    <p className="page-subtitle">
                        Review patient voice notes, approve prescriptions, and manage consultations.
                    </p>
                </div>

                {/* Stats Bar */}
                <div className="analytics-grid animate-fade-in">
                    <div className="analytics-card">
                        <div className="analytics-icon">👥</div>
                        <div className="analytics-value" style={{ background: "var(--gradient-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                            {Object.keys(patientsMap).length}
                        </div>
                        <div className="analytics-label">Total Patients</div>
                    </div>
                    <div className="analytics-card">
                        <div className="analytics-icon">⏳</div>
                        <div className="analytics-value" style={{ color: "var(--accent-amber)" }}>
                            {pending}
                        </div>
                        <div className="analytics-label">Pending Review</div>
                    </div>
                    <div className="analytics-card">
                        <div className="analytics-icon">✅</div>
                        <div className="analytics-value" style={{ color: "var(--accent-green)" }}>
                            {approved}
                        </div>
                        <div className="analytics-label">Approved</div>
                    </div>
                    <div className="analytics-card">
                        <div className="analytics-icon">🚨</div>
                        <div className="analytics-value" style={{ color: "var(--accent-rose)" }}>
                            {serious}
                        </div>
                        <div className="analytics-label">Serious Cases</div>
                    </div>
                </div>

                {/* Layout: Patient Sidebar + Inbox */}
                <div className="doctor-layout animate-fade-in">
                    {/* Patient Sidebar */}
                    <div className="doctor-sidebar">
                        <div className="card" style={{ position: "sticky", top: "80px", maxHeight: "calc(100vh - 100px)", display: "flex", flexDirection: "column", overflow: "visible" }}>
                            <div className="card-header" style={{ flexShrink: 0, paddingBottom: "1rem", position: "relative" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "0.5rem" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                        <h2 className="card-title" style={{ fontSize: "0.95rem", margin: 0 }}>
                                            <span className="card-title-icon">👥</span> Patients
                                        </h2>
                                        <span className="badge badge-info">{filteredPatients.length}</span>
                                    </div>
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        style={{
                                            background: showFilters || searchQuery || severityFilter !== "all" ? "var(--accent-blue-light)" : "rgba(255,255,255,0.05)",
                                            color: showFilters || searchQuery || severityFilter !== "all" ? "#fff" : "var(--text-secondary)",
                                            border: "none", borderRadius: "var(--radius-sm)", width: "32px", height: "32px",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            cursor: "pointer", transition: "all 0.2s"
                                        }}
                                        title="Filter patients"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                                        </svg>
                                    </button>
                                </div>

                                {/* Filters Popup */}
                                {showFilters && (
                                    <div className="animate-fade-in" style={{
                                        position: "absolute", top: "calc(100% + 4px)", left: "0", right: "0",
                                        background: "var(--bg-card-hover)", border: "1px solid var(--border-medium)",
                                        borderRadius: "var(--radius-md)", padding: "12px", zIndex: 10,
                                        boxShadow: "var(--shadow-lg)", display: "flex", flexDirection: "column", gap: "10px",
                                    }}>
                                        <div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: "600" }}>SEARCH</div>
                                            <input
                                                type="text"
                                                placeholder="Name or ID..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                style={{
                                                    width: "100%", padding: "8px 12px", borderRadius: "var(--radius-sm)",
                                                    border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)",
                                                    color: "var(--text-primary)", fontSize: "0.85rem", outline: "none"
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: "600" }}>SEVERITY FILTER</div>
                                            <div style={{ display: "flex", gap: "4px" }}>
                                                {["all", "serious", "moderate", "mild"].map(level => (
                                                    <button
                                                        key={level}
                                                        onClick={() => setSeverityFilter(level)}
                                                        style={{
                                                            flex: 1, padding: "6px 0", fontSize: "0.75rem", fontWeight: "600",
                                                            borderRadius: "var(--radius-sm)", textTransform: "capitalize",
                                                            border: severityFilter === level ? "none" : "1px solid rgba(255,255,255,0.1)",
                                                            background: severityFilter === level
                                                                ? (level === "serious" ? "var(--accent-red)" : level === "moderate" ? "var(--accent-amber)" : level === "mild" ? "var(--accent-green)" : "var(--accent-blue)")
                                                                : "rgba(0,0,0,0.2)",
                                                            color: severityFilter === level ? "white" : "var(--text-muted)",
                                                            cursor: "pointer", transition: "all 0.2s"
                                                        }}
                                                    >
                                                        {level}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", paddingRight: "4px", marginTop: "0.5rem" }}>
                                {/* All patients button */}
                                <button
                                    onClick={() => { setSelectedPatientFilter("all"); setViewingProfile(null); }}
                                    className={`patient-nav-item ${!viewingProfile && selectedPatientFilter === "all" ? "active" : ""}`}
                                >
                                    <div className="patient-nav-avatar" style={{ background: "var(--gradient-primary)" }}>📋</div>
                                    <div className="patient-nav-info">
                                        <div className="patient-nav-name">All Patients</div>
                                        <div className="patient-nav-meta">{consultations.length} consultations</div>
                                    </div>
                                    {pending > 0 && <span className="patient-nav-badge">{pending}</span>}
                                </button>

                                {filteredPatients.map((p) => {
                                    const pConsults = consultations.filter((c) => c.patient_id === p.id);
                                    const pPending = pConsults.filter((c) => c.status === "pending").length;
                                    const hasSerous = pConsults.some((c) => c.severity === "serious");

                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => setViewingProfile({ id: p.id, name: p.name })}
                                            className={`patient-nav-item ${viewingProfile?.id === p.id ? "active" : ""}`}
                                        >
                                            <div className="patient-nav-avatar" style={{
                                                background: hasSerous ? "linear-gradient(135deg, #f43f5e, #e11d48)" : "var(--gradient-primary)"
                                            }}>
                                                {p.name?.charAt(0)?.toUpperCase() || "P"}
                                            </div>
                                            <div className="patient-nav-info">
                                                <div className="patient-nav-name">{p.name}</div>
                                                <div className="patient-nav-meta">{pConsults.length} note{pConsults.length !== 1 ? "s" : ""}</div>
                                            </div>
                                            {pPending > 0 && <span className="patient-nav-badge">{pPending}</span>}
                                        </button>
                                    );
                                })}

                                {filteredPatients.length === 0 && !isLoading && (
                                    <div style={{ padding: "16px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.82rem" }}>
                                        {searchQuery || severityFilter !== "all"
                                            ? "No patients match your search filters."
                                            : "No patients yet. Consultations will appear when patients send voice notes."}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="doctor-main">
                        {viewingProfile ? (
                            <PatientProfile
                                patientId={viewingProfile.id}
                                patientName={viewingProfile.name}
                                onBack={() => setViewingProfile(null)}
                            />
                        ) : (
                            <DoctorInbox
                                consultations={filtered}
                                onApprove={handleApproveConsultation}
                                onRefresh={fetchData}
                            />
                        )}
                    </div>
                </div>
            </div>

            {showToast && (
                <div className="toast">{toastMsg}</div>
            )}
        </>
    );
}
