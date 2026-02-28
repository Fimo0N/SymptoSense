import { NextResponse } from "next/server";

const AZURE_TEXT_ANALYTICS_ENDPOINT = process.env.AZURE_TEXT_ANALYTICS_ENDPOINT || "";
const AZURE_TEXT_ANALYTICS_KEY = process.env.AZURE_TEXT_ANALYTICS_KEY || "";
const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT || "";
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY || "";
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";

// ============================================
// Text Analytics for Health - Entity Extraction
// ============================================
async function extractEntitiesAzure(text) {
    const url = `${AZURE_TEXT_ANALYTICS_ENDPOINT}language/analyze-text/jobs?api-version=2023-04-01`;

    // Start analysis job
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Ocp-Apim-Subscription-Key": AZURE_TEXT_ANALYTICS_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            displayName: "HealthAnalysis",
            analysisInput: {
                documents: [{ id: "1", language: "en", text }],
            },
            tasks: [
                {
                    kind: "Healthcare",
                    parameters: { modelVersion: "latest" },
                },
            ],
        }),
    });

    if (!response.ok) {
        console.error("Text Analytics error:", response.status, await response.text());
        return null;
    }

    // Get the operation location to poll for results
    const operationLocation = response.headers.get("operation-location");
    if (!operationLocation) return null;

    // Poll for results (max 15 seconds)
    for (let i = 0; i < 15; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const pollResponse = await fetch(operationLocation, {
            headers: { "Ocp-Apim-Subscription-Key": AZURE_TEXT_ANALYTICS_KEY },
        });

        const result = await pollResponse.json();

        if (result.status === "succeeded") {
            const healthResult = result.tasks?.items?.[0]?.results?.documents?.[0];
            if (!healthResult) return null;

            return healthResult.entities.map((entity) => ({
                text: entity.text,
                type: mapHealthCategory(entity.category),
                category: entity.category,
                confidence: entity.confidenceScore,
            }));
        }

        if (result.status === "failed") {
            console.error("Health analysis failed:", result);
            return null;
        }
    }

    return null; // Timeout
}

function mapHealthCategory(category) {
    const mapping = {
        SymptomOrSign: "symptom",
        MedicationName: "medication",
        Dosage: "dosage",
        Diagnosis: "condition",
        Direction: "dosage",
        Frequency: "dosage",
        BodyStructure: "symptom",
        ConditionQualifier: "condition",
        ExaminationName: "symptom",
        MedicationClass: "medication",
        TreatmentName: "medication",
    };
    return mapping[category] || "symptom";
}

// ============================================
// Azure OpenAI - Sentiment Analysis
// ============================================
async function analyzeSentimentAzure(text) {
    const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "api-key": AZURE_OPENAI_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messages: [
                {
                    role: "system",
                    content: `You are a health sentiment analyzer. Analyze the patient's diary entry and return ONLY valid JSON with two fields:
- "score": a number from -1 (very negative) to 1 (very positive)
- "label": one of "Very Negative", "Negative", "Slightly Negative", "Neutral", "Slightly Positive", "Positive", "Very Positive"

Respond with ONLY the JSON object, no markdown, no explanation.`,
                },
                { role: "user", content: text },
            ],
            temperature: 0.3,
            max_tokens: 100,
        }),
    });

    if (!response.ok) {
        console.error("OpenAI sentiment error:", response.status, await response.text());
        return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();

    try {
        return JSON.parse(content);
    } catch {
        return null;
    }
}

// ============================================
// Demo fallbacks
// ============================================
function extractEntitiesDemo(text) {
    const entities = [];
    const lowerText = text.toLowerCase();
    const symptoms = ["headache", "migraine", "nausea", "nauseous", "vomiting", "dizziness", "fatigue", "tired", "pain", "blurry vision", "sensitivity to light", "aura", "neck stiffness"];
    const medications = ["ibuprofen", "topiramate", "sumatriptan", "acetaminophen", "metformin", "lisinopril", "amlodipine", "sertraline"];

    symptoms.forEach((k) => { if (lowerText.includes(k)) entities.push({ text: k, type: "symptom" }); });
    medications.forEach((k) => { if (lowerText.includes(k)) entities.push({ text: k.charAt(0).toUpperCase() + k.slice(1), type: "medication" }); });

    const dosages = text.match(/\d+\s*mg/gi);
    if (dosages) dosages.forEach((d) => entities.push({ text: d.trim(), type: "dosage" }));

    return entities;
}

function analyzeSentimentDemo(text) {
    const lower = text.toLowerCase();
    const pos = ["good", "great", "better", "excellent", "happy", "positive", "energetic", "improved", "well"];
    const neg = ["bad", "terrible", "pain", "headache", "worse", "severe", "nauseous", "vomiting", "exhausted", "stressed"];
    let score = 0;
    pos.forEach((w) => { if (lower.includes(w)) score += 0.3; });
    neg.forEach((w) => { if (lower.includes(w)) score -= 0.3; });
    score = Math.max(-1, Math.min(1, score));
    let label = "Neutral";
    if (score > 0.3) label = "Positive";
    else if (score > 0) label = "Slightly Positive";
    else if (score < -0.3) label = "Negative";
    else if (score < 0) label = "Slightly Negative";
    return { score: Math.round(score * 100) / 100, label };
}

