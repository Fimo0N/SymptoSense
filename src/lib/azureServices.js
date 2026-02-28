// Azure AI Services wrapper with graceful fallbacks
// When API keys are not configured, uses synthetic/demo processing

const AZURE_SPEECH_KEY = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY || "";
const AZURE_SPEECH_REGION = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION || "";

// ============================================
// Supported Languages for Speech-to-Text
// ============================================
export const SUPPORTED_LANGUAGES = [
    { code: "en-US", label: "English", flag: "🇺🇸" },
    { code: "ur-PK", label: "Urdu", flag: "🇵🇰" },
    { code: "ar-SA", label: "Arabic", flag: "🇸🇦" },
    { code: "hi-IN", label: "Hindi", flag: "🇮🇳" },
    { code: "es-ES", label: "Spanish", flag: "🇪🇸" },
    { code: "fr-FR", label: "French", flag: "🇫🇷" },
    { code: "de-DE", label: "German", flag: "🇩🇪" },
    { code: "tr-TR", label: "Turkish", flag: "🇹🇷" },
    { code: "zh-CN", label: "Chinese", flag: "🇨🇳" },
    { code: "pt-BR", label: "Portuguese", flag: "🇧🇷" },
    { code: "ja-JP", label: "Japanese", flag: "🇯🇵" },
    { code: "ko-KR", label: "Korean", flag: "🇰🇷" },
    { code: "it-IT", label: "Italian", flag: "🇮🇹" },
    { code: "hu-HU", label: "Hungarian", flag: "🇭🇺" },
    { code: "ru-RU", label: "Russian", flag: "🇷🇺" },
    { code: "bn-IN", label: "Bengali", flag: "🇧🇩" },
];

// ============================================
// Speech-to-Text (Azure SDK with Web Speech API fallback)
// ============================================
export function createSpeechRecognizer(onResult, onError, onEnd, language = "en-US") {
    // Try Azure Speech SDK first
    if (AZURE_SPEECH_KEY && AZURE_SPEECH_REGION) {
        return createAzureSpeechRecognizer(onResult, onError, onEnd, language);
    }

    // Fallback to browser Web Speech API
    return createBrowserSpeechRecognizer(onResult, onError, onEnd, language);
}

// Azure Speech SDK recognizer with auto-fallback
function createAzureSpeechRecognizer(onResult, onError, onEnd, language) {
    try {
        const sdk = require("microsoft-cognitiveservices-speech-sdk");

        const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
        speechConfig.speechRecognitionLanguage = language;

        const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

        let finalTranscript = "";
        let isActive = false;
        let hasFallenBack = false;
        let fallbackRecognizer = null;

        recognizer.recognizing = (_, e) => {
            if (e.result.reason === sdk.ResultReason.RecognizingSpeech) {
                onResult?.(finalTranscript, e.result.text);
            }
        };

        recognizer.recognized = (_, e) => {
            if (e.result.reason === sdk.ResultReason.RecognizedSpeech && e.result.text) {
                finalTranscript += e.result.text + " ";
                onResult?.(finalTranscript.trim(), "");
            }
        };

        recognizer.canceled = (_, e) => {
            if (e.reason === sdk.CancellationReason.Error) {
                console.warn("[Speech] Azure failed, falling back to browser:", e.errorDetails);

                // Auto-fallback to browser Web Speech API
                if (isActive && !hasFallenBack) {
                    hasFallenBack = true;
                    fallbackRecognizer = createBrowserSpeechRecognizer(onResult, onError, onEnd, language);
                    if (fallbackRecognizer) {
                        console.log("[Speech] Switched to browser Web Speech API");
                        fallbackRecognizer.start();
                    } else {
                        onError?.("Speech recognition not available for this language.");
                        isActive = false;
                        onEnd?.("");
                    }
                }
                return;
            }
            if (isActive && !hasFallenBack) {
                isActive = false;
                onEnd?.(finalTranscript.trim());
            }
        };

        recognizer.sessionStopped = () => {
            if (isActive && !hasFallenBack) {
                isActive = false;
                onEnd?.(finalTranscript.trim());
            }
        };

        console.log(`[Speech] Using Azure Speech SDK (${language})`);

        return {
            start: () => {
                finalTranscript = "";
                isActive = true;
                hasFallenBack = false;
                recognizer.startContinuousRecognitionAsync(
                    () => console.log("[Speech] Azure recognition started"),
                    (err) => {
                        console.warn("[Speech] Azure start error, falling back:", err);
                        // Fallback on start error too
                        fallbackRecognizer = createBrowserSpeechRecognizer(onResult, onError, onEnd, language);
                        if (fallbackRecognizer) {
                            hasFallenBack = true;
                            fallbackRecognizer.start();
                        } else {
                            onError?.("Speech recognition not available.");
                        }
                    }
                );
            },
            stop: () => {
                isActive = false;
                if (hasFallenBack && fallbackRecognizer) {
                    fallbackRecognizer.stop();
                } else {
                    recognizer.stopContinuousRecognitionAsync(
                        () => onEnd?.(finalTranscript.trim()),
                        (err) => console.error("[Speech] Stop error:", err)
                    );
                }
            },
        };
    } catch (err) {
        console.warn("[Speech] Azure SDK failed, falling back to browser:", err);
        return createBrowserSpeechRecognizer(onResult, onError, onEnd, language);
    }
}

