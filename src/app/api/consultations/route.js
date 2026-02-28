import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import crypto from "crypto";

// GET - Fetch consultations (doctor inbox or patient history)
export async function GET(request) {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const doctorId = searchParams.get("doctor_id");
    const patientId = searchParams.get("patient_id");
    const consultId = searchParams.get("id");
    const status = searchParams.get("status");

    try {
        let query = supabase
            .from("consultations")
            .select(`
                *,
                patient:profiles!consultations_patient_id_fkey (full_name, email),
                doctor:profiles!consultations_doctor_id_fkey (full_name, email)
            `)
            .order("created_at", { ascending: false });

        if (consultId) query = query.eq("id", consultId);
        if (doctorId) query = query.eq("doctor_id", doctorId);
        if (patientId) query = query.eq("patient_id", patientId);
        if (status) query = query.eq("status", status);

        const { data, error } = await query.limit(50);
        if (error) throw error;

        return NextResponse.json({ success: true, consultations: data || [] });
    } catch (error) {
        console.error("Consultations fetch error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST - Create a new consultation (patient sends voice note)
export async function POST(request) {
    const supabase = createServerClient();

    try {
        const { patientId, doctorId, transcript, language, entities, sentiment, sentimentLabel, voiceNoteUrl } = await request.json();

        if (!transcript) {
            return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
        }

        // Translate to English if not English
        let englishTranscript = transcript;
        const isNonEnglish = language && !language.startsWith("en");
        if (isNonEnglish) {
            try {
                englishTranscript = await translateToEnglish(transcript, language);
            } catch (err) {
                console.warn("Translation failed, using original:", err.message);
                englishTranscript = transcript;
            }
        }

        // Classify severity using English transcript
        const severity = classifySeverity(englishTranscript, sentiment);

        // Generate AI recommendation via Azure OpenAI
        let aiRecommendation = generateDemoRecommendation(englishTranscript, entities);
        try {
            const aiRec = await generateAIRecommendation(englishTranscript, entities, severity);
            if (aiRec) aiRecommendation = aiRec;
        } catch (err) {
            console.warn("AI recommendation failed, using demo:", err.message);
        }

        // Insert consultation
        const { data, error } = await supabase
            .from("consultations")
            .insert({
                patient_id: patientId || null,
                doctor_id: doctorId || null,
                voice_note_url: voiceNoteUrl || null,
                transcript: englishTranscript,
                language: language || "en-US",
                entities: entities || [],
                sentiment: sentiment || 0,
                sentiment_label: sentimentLabel || "Neutral",
                severity,
                ai_recommendation: aiRecommendation,
                status: "pending",
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            consultation: data,
        });
    } catch (error) {
        console.error("Consultation create error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PATCH - Doctor approves/reviews consultation
export async function PATCH(request) {
    const supabase = createServerClient();

    try {
        const { consultationId, doctorResponse, approved, prescription, isRejected, manualData } = await request.json();

        if (!consultationId) {
            return NextResponse.json({ error: "Consultation ID required" }, { status: 400 });
        }

        // Get the existing consultation + patient + doctor info
        const { data: existingConsult } = await supabase
            .from("consultations")
            .select(`
                *,
                patient:profiles!consultations_patient_id_fkey (full_name, email),
                doctor:profiles!consultations_doctor_id_fkey (full_name, email)
            `)
            .eq("id", consultationId)
            .single();

        // Parse AI recommendation for medications (only if not rejected)
        let aiRec = {};
        if (!isRejected) {
            try {
                const raw = existingConsult?.ai_recommendation;
                if (typeof raw === "string") {
                    aiRec = JSON.parse(raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
                } else if (raw && typeof raw === "object") {
                    aiRec = raw;
                }
            } catch { aiRec = {}; }
        }

        const now = new Date();
        const expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

        // Build prescription from AI recommendation + doctor input
        let prescriptionItems = [];
        if (isRejected && manualData?.medications) {
            prescriptionItems = manualData.medications.split('\n').filter(m => m.trim()).map(med => ({
                name: med.trim(),
                quantity: "As directed",
                timing: "As directed",
                duration: "As prescribed",
                expiry: expiryDate.toISOString().split("T")[0],
            }));
        } else {
            prescriptionItems = prescription || (aiRec.medications || []).map((med) => ({
                name: med.name || "As prescribed",
                quantity: med.dosage || "As directed",
                timing: med.timing || "As directed",
                duration: med.duration || "As prescribed",
                expiry: expiryDate.toISOString().split("T")[0],
            }));
        }

        // Build receipt data with prescription details
        const receiptData = {
            receipt_id: `RX-${Date.now().toString(36).toUpperCase()}`,
            consultation_id: consultationId,
            patient_name: existingConsult?.patient?.full_name || "Patient",
            patient_email: existingConsult?.patient?.email || "",
            doctor_name: existingConsult?.doctor?.full_name || "Doctor",
            doctor_email: existingConsult?.doctor?.email || "",
            diagnosis: isRejected && manualData ? manualData.assessment : (aiRec.diagnosis || ""),
            prescription: prescriptionItems,
            doctor_response: doctorResponse || "",
            doctor_advice: isRejected && manualData ? manualData.advice : (aiRec.advice || ""),
            follow_up: isRejected ? "" : (aiRec.followUp || ""),
            severity: existingConsult?.severity || "mild",
            issued_at: now.toISOString(),
            expires_at: expiryDate.toISOString(),
            approved,
            ai_rejected: isRejected || false,
        };

        // Generate SHA-256 hash of the receipt
        const receiptHash = crypto
            .createHash("sha256")
            .update(JSON.stringify(receiptData))
            .digest("hex");

        // Update consultation
        const { data, error } = await supabase
            .from("consultations")
            .update({
                doctor_response: doctorResponse,
                doctor_approved: approved,
                approved_at: approved ? now.toISOString() : null,
                status: approved ? "approved" : "reviewed",
                receipt_hash: receiptHash,
                receipt_data: receiptData,
                updated_at: now.toISOString(),
            })
            .eq("id", consultationId)
            .select(`
                *,
                patient:profiles!consultations_patient_id_fkey (full_name, email),
                doctor:profiles!consultations_doctor_id_fkey (full_name, email)
            `)
            .single();

        if (error) throw error;

        return NextResponse.json({
            success: true,
            consultation: data,
            receiptHash,
            receiptData,
        });
    } catch (error) {
        console.error("Consultation update error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// Translate text to English using Azure OpenAI
async function translateToEnglish(text, sourceLanguage) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

    if (!endpoint || !key || !deployment) return text;

    const response = await fetch(
        `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json", "api-key": key },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: "You are a medical translator. Translate the following patient health note to English. Maintain medical accuracy. Return ONLY the translation, no explanations.",
                    },
                    {
                        role: "user",
                        content: `Translate from ${sourceLanguage} to English:\n\n"${text}"`,
                    },
                ],
                temperature: 0.1,
                max_tokens: 500,
            }),
        }
    );

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || text;
}

// Severity classification
function classifySeverity(text, sentiment) {
    const seriousKeywords = ["severe", "emergency", "hospital", "unbearable", "chest pain", "breathing", "blood", "seizure", "fainting"];
    const moderateKeywords = ["migraine", "fever", "infection", "persistent", "worsening", "dizziness", "nausea", "vomiting"];
    const lower = text.toLowerCase();

    if (seriousKeywords.some((k) => lower.includes(k)) || (sentiment && sentiment < -0.7)) return "serious";
    if (moderateKeywords.some((k) => lower.includes(k)) || (sentiment && sentiment < -0.3)) return "moderate";
    return "mild";
}

// Demo recommendation
function generateDemoRecommendation(transcript, entities) {
    const symptoms = (entities || []).filter((e) => e.type === "symptom").map((e) => e.text);
    const medications = (entities || []).filter((e) => e.type === "medication").map((e) => e.text);

    return {
        diagnosis: symptoms.length > 0
            ? `Patient presents with ${symptoms.join(", ")}. Further evaluation recommended.`
            : "General health consultation. No critical symptoms identified.",
        medications: medications.length > 0
            ? medications.map((m) => ({
                name: m,
                quantity: "As prescribed",
                timing: "As directed by physician",
                duration: "Consult physician",
            }))
            : [{ name: "General wellness supplements", quantity: "1 tablet", timing: "Once daily, after breakfast", duration: "30 days" }],
        advice: "Rest, stay hydrated, and monitor symptoms. Follow up if condition worsens.",
        followUp: "Schedule a follow-up visit in 1 week if symptoms persist.",
    };
}

// Azure OpenAI AI recommendation
async function generateAIRecommendation(transcript, entities, severity) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

    if (!endpoint || !key || !deployment) return null;

    const symptoms = (entities || []).filter((e) => e.type === "symptom").map((e) => e.text);
    const medications = (entities || []).filter((e) => e.type === "medication").map((e) => e.text);

    const response = await fetch(
        `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json", "api-key": key },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: `You are a medical AI assistant. Based on a patient's voice note transcript, provide structured recommendations.
Return ONLY valid JSON with this structure:
{
  "diagnosis": "Brief clinical assessment",
  "medications": [{"name": "Drug name", "quantity": "Amount/count (e.g. 1 tablet, 5ml)", "timing": "When to take (e.g. Morning and evening after meals)", "duration": "How long (e.g. 7 days)"}],
  "advice": "Patient care advice",
  "followUp": "Follow-up recommendation"
}
This is for physician review only - not direct patient advice. Be medically accurate and professional.`,
                    },
                    {
                        role: "user",
                        content: `Patient transcript: "${transcript}"
Extracted symptoms: ${symptoms.join(", ") || "None"}
Extracted medications: ${medications.join(", ") || "None"}
Severity: ${severity}

Generate a medical recommendation.`,
                    },
                ],
                temperature: 0.3,
                max_tokens: 500,
            }),
        }
    );

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    } catch {
        return { diagnosis: content, medications: [], advice: "", followUp: "" };
    }
}