// ============================================
// Azure OpenAI - GPT Entity Extraction (for non-English text)
// ============================================
async function extractEntitiesWithGPT(text) {
    try {
        const url = `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`;
        const response = await fetch(url, {
            method: "POST",
            headers: { "api-key": AZURE_OPENAI_KEY, "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: `You are a medical NLP entity extractor. Extract medical entities from the patient's text (in any language) and return them in ENGLISH.
Return ONLY a JSON array of objects with "text" (English term) and "type" (one of: "symptom", "medication", "dosage", "condition").
If no medical entities are found, return an empty array [].
Do NOT include non-medical words. Only extract actual symptoms, medications, dosages, and medical conditions.
Translate all entity text to English regardless of input language.`,
                    },
                    { role: "user", content: text },
                ],
                temperature: 0.1,
                max_tokens: 300,
            }),
        });

        if (!response.ok) return null;

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        const parsed = JSON.parse(content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
        if (Array.isArray(parsed)) return parsed;
        return null;
    } catch (err) {
        console.warn("[process-diary] GPT entity extraction failed:", err.message);
        return null;
    }
}

// ============================================
// Main POST handler
// ============================================
export async function POST(request) {
    try {
        const { text } = await request.json();
        if (!text || typeof text !== "string") {
            return NextResponse.json({ error: "Text is required" }, { status: 400 });
        }

        const useAzure = AZURE_TEXT_ANALYTICS_KEY && AZURE_OPENAI_KEY;
        const hasOpenAI = AZURE_OPENAI_KEY && AZURE_OPENAI_ENDPOINT;
        let entities, sentiment;

        // Check if text contains non-English characters
        const isNonEnglish = /[^\x00-\x7F]/.test(text);

        if (useAzure) {
            console.log("[process-diary] Using Azure AI services...");
            const [azureEntities, azureSentiment] = await Promise.all([
                extractEntitiesAzure(text),
                analyzeSentimentAzure(text),
            ]);
            entities = azureEntities || extractEntitiesDemo(text);
            sentiment = azureSentiment || analyzeSentimentDemo(text);
        } else if (hasOpenAI) {
            console.log("[process-diary] Using Azure OpenAI for analysis...");
            // Use GPT for entity extraction (especially for non-English text)
            const [gptEntities, gptSentiment] = await Promise.all([
                extractEntitiesWithGPT(text),
                analyzeSentimentAzure(text),
            ]);
            entities = gptEntities || extractEntitiesDemo(text);
            sentiment = gptSentiment || analyzeSentimentDemo(text);
        } else {
            console.log("[process-diary] Using demo mode...");
            entities = extractEntitiesDemo(text);
            sentiment = analyzeSentimentDemo(text);
        }

        // Translate entities to English if needed
        if (entities && entities.length > 0) {
            const nonEnglish = entities.filter((e) => /[^\x00-\x7F]/.test(e.text));
            if (nonEnglish.length > 0 && AZURE_OPENAI_KEY) {
                try {
                    const textsToTranslate = nonEnglish.map((e) => e.text);
                    const transRes = await fetch(
                        `${AZURE_OPENAI_ENDPOINT}openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-08-01-preview`,
                        {
                            method: "POST",
                            headers: { "api-key": AZURE_OPENAI_KEY, "Content-Type": "application/json" },
                            body: JSON.stringify({
                                messages: [
                                    { role: "system", content: `Translate each medical/health term to English. Return ONLY a JSON array of translated strings in the same order. No markdown, no explanation.` },
                                    { role: "user", content: JSON.stringify(textsToTranslate) },
                                ],
                                temperature: 0.1,
                                max_tokens: 200,
                            }),
                        }
                    );
                    const transData = await transRes.json();
                    const transContent = transData.choices?.[0]?.message?.content?.trim();
                    const translated = JSON.parse(transContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim());
                    if (Array.isArray(translated)) {
                        let tIdx = 0;
                        entities = entities.map((e) => {
                            if (/[^\x00-\x7F]/.test(e.text) && tIdx < translated.length) {
                                return { ...e, text: translated[tIdx++] };
                            }
                            return e;
                        });
                    }
                } catch (err) {
                    console.warn("[process-diary] Entity translation failed:", err.message);
                }
            }
        }

        const entry = {
            id: `d-${Date.now()}`,
            date: new Date().toISOString().split("T")[0],
            timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            text,
            entities,
            sentiment: sentiment.score,
            sentimentLabel: sentiment.label,
        };

        return NextResponse.json({ success: true, entry, entities, sentiment, mode: useAzure ? "azure" : "demo" });
    } catch (error) {
        console.error("Diary processing error:", error);
        return NextResponse.json({ error: "Failed to process diary entry" }, { status: 500 });
    }
}
