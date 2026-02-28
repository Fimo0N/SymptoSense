// Synthetic data for the SymptoSense MVP
// All data is fictional and for demonstration purposes only

export const patients = [
    {
        id: "pt-001",
        name: "Jane Mitchell",
        age: 34,
        initials: "JM",
        color: "#14b8a6",
        condition: "Chronic Migraine",
        lastVisit: "2026-02-25",
        status: "active",
        allergies: ["Penicillin", "Sulfa"],
        medications: ["Ibuprofen 400mg PRN", "Topiramate 50mg daily"],
    },
    {
        id: "pt-002",
        name: "Robert Chen",
        age: 58,
        initials: "RC",
        color: "#3b82f6",
        condition: "Type 2 Diabetes",
        lastVisit: "2026-02-24",
        status: "active",
        allergies: ["None known"],
        medications: ["Metformin 1000mg BID", "Lisinopril 10mg daily"],
    },
    {
        id: "pt-003",
        name: "Maria Santos",
        age: 45,
        initials: "MS",
        color: "#8b5cf6",
        condition: "Hypertension",
        lastVisit: "2026-02-22",
        status: "needs-review",
        allergies: ["Latex"],
        medications: ["Amlodipine 5mg daily", "HCTZ 12.5mg daily"],
    },
    {
        id: "pt-004",
        name: "David Thompson",
        age: 29,
        initials: "DT",
        color: "#f59e0b",
        condition: "Anxiety Disorder",
        lastVisit: "2026-02-20",
        status: "active",
        allergies: ["None known"],
        medications: ["Sertraline 100mg daily"],
    },
];

export const diaryEntries = {
    "pt-001": [
        {
            id: "d1",
            date: "2026-02-27",
            timestamp: "8:15 AM",
            text: "Woke up with a massive headache again, took 400mg of Ibuprofen but my mood is terrible today. The pain is around a 7 out of 10. I also feel very tired and nauseous.",
            sentiment: -0.6,
            sentimentLabel: "Negative",
            entities: [
                { text: "headache", type: "symptom" },
                { text: "Ibuprofen", type: "medication" },
                { text: "400mg", type: "dosage" },
                { text: "nauseous", type: "symptom" },
                { text: "tired", type: "symptom" },
            ],
        },
        {
            id: "d2",
            date: "2026-02-26",
            timestamp: "9:30 AM",
            text: "Headache started in the afternoon, about a 5 out of 10. Took Ibuprofen 400mg which helped after an hour. Mood was okay. Had some dizziness when standing up quickly.",
            sentiment: -0.2,
            sentimentLabel: "Slightly Negative",
            entities: [
                { text: "Headache", type: "symptom" },
                { text: "Ibuprofen", type: "medication" },
                { text: "400mg", type: "dosage" },
                { text: "dizziness", type: "symptom" },
            ],
        },
        {
            id: "d3",
            date: "2026-02-25",
            timestamp: "7:45 AM",
            text: "No headache today! Feeling much better and my mood is positive. Went for a 30-minute walk. Took my Topiramate as scheduled. Good sleep last night, about 7 hours.",
            sentiment: 0.7,
            sentimentLabel: "Positive",
            entities: [
                { text: "Topiramate", type: "medication" },
            ],
        },
        {
            id: "d4",
            date: "2026-02-24",
            timestamp: "10:00 AM",
            text: "Severe migraine episode. Pain level 8 out of 10. Took 600mg Ibuprofen and rested in a dark room for 3 hours. Vision was blurry and I had sensitivity to light.",
            sentiment: -0.8,
            sentimentLabel: "Very Negative",
            entities: [
                { text: "migraine", type: "condition" },
                { text: "Ibuprofen", type: "medication" },
                { text: "600mg", type: "dosage" },
                { text: "blurry vision", type: "symptom" },
                { text: "sensitivity to light", type: "symptom" },
            ],
        },
        {
            id: "d5",
            date: "2026-02-23",
            timestamp: "8:30 AM",
            text: "Mild headache in the morning, pain about 3 out of 10. Did not take any medication. Mood was neutral. Had some neck stiffness. Drank plenty of water.",
            sentiment: -0.1,
            sentimentLabel: "Neutral",
            entities: [
                { text: "headache", type: "symptom" },
                { text: "neck stiffness", type: "symptom" },
            ],
        },
        {
            id: "d6",
            date: "2026-02-22",
            timestamp: "9:00 AM",
            text: "Terrible day. Woke up with a pounding headache. Pain 9 out of 10. Took 400mg Ibuprofen and 50mg Topiramate. Couldn't go to work. Experienced vomiting and aura.",
            sentiment: -0.9,
            sentimentLabel: "Very Negative",
            entities: [
                { text: "headache", type: "symptom" },
                { text: "Ibuprofen", type: "medication" },
                { text: "400mg", type: "dosage" },
                { text: "Topiramate", type: "medication" },
                { text: "50mg", type: "dosage" },
                { text: "vomiting", type: "symptom" },
                { text: "aura", type: "symptom" },
            ],
        },
        {
            id: "d7",
            date: "2026-02-21",
            timestamp: "8:00 AM",
            text: "Pretty good day overall. No significant headache, just slight tension. Mood is positive. Took Topiramate as scheduled. Went to yoga class which seemed to help.",
            sentiment: 0.5,
            sentimentLabel: "Positive",
            entities: [
                { text: "tension", type: "symptom" },
                { text: "Topiramate", type: "medication" },
            ],
        },
    ],
    "pt-002": [
        {
            id: "d8",
            date: "2026-02-27",
            timestamp: "7:00 AM",
            text: "Blood sugar was 145 this morning, a bit higher than usual. Took Metformin 1000mg with breakfast. Had a small donut at the office which I shouldn't have. Feeling okay overall.",
            sentiment: 0.0,
            sentimentLabel: "Neutral",
            entities: [
                { text: "Blood sugar 145", type: "symptom" },
                { text: "Metformin", type: "medication" },
                { text: "1000mg", type: "dosage" },
            ],
        },
        {
            id: "d9",
            date: "2026-02-26",
            timestamp: "7:30 AM",
            text: "Excellent day. Blood sugar stable at 110 fasting. Took all medications on schedule. Went for a 45-minute walk. Feeling energetic and positive.",
            sentiment: 0.8,
            sentimentLabel: "Very Positive",
            entities: [
                { text: "Blood sugar 110", type: "symptom" },
            ],
        },
    ],
};

