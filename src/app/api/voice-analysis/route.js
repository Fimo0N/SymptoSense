import { NextResponse } from "next/server";

// Analyzes voice transcript for stress, emotion, and fatigue markers using Azure OpenAI
export async function POST(request) {
    try {
        const { transcript, sentiment, sentimentLabel } = await request.json();

        if (!transcript) {
            return NextResponse.json({ error: "Transcript required" }, { status: 400 });
        }

        // Try Azure OpenAI analysis
        let analysis = generateDemoAnalysis(transcript, sentiment, sentimentLabel);

        try {
            const aiAnalysis = await analyzeWithAI(transcript, sentiment, sentimentLabel);
            if (aiAnalysis) analysis = aiAnalysis;
        } catch (err) {
            console.warn("AI voice analysis fallback to demo:", err.message);
        }

        return NextResponse.json({ success: true, analysis });
    } catch (error) {
        console.error("Voice analysis error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

async function analyzeWithAI(transcript, sentiment, sentimentLabel) {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;

    if (!endpoint || !key || !deployment) return null;

    const response = await fetch(
        `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json", "api-key": key },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content: `You are a clinical voice analysis AI. Analyze the patient's spoken text for vocal and linguistic biomarkers.
Return ONLY valid JSON:
{
  "stress": { "level": "low|moderate|high|critical", "score": 0-100, "indicators": ["list of specific stress indicators found"] },
  "emotion": { "primary": "main emotion", "secondary": "secondary emotion", "valence": -1 to 1, "arousal": 0-1, "variance": "stable|fluctuating|erratic" },
  "fatigue": { "level": "none|mild|moderate|severe", "score": 0-100, "markers": ["specific fatigue markers"] },
  "urgency": "routine|monitor|urgent|emergency",
  "riskFactors": ["list of concerning patterns"],
  "overallWellness": 0-100
}
Base analysis on: word choice, sentence complexity, emotional language, pain/distress indicators, speech patterns (repetition, fragmentation), and medical urgency.`
                    },
                    {
                        role: "user",
                        content: `Patient transcript: "${transcript}"
Sentiment score: ${sentiment || 0} (${sentimentLabel || "Neutral"})
Analyze for stress, emotional state, and fatigue biomarkers.`
                    }
                ],
                temperature: 0.2,
                max_tokens: 400,
            }),
        }
    );

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    } catch {
        return null;
    }
}

function generateDemoAnalysis(transcript, sentiment, sentimentLabel) {
    const lower = transcript.toLowerCase();

    // Stress detection
    const stressWords = ["pain", "hurts", "can't", "emergency", "help", "severe", "terrible", "awful", "worried", "anxious", "scared", "unbearable", "دردد", "تکلیف"];
    const stressMatches = stressWords.filter(w => lower.includes(w));
    const stressScore = Math.min(100, Math.max(10, stressMatches.length * 25 + (sentiment < -0.5 ? 30 : sentiment < 0 ? 15 : 0)));

    // Emotion detection
    const negativeWords = ["sad", "depressed", "crying", "hopeless", "frustrated", "angry", "upset"];
    const anxiousWords = ["worried", "nervous", "anxious", "panic", "restless"];
    const negMatches = negativeWords.filter(w => lower.includes(w));
    const anxMatches = anxiousWords.filter(w => lower.includes(w));

    let primaryEmotion = "Neutral";
    let secondaryEmotion = "Calm";
    if (stressMatches.length > 2) { primaryEmotion = "Distressed"; secondaryEmotion = "Anxious"; }
    else if (negMatches.length > 0) { primaryEmotion = "Sad"; secondaryEmotion = "Concerned"; }
    else if (anxMatches.length > 0) { primaryEmotion = "Anxious"; secondaryEmotion = "Worried"; }
    else if (sentiment > 0.3) { primaryEmotion = "Hopeful"; secondaryEmotion = "Calm"; }

    // Fatigue markers
    const fatigueWords = ["tired", "exhausted", "sleep", "can't sleep", "insomnia", "fatigue", "weak", "drowsy", "lethargic"];
    const fatigueMatches = fatigueWords.filter(w => lower.includes(w));
    const fatigueScore = Math.min(100, fatigueMatches.length * 30 + (lower.length < 30 ? 20 : 0));

    // Repetition check (speech fragmentation)
    const words = lower.split(/\s+/);
    const wordFreq = {};
    words.forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; });
    const repetitions = Object.values(wordFreq).filter(v => v > 2).length;

    const stressLevel = stressScore > 70 ? "high" : stressScore > 40 ? "moderate" : "low";
    const fatigueLevel = fatigueScore > 60 ? "severe" : fatigueScore > 30 ? "moderate" : fatigueScore > 10 ? "mild" : "none";

    return {
        stress: {
            level: stressLevel,
            score: stressScore,
            indicators: stressMatches.length > 0 ? stressMatches.map(w => `Stress keyword: "${w}"`) : ["No significant stress markers"],
        },
        emotion: {
            primary: primaryEmotion,
            secondary: secondaryEmotion,
            valence: sentiment || 0,
            arousal: stressScore / 100,
            variance: repetitions > 2 ? "erratic" : stressScore > 50 ? "fluctuating" : "stable",
        },
        fatigue: {
            level: fatigueLevel,
            score: fatigueScore,
            markers: fatigueMatches.length > 0 ? fatigueMatches.map(m => `"${m}"`) : ["No fatigue markers detected"],
        },
        urgency: stressScore > 70 ? "urgent" : stressScore > 40 ? "monitor" : "routine",
        riskFactors: [
            ...(stressScore > 60 ? ["Elevated stress levels"] : []),
            ...(fatigueScore > 50 ? ["Significant fatigue indicators"] : []),
            ...(repetitions > 2 ? ["Speech repetition / fragmentation"] : []),
            ...(sentiment < -0.6 ? ["Strongly negative sentiment"] : []),
        ],
        overallWellness: Math.max(0, Math.min(100, 100 - (stressScore * 0.4) - (fatigueScore * 0.3) - (Math.abs(Math.min(0, sentiment || 0)) * 30))),
    };
}
