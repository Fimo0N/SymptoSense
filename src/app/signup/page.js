"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PatientAuth() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(false);
    const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            if (isLogin) {
                // Login flow
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                });
                if (authError) throw authError;

                const { data: profile } = await supabase
                    .from("profiles")
                    .select("role")
                    .eq("id", authData.user.id)
                    .single();

                if (profile?.role === "doctor") {
                    router.push("/clinician");
                } else {
                    router.push("/patient");
                }
            } else {
                // Signup flow
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email,
                    password: formData.password,
                });
                if (authError) throw authError;

                const { error: profileError } = await supabase
                    .from("profiles")
                    .insert({
                        id: authData.user.id,
                        email: formData.email,
                        full_name: formData.fullName,
                        role: "patient",
                    });
                if (profileError) throw profileError;

                router.push("/patient");
            }
        } catch (err) {
            setError(err.message || "Authentication failed. Please try again.");
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-hero">
                <div className="auth-hero-content">
                    <div className="auth-hero-icon">🩺</div>
                    <h1 className="auth-hero-title">SymptoSense</h1>
                    <p className="auth-hero-subtitle">
                        Track your health journey with AI-powered insights.
                        Log symptoms, medications, and mood — your doctor sees it all.
                    </p>
                    <div className="auth-hero-features">
                        <div className="auth-feature">
                            <span>🎙️</span>
                            <span>Voice-powered diary in 16+ languages</span>
                        </div>
                        <div className="auth-feature">
                            <span>🧠</span>
                            <span>AI extracts symptoms & medications</span>
                        </div>
                        <div className="auth-feature">
                            <span>📤</span>
                            <span>Send voice notes directly to your doctor</span>
                        </div>
                        <div className="auth-feature">
                            <span>📊</span>
                            <span>Real-time health trends & insights</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="auth-form-container">
                <form className="auth-form" onSubmit={handleSubmit}>
                    {/* Beautiful Toggle Switch */}
                    <div className="auth-toggle-wrapper">
                        <div className={`auth-toggle ${isLogin ? "login-active" : ""}`}>
                            <button
                                type="button"
                                className={`auth-toggle-btn ${!isLogin ? "active" : ""}`}
                                onClick={() => { setIsLogin(false); setError(""); }}
                            >
                                ✨ Sign Up
                            </button>
                            <button
                                type="button"
                                className={`auth-toggle-btn ${isLogin ? "active" : ""}`}
                                onClick={() => { setIsLogin(true); setError(""); }}
                            >
                                🔐 Log In
                            </button>
                            <div className="auth-toggle-slider" />
                        </div>
                    </div>

                    <div className="auth-form-header">
                        <h2 className={`auth-form-title ${isLogin ? "slide-right" : "slide-left"}`} key={isLogin ? "login" : "signup"}>
                            {isLogin ? "Welcome Back" : "Create Patient Account"}
                        </h2>
                        <p className="auth-form-desc">
                            {isLogin ? "Log in to access your health diary" : "Start tracking your health today"}
                        </p>
                    </div>

                    {error && (
                        <div className="auth-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {/* Name field - only in signup mode with smooth animation */}
                    <div className={`auth-input-group auth-name-field ${isLogin ? "collapsed" : "expanded"}`}>
                        <label htmlFor="fullName">Full Name</label>
                        <input
                            id="fullName"
                            type="text"
                            placeholder="Jane Mitchell"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            required={!isLogin}
                            className="auth-input"
                            tabIndex={isLogin ? -1 : 0}
                        />
                    </div>

                    <div className="auth-input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="jane@example.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="auth-input"
                        />
                    </div>

                    <div className="auth-input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            placeholder="Min. 6 characters"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            minLength={6}
                            className="auth-input"
                        />
                    </div>

                    <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                        {loading ? (
                            <>
                                <div className="loading-dots"><span></span><span></span><span></span></div>
                                {isLogin ? "Signing in..." : "Creating account..."}
                            </>
                        ) : isLogin ? (
                            <>🔐 Sign In</>
                        ) : (
                            <>✨ Create Account</>
                        )}
                    </button>

                    <div className="auth-footer">
                        <p>Are you a doctor? <Link href="/login" className="auth-link">Doctor Login →</Link></p>
                    </div>
                </form>
            </div>
        </div>
    );
}