// 7-day trend data for Jane (pt-001)
export const trendData = {
    "pt-001": {
        labels: ["Feb 21", "Feb 22", "Feb 23", "Feb 24", "Feb 25", "Feb 26", "Feb 27"],
        painLevels: [2, 9, 3, 8, 0, 5, 7],
        moodScores: [7, 1, 5, 2, 8, 6, 3],
        medicationDoses: [1, 2, 0, 1, 1, 1, 1],
        sentimentScores: [0.5, -0.9, -0.1, -0.8, 0.7, -0.2, -0.6],
    },
    "pt-002": {
        labels: ["Feb 21", "Feb 22", "Feb 23", "Feb 24", "Feb 25", "Feb 26", "Feb 27"],
        painLevels: [1, 0, 2, 1, 0, 0, 1],
        moodScores: [7, 8, 6, 7, 8, 9, 7],
        medicationDoses: [2, 2, 2, 2, 2, 2, 2],
        sentimentScores: [0.4, 0.6, 0.2, 0.3, 0.5, 0.8, 0.0],
    },
};

// AI-generated insights for patient portal
export const patientInsights = [
    {
        id: "i1",
        type: "warning",
        icon: "⚠️",
        title: "Headache Frequency Increasing",
        description: "You've reported headaches 5 out of the last 7 days. Consider sharing this trend with your doctor at your next visit.",
        bgColor: "rgba(245, 158, 11, 0.1)",
    },
    {
        id: "i2",
        type: "suggestion",
        icon: "💡",
        title: "Hydration Reminder",
        description: "Dehydration can trigger migraines. Try to drink at least 8 glasses of water daily.",
        bgColor: "rgba(59, 130, 246, 0.1)",
    },
    {
        id: "i3",
        type: "positive",
        icon: "✨",
        title: "Exercise Helps",
        description: "On days you exercised (yoga, walking), your pain scores were significantly lower. Keep it up!",
        bgColor: "rgba(34, 197, 94, 0.1)",
    },
    {
        id: "i4",
        type: "alert",
        icon: "🔔",
        title: "Medication Usage",
        description: "You've taken Ibuprofen 5 times this week. Frequent NSAID use can cause side effects. Discuss alternatives with Dr. Smith.",
        bgColor: "rgba(244, 63, 94, 0.1)",
    },
];

// Sample SOAP note for demo
export const sampleSOAPNote = {
    subjective: "Patient presents with a 3-day history of severe, recurring headaches, rated 7-9/10 in intensity. Reports associated nausea, photosensitivity, and one episode of vomiting. Headache is bilateral, pulsating in nature. Patient has been using Ibuprofen 400-600mg PRN with partial relief. Reports poor sleep quality and increased stress at work. 7-day health diary shows an escalating pattern, with headache-free days correlating with physical activity (yoga, walking).",
    objective: "Vitals: BP 122/78 mmHg, HR 72 bpm, Temp 98.4°F, SpO2 99%. General: Alert, oriented, appears fatigued. HEENT: No papilledema on fundoscopic exam. Neck: Mild bilateral trapezius tension, no meningeal signs. Neurological: CN II-XII intact. No focal deficits. Reflexes 2+ and symmetric bilaterally.",
    assessment: "1. Chronic migraine without aura (ICD-10: G43.709) — increasing frequency and severity over the past week, possibly related to stress and poor sleep hygiene.\n2. Medication overuse headache — Ibuprofen use 5 of 7 days, at risk for rebound headaches.\n3. Current Topiramate 50mg daily may need dose optimization.",
    plan: "1. Increase Topiramate to 75mg daily, monitor for side effects (paresthesia, cognitive dulling).\n2. Prescribe Sumatriptan 50mg — take at migraine onset, max 2 doses per 24 hours.\n3. Reduce Ibuprofen use to max 2 days per week to prevent rebound.\n4. Refer to headache diary app — continue tracking symptoms, triggers, and medication use.\n5. Sleep hygiene counseling — aim for 7-8 hours, consistent sleep/wake schedule.\n6. Follow-up in 2 weeks. If no improvement, consider referral to neurology.",
};

// Pre-built dictation transcript for demo
export const sampleDictation = "Patient presents with a 3-day history of severe headaches. Reports associated nausea and photosensitivity. Has been using Ibuprofen 400mg with partial relief. Vitals are normal. Blood pressure 122 over 78. Heart rate 72. Assessment is chronic migraine without aura with increasing frequency. Current Topiramate may need dose adjustment. Plan is to increase Topiramate to 75mg daily, prescribe Sumatriptan 50mg for acute episodes, and reduce NSAID use. Follow up in 2 weeks.";