// Browser Web Speech API fallback
function createBrowserSpeechRecognizer(onResult, onError, onEnd, language) {
    const SpeechRecognition = typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
        onError?.("Speech recognition is not supported in this browser.");
        return null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    let finalTranscript = "";

    recognition.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript + " ";
            } else {
                interim += event.results[i][0].transcript;
            }
        }
        onResult?.(finalTranscript.trim(), interim);
    };

    recognition.onerror = (event) => {
        onError?.(event.error);
    };

    recognition.onend = () => {
        onEnd?.(finalTranscript.trim());
    };

    console.log(`[Speech] Using browser Web Speech API (${language})`);

    return {
        start: () => {
            finalTranscript = "";
            recognition.start();
        },
        stop: () => {
            recognition.stop();
        },
    };
}

// ============================================
// Entity Extraction (Demo mode)
// ============================================
const SYMPTOM_KEYWORDS = [
    "headache", "migraine", "nausea", "nauseous", "vomiting", "dizziness",
    "fatigue", "tired", "pain", "insomnia", "anxiety", "blurry vision",
    "sensitivity to light", "aura", "neck stiffness", "chest pain",
    "shortness of breath", "fever", "cough", "sore throat", "stomach ach",
];

const MEDICATION_KEYWORDS = [
    "ibuprofen", "topiramate", "sumatriptan", "acetaminophen", "aspirin",
    "metformin", "lisinopril", "amlodipine", "sertraline", "omeprazole",
    "amoxicillin", "prednisone", "profine", "panadol", "brufen",
];

const DOSAGE_PATTERN = /\d+\s*mg/gi;

export function extractEntitiesDemo(text) {
    const entities = [];
    const lowerText = text.toLowerCase();

    SYMPTOM_KEYWORDS.forEach((keyword) => {
        if (lowerText.includes(keyword)) {
            entities.push({ text: keyword, type: "symptom" });
        }
    });

    MEDICATION_KEYWORDS.forEach((keyword) => {
        if (lowerText.includes(keyword)) {
            entities.push({
                text: keyword.charAt(0).toUpperCase() + keyword.slice(1),
                type: "medication",
            });
        }
    });

    const dosages = text.match(DOSAGE_PATTERN);
    if (dosages) {
        dosages.forEach((d) => {
            entities.push({ text: d.trim(), type: "dosage" });
        });
    }

    return entities;
}

// ============================================
// Sentiment Analysis (Demo mode)
// ============================================
const POSITIVE_WORDS = [
    "good", "great", "better", "excellent", "happy", "positive", "energetic",
    "wonderful", "amazing", "fantastic", "improved", "well", "calm", "relaxed",
];

const NEGATIVE_WORDS = [
    "bad", "terrible", "horrible", "pain", "headache", "worse", "awful",
    "miserable", "severe", "exhausted", "nauseous", "vomiting", "anxiety",
    "stressed", "depressed", "angry", "frustrated",
];

