"use client";

import Link from "next/link";
import Navigation from "./components/Navigation";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className={`${styles.heroGlow} animate-pulse-slow`} />
          <div className={`${styles.heroContent} animate-fade-in`}>

            {/* Left Column: Text & CTAs */}
            <div className={styles.heroTextContent}>
              <div className={`${styles.heroBadge} animate-float`}>
                <span>🧠</span> MIT Minds & Machines Hackathon
              </div>
              <h1 className={styles.heroTitle}>
                Sympto<span className={styles.heroTitleAccent}>Sense</span>
              </h1>
              <p className={styles.heroSubtitle}>
                Bridging patient health diaries with clinical documentation
                through AI — empowering patients with insights and freeing
                clinicians from the documentation tax.
              </p>
              <div className={styles.heroCtas}>
                <Link href="/signup" className="btn btn-primary btn-lg animate-float" style={{ animationDelay: "0.2s" }}>
                  <span>👤</span> Patient Sign Up
                </Link>
                <Link href="/login" className="btn btn-secondary btn-lg animate-float" style={{ animationDelay: "0.4s" }}>
                  <span>🩺</span> Doctor Login
                </Link>
              </div>
            </div>

            {/* Right Column: Elegant Logo Display */}
            <div className={styles.heroImageContent}>
              <div className={styles.heroLogoWrapper}>
                <div className={styles.heroLogoGlow}></div>
                <img src="/logo.png" alt="SymptoSense Logo" className={styles.heroLogo} />
              </div>
            </div>

          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: "rgba(20, 184, 166, 0.12)" }}>🎙️</div>
            <h3 className={styles.featureTitle}>Voice Health Diary</h3>
            <p className={styles.featureDesc}>
              Patients log daily symptoms through voice or text. AI extracts
              medical entities, tracks mood, and visualizes health trends.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: "rgba(59, 130, 246, 0.12)" }}>📊</div>
            <h3 className={styles.featureTitle}>7-Day Trend Analysis</h3>
            <p className={styles.featureDesc}>
              Interactive charts reveal patterns in pain levels, medication
              usage, and sentiment — giving patients and doctors actionable
              context.
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon} style={{ background: "rgba(139, 92, 246, 0.12)" }}>📝</div>
            <h3 className={styles.featureTitle}>SOAP Note Automation</h3>
            <p className={styles.featureDesc}>
              Clinicians dictate visit notes. AI structures them into
              Subjective, Objective, Assessment, and Plan — reducing
              documentation time by up to 70%.
            </p>
          </div>
        </section>

        {/* Azure Stack Section */}
        <section className={styles.techStack}>
          <h2 className={styles.sectionTitle}>Powered by Azure AI</h2>
          <div className={styles.techCards}>
            <div className={styles.techCard}>
              <div className={styles.techEmoji}>👂</div>
              <h4>Azure Speech-to-Text</h4>
              <p>Superior medical terminology accuracy for both patient and clinician voice input.</p>
            </div>
            <div className={styles.techCard}>
              <div className={styles.techEmoji}>🔍</div>
              <h4>Text Analytics for Health</h4>
              <p>Named Entity Recognition extracts symptoms, medications, dosages, and conditions.</p>
            </div>
            <div className={styles.techCard}>
              <div className={styles.techEmoji}>🧠</div>
              <h4>Azure OpenAI</h4>
              <p>Sentiment analysis, health insights, and structured SOAP note generation.</p>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className={styles.privacySection}>
          <div className={styles.privacyCard}>
            <h3>🔒 Privacy by Design</h3>
            <p>
              This MVP uses 100% synthetic, non-PHI data. The architecture is
              designed for HIPAA/HITRUST compliance with encryption at rest and
              in transit, Azure Key Vault, and FHIR R4 interoperability.
            </p>
            <div className={styles.privacyBadges}>
              <span className="badge badge-positive">Synthetic Data</span>
              <span className="badge badge-info">FHIR Ready</span>
              <span className="badge badge-neutral">Human-in-the-Loop</span>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
