"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DoctorLogin() {
    const router = useRouter();
    const [formData, setFormData] = useState({ email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
            });

            if (authError) throw authError;

            // Verify role is doctor
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", authData.user.id)
                .single();

            if (profileError || !profile) {
                throw new Error("Profile not found. Contact your administrator.");
            }

            if (profile.role === "doctor") {
                router.push("/clinician");
            } else {
                // If it's a patient, redirect them
                await supabase.auth.signOut();
                throw new Error("This portal is for clinicians only. Please use the Patient Login.");
            }
        } catch (err) {
            setError(err.message || "Login failed. Please try again.");
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-hero auth-hero-doctor">
                <div className="auth-hero-content">
                    <div className="auth-hero-icon">⚕️</div>
                    <h1 className="auth-hero-title">Clinician Portal</h1>
                    <p className="auth-hero-subtitle">
                        AI-powered clinical documentation. Review patient voice notes,
                        approve prescriptions, and generate SOAP notes in seconds.
                    </p>
                    <div className="auth-hero-features">
                        <div className="auth-feature">
                            <span>📬</span>
                            <span>Receive patient voice notes & transcriptions</span>
                        </div>
                        <div className="auth-feature">
                            <span>🧠</span>
                            <span>AI-generated treatment recommendations</span>
                        </div>
                        <div className="auth-feature">
                            <span>🔐</span>
                            <span>SHA-256 encrypted digital prescriptions</span>
                        </div>
                        <div className="auth-feature">
                            <span>📊</span>
                            <span>Patient analytics & disease tracking</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auth-form-container">
                <form className="auth-form" onSubmit={handleLogin}>
                    <div className="auth-form-header">
                        <div className="auth-doctor-badge">
                            <span>🏥</span> Authorized Personnel Only
                        </div>
                        <h2>Doctor Login</h2>
                        <p>Access your clinical dashboard</p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <div className="auth-input-group">
                        <label htmlFor="login-email">Email</label>
                        <input
                            id="login-email"
                            type="email"
                            placeholder="doctor@hospital.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="auth-input"
                        />
                    </div>

                    <div className="auth-input-group">
                        <label htmlFor="login-password">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            className="auth-input"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                        {loading ? (
                            <>
                                <div className="loading-dots"><span></span><span></span><span></span></div>
                                Signing in...
                            </>
                        ) : (
                            <>🔐 Sign In as Doctor</>
                        )}
                    </button>

                    <div className="auth-footer">
                        <p>
                            Are you a patient?{" "}
                            <Link href="/signup" className="auth-link">Patient Portal →</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