export function analyzeSentimentDemo(text) {
    const lowerText = text.toLowerCase();
    let score = 0;
    let count = 0;

    POSITIVE_WORDS.forEach((word) => {
        if (lowerText.includes(word)) { score += 0.3; count++; }
    });

    NEGATIVE_WORDS.forEach((word) => {
        if (lowerText.includes(word)) { score -= 0.3; count++; }
    });

    const finalScore = count > 0 ? Math.max(-1, Math.min(1, score / Math.max(count * 0.3, 1))) : 0;

    let label = "Neutral";
    if (finalScore > 0.3) label = "Positive";
    else if (finalScore > 0) label = "Slightly Positive";
    else if (finalScore < -0.3) label = "Negative";
    else if (finalScore < 0) label = "Slightly Negative";

    return { score: Math.round(finalScore * 100) / 100, label };
}

// ============================================
// SOAP Note Generation (Demo mode)
// ============================================
export function generateSOAPNoteDemo(dictation, patientContext) {
    const lower = dictation.toLowerCase();

    const subjective = extractSection(dictation, [
        "presents with", "reports", "complains of", "history of",
        "has been", "patient states", "patient describes",
    ]);

    const objective = extractSection(dictation, [
        "vitals", "blood pressure", "heart rate", "temperature",
        "examination", "upon inspection", "auscultation", "bp ",
    ]);

    const assessment = extractSection(dictation, [
        "assessment", "diagnosis", "impression", "consistent with",
        "likely", "differential",
    ]);

    const plan = extractSection(dictation, [
        "plan", "prescribe", "recommend", "follow up", "refer",
        "increase", "decrease", "discontinue", "start",
    ]);

    return {
        subjective: subjective || `Patient ${dictation.split('.').slice(0, 2).join('. ')}.`,
        objective: objective || "Vitals within normal limits. Physical examination unremarkable.",
        assessment: assessment || "Clinical findings as noted. Further evaluation may be needed.",
        plan: plan || "Continue current management. Follow up as needed.",
    };
}

function extractSection(text, keywords) {
    const sentences = text.split(/[.!]+/).map((s) => s.trim()).filter(Boolean);
    const relevant = sentences.filter((s) =>
        keywords.some((k) => s.toLowerCase().includes(k))
    );
    return relevant.length > 0 ? relevant.join(". ") + "." : "";
}

// ============================================
// AI Suggestions Generation (Demo mode)
// ============================================
export function generateSuggestionsDemo(entries) {
    const suggestions = [];

    // Count symptoms
    const symptomCounts = {};
    entries.forEach((entry) => {
        entry.entities?.forEach((e) => {
            if (e.type === "symptom") {
                const key = e.text.toLowerCase();
                symptomCounts[key] = (symptomCounts[key] || 0) + 1;
            }
        });
    });

    // Check for frequent symptoms
    Object.entries(symptomCounts).forEach(([symptom, count]) => {
        if (count >= 3) {
            suggestions.push({
                type: "warning",
                icon: "⚠️",
                title: `Frequent ${symptom.charAt(0).toUpperCase() + symptom.slice(1)}`,
                description: `You've reported ${symptom} ${count} times in the last 7 days. Consider discussing this pattern with your healthcare provider.`,
                bgColor: "rgba(245, 158, 11, 0.1)",
            });
        }
    });

    // Check sentiment trend
    const avgSentiment = entries.reduce((sum, e) => sum + (e.sentiment || 0), 0) / entries.length;
    if (avgSentiment < -0.3) {
        suggestions.push({
            type: "alert",
            icon: "📊",
            title: "Mood Trend Alert",
            description: "Your overall mood has been trending negative. Activities like walking and yoga have shown positive effects on your past entries.",
            bgColor: "rgba(244, 63, 94, 0.1)",
        });
    }

    // General wellness suggestion
    suggestions.push({
        type: "tip",
        icon: "💧",
        title: "Stay Hydrated",
        description: "Proper hydration can help manage many symptoms. Aim for 8 glasses of water daily.",
        bgColor: "rgba(59, 130, 246, 0.1)",
    });

    return suggestions;
}
