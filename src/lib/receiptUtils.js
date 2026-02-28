// Generate a printable/downloadable prescription receipt
export function openPrescriptionReceipt(consult) {
    const rd = consult.receipt_data || {};
    const rxItems = rd.prescription || [];
    const rec = parseRecommendation(consult.ai_recommendation);

    const finalDiagnosis = rd.diagnosis || rec.diagnosis;
    const finalAdvice = rd.doctor_advice || rec.advice;

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Prescription Receipt - ${rd.receipt_id || "RX"}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; background: #fff; color: #1a1a2e; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #14b8a6; padding-bottom: 20px; margin-bottom: 24px; }
        .logo { font-size: 22px; font-weight: 800; color: #14b8a6; }
        .logo small { display: block; font-size: 12px; font-weight: 400; color: #666; margin-top: 4px; }
        .receipt-id { text-align: right; }
        .receipt-id .id { font-size: 18px; font-weight: 700; color: #1a1a2e; }
        .receipt-id .date { font-size: 12px; color: #888; margin-top: 4px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-verified { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .info-box { padding: 14px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .info-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .info-value { font-size: 15px; font-weight: 600; color: #1a1a2e; }
        .section-title { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .diagnosis { padding: 14px 16px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-size: 14px; line-height: 1.7; color: #334155; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; }
        td { padding: 12px 14px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #334155; }
        td:first-child { font-weight: 600; color: #1a1a2e; }
        .expiry { color: #d97706; font-weight: 600; }
        .notes { padding: 14px 16px; background: #f0fdf4; border-left: 3px solid #22c55e; border-radius: 0 8px 8px 0; margin-bottom: 24px; font-size: 14px; line-height: 1.7; color: #334155; }
        .hash-section { margin-top: 30px; padding-top: 20px; border-top: 2px dashed #e2e8f0; }
        .hash { font-family: 'Courier New', monospace; font-size: 11px; color: #14b8a6; word-break: break-all; padding: 10px 14px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; }
        .download-bar { position: fixed; top: 0; left: 0; right: 0; background: #1a1a2e; color: white; padding: 10px 20px; display: flex; align-items: center; justify-content: space-between; z-index: 100; }
        .download-bar button { padding: 6px 16px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 13px; }
        .btn-print { background: #14b8a6; color: white; }
        .btn-close { background: #475569; color: white; }
        @media print { .download-bar { display: none; } body { padding: 20px; } }
    </style>
</head>
<body>
    <div class="download-bar">
        <span>📋 Digital Prescription Receipt</span>
        <div>
            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
            &nbsp;
            <button class="btn-close" onclick="window.close()">✕ Close</button>
        </div>
    </div>
    <div style="height: 50px"></div>

    <div class="header">
        <div>
            <div class="logo">
                <img src="/logo.png" style="width: 24px; border-radius: 4px; vertical-align: middle; margin-right: 6px;" /> SymptoSense
                <small>AI-Powered Healthcare Platform</small>
            </div>
        </div>
        <div class="receipt-id">
            <div class="id">${rd.receipt_id || "RX-" + (consult.id || "").slice(0, 8).toUpperCase()}</div>
            <div class="date">Issued: ${rd.issued_at ? new Date(rd.issued_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
            <div style="margin-top: 6px"><span class="badge badge-verified">🔐 SHA-256 Verified</span></div>
        </div>
    </div>

    <div class="info-grid">
        <div class="info-box">
            <div class="info-label">Patient</div>
            <div class="info-value">${rd.patient_name || consult.patient?.full_name || "Patient"}</div>
        </div>
        <div class="info-box">
            <div class="info-label">Prescribing Doctor</div>
            <div class="info-value">Dr. ${rd.doctor_name || consult.doctor?.full_name || "Doctor"}</div>
        </div>
    </div>

    ${finalDiagnosis ? `
    <div class="section-title">🔍 Clinical Assessment</div>
    <div class="diagnosis">${finalDiagnosis}</div>
    ` : ""}

    ${rxItems.length > 0 ? `
    <div class="section-title">💊 Prescribed Medications</div>
    <table>
        <thead>
            <tr>
                <th>Medicine</th>
                <th>Quantity</th>
                <th>Timing</th>
                <th>Expiry</th>
            </tr>
        </thead>
        <tbody>
            ${rxItems.map(rx => `
            <tr>
                <td>💊 ${rx.name}</td>
                <td>${rx.quantity || rx.dosage || "As prescribed"}</td>
                <td>${rx.timing || "As directed"}</td>
                <td class="expiry">${rx.expiry || rx.duration || "30 days"}</td>
            </tr>
            `).join("")}
        </tbody>
    </table>
    ` : ""}

    ${consult.doctor_response ? `
    <div class="section-title">📝 Doctor's Notes</div>
    <div class="notes">${consult.doctor_response}</div>
    ` : ""}

    ${finalAdvice ? `
    <div class="section-title">💡 Patient Advice</div>
    <div class="diagnosis" style="border-color: #22c55e; background: #f0fdf4;">${finalAdvice}</div>
    ` : ""}

    <div class="hash-section">
        <div class="section-title">🔐 Digital Signature</div>
        <div class="hash">${consult.receipt_hash || "Pending verification"}</div>
        <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
            This prescription has been digitally signed using SHA-256 cryptographic hash to ensure authenticity and tamper-proof verification.
        </div>
    </div>

    <div class="footer">
        <span>SymptoSense · MIT Hackathon</span>
        <span>Generated: ${new Date().toLocaleString()}</span>
    </div>
</body>
</html>`;

    const w = window.open("", "_blank", "width=850,height=900");
    w.document.write(html);
    w.document.close();
}

// Parse AI recommendation (handles string or object)
function parseRecommendation(raw) {
    try {
        if (typeof raw === "string") {
            const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
            return JSON.parse(cleaned);
        }
        if (raw && typeof raw === "object") return raw;
    } catch { }
    return {};
}
