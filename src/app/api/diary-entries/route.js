import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

// GET - Fetch diary entries (supports filtering)
export async function GET(request) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const patientId = searchParams.get("patient_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const severity = searchParams.get("severity");

    try {
        let query = supabase
            .from("diary_entries")
            .select(`
                *,
                profiles!diary_entries_patient_id_fkey (full_name, email)
            `)
            .order("created_at", { ascending: false });

        if (patientId) {
            query = query.eq("patient_id", patientId);
        }
        if (startDate) {
            query = query.gte("created_at", startDate);
        }
        if (endDate) {
            query = query.lte("created_at", endDate + "T23:59:59");
        }
        if (severity) {
            query = query.eq("severity", severity);
        }

        const { data, error } = await query.limit(100);

        if (error) throw error;

        return NextResponse.json({
            success: true,
            entries: data || [],
        });
    } catch (error) {
        console.error("Diary fetch error:", error);

        // Fallback to in-memory if Supabase fails
        if (!global.diaryEntries) global.diaryEntries = [];
        return NextResponse.json({
            success: true,
            entries: global.diaryEntries,
            mode: "fallback",
        });
    }
}

// POST - Add a new diary entry
export async function POST(request) {
    const supabase = createServerClient();

    try {
        const { entry, patientId } = await request.json();

        if (!entry) {
            return NextResponse.json({ error: "Entry is required" }, { status: 400 });
        }

        // Classify severity based on entities and sentiment
        const severity = classifySeverity(entry);

        // Try Supabase first
        if (patientId) {
            const { data, error } = await supabase
                .from("diary_entries")
                .insert({
                    patient_id: patientId,
                    text: entry.text,
                    entities: entry.entities || [],
                    sentiment: entry.sentiment || 0,
                    sentiment_label: entry.sentimentLabel || "Neutral",
                    severity,
                    language: entry.language || "en-US",
                })
                .select()
                .single();

            if (!error) {
                return NextResponse.json({
                    success: true,
                    entry: { ...entry, id: data.id, severity, created_at: data.created_at },
                    mode: "supabase",
                });
            }
        }

        // Fallback to in-memory
        if (!global.diaryEntries) global.diaryEntries = [];
        const fullEntry = { ...entry, severity, id: entry.id || `d-${Date.now()}` };
        global.diaryEntries.unshift(fullEntry);

        return NextResponse.json({
            success: true,
            entry: fullEntry,
            mode: "memory",
        });
    } catch (error) {
        console.error("Diary store error:", error);
        return NextResponse.json({ error: "Failed to store entry" }, { status: 500 });
    }
}

// DELETE - Clear entries
export async function DELETE() {
    global.diaryEntries = [];
    return NextResponse.json({ success: true });
}

// Classify severity based on symptoms and sentiment
function classifySeverity(entry) {
    const seriousKeywords = [
        "severe", "emergency", "hospital", "unbearable", "chest pain",
        "breathing", "unconscious", "blood", "seizure", "stroke",
        "heart attack", "fainting", "blurry vision", "vomiting",
    ];

    const moderateKeywords = [
        "migraine", "fever", "infection", "swelling", "persistent",
        "worsening", "medication change", "dizziness", "nausea",
    ];

    const text = (entry.text || "").toLowerCase();
    const sentiment = entry.sentiment || 0;

    // Check for serious indicators
    if (seriousKeywords.some((k) => text.includes(k)) || sentiment < -0.7) {
        return "serious";
    }

    // Check for moderate indicators
    if (moderateKeywords.some((k) => text.includes(k)) || sentiment < -0.3) {
        return "moderate";
    }

    return "mild";
}
