import { NextResponse } from "next/server";

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY || "";
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";

// ============================================
// Azure OpenAI - SOAP Note Generation
// ============================================
async function generateSOAPNoteAzure(dictation, patientContext) {
    const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;

    const systemPrompt = `You are a medical documentation AI assistant. Given a doctor's dictation from a patient visit, restructure it into a SOAP note format.

Return ONLY a valid JSON object with exactly these four keys:
- "subjective": Patient's reported symptoms, history, and complaints
- "objective": Measurable/observable findings (vitals, exam findings)
- "assessment": Clinical assessment, diagnoses with ICD-10 codes where appropriate
- "plan": Treatment plan, prescriptions, follow-up instructions

${patientContext?.patient ? `Patient context: ${patientContext.patient.name}, Age ${patientContext.patient.age}, Condition: ${patientContext.patient.condition}` : ""}

Make the output clinically detailed and professional. Respond with ONLY the JSON object, no markdown, no explanation.`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "api-key": AZURE_OPENAI_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: dictation },
            ],
            temperature: 0.3,
            max_tokens: 1500,
        }),
    });

    if (!response.ok) {
        console.error("OpenAI SOAP error:", response.status, await response.text());
        return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    try {
        // Try to parse, handling potential markdown code blocks
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("Failed to parse SOAP note JSON:", content);
        return null;
    }
}

// ============================================
// Demo fallback
// ============================================
function generateSOAPNoteDemo(dictation) {
    const sentences = dictation.split(/[.!]+/).map((s) => s.trim()).filter(Boolean);

    const subjectiveKeys = ["presents with", "reports", "complains", "history of", "has been", "patient states"];
    const objectiveKeys = ["vitals", "blood pressure", "heart rate", "temperature", "examination", "bp "];
    const assessmentKeys = ["assessment", "diagnosis", "impression", "consistent with", "likely"];
    const planKeys = ["plan", "prescribe", "recommend", "follow up", "refer", "increase", "decrease", "start"];

    const extract = (keys) => {
        const r = sentences.filter((s) => keys.some((k) => s.toLowerCase().includes(k)));
        return r.length > 0 ? r.join(". ") + "." : "";
    };

    return {
        subjective: extract(subjectiveKeys) || `Patient ${sentences.slice(0, 2).join(". ")}.`,
        objective: extract(objectiveKeys) || "Vitals within normal limits. Physical examination unremarkable.",
        assessment: extract(assessmentKeys) || "Clinical findings as noted. Further evaluation may be needed.",
        plan: extract(planKeys) || "Continue current management. Follow up as needed.",
    };
}

// ============================================
// Main POST handler
// ============================================
export async function POST(request) {
    try {
        const { dictation, patientContext } = await request.json();
        if (!dictation || typeof dictation !== "string") {
            return NextResponse.json({ error: "Dictation text is required" }, { status: 400 });
        }

        let soapNote = null;
        let mode = "demo";

        if (AZURE_OPENAI_KEY) {
            console.log("[generate-soap] Using Azure OpenAI...");
            soapNote = await generateSOAPNoteAzure(dictation, patientContext);
            if (soapNote) mode = "azure";
        }

        if (!soapNote) {
            console.log("[generate-soap] Using demo fallback...");
            soapNote = generateSOAPNoteDemo(dictation);
        }

        return NextResponse.json({ success: true, soapNote, mode });
    } catch (error) {
        console.error("SOAP generation error:", error);
        return NextResponse.json({ error: "Failed to generate SOAP note" }, { status: 500 });
    }
}
