"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function Navigation() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) {
                setUser(data.user);
                // Get role from profiles
                supabase
                    .from("profiles")
                    .select("role, full_name")
                    .eq("id", data.user.id)
                    .single()
                    .then(({ data: profile }) => {
                        setUserRole(profile?.role || null);
                    });
            }
        });
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setUserRole(null);
        router.push("/");
    };

    return (
        <nav className="nav">
            <div className="nav-inner">
                <Link href="/" className="nav-brand">
                    <img src="/logo.png" alt="SymptoSense Logo" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'contain', background: 'white' }} />
                    <div className="nav-brand-icon" style={{ display: 'none' }}>🩺</div>
                    SymptoSense
                </Link>

                <div className="nav-links">
                    {user ? (
                        <>
                            {(userRole === "patient" || !userRole) && (
                                <Link
                                    href="/patient"
                                    className={`nav-link ${pathname === "/patient" ? "active" : ""}`}
                                >
                                    <span className="nav-link-icon">👤</span>
                                    Patient Portal
                                </Link>
                            )}
                            {(userRole === "doctor" || !userRole) && (
                                <Link
                                    href="/clinician"
                                    className={`nav-link ${pathname === "/clinician" ? "active" : ""}`}
                                >
                                    <span className="nav-link-icon">⚕️</span>
                                    Clinician Portal
                                </Link>
                            )}
                            <button className="nav-logout" onClick={handleLogout}>
                                Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/signup"
                                className={`nav-link ${pathname === "/signup" ? "active" : ""}`}
                            >
                                <span className="nav-link-icon">👤</span>
                                Patient Signup
                            </Link>
                            <Link
                                href="/login"
                                className={`nav-link ${pathname === "/login" ? "active" : ""}`}
                            >
                                <span className="nav-link-icon">⚕️</span>
                                Doctor Login
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
