import "./globals.css";

export const metadata = {
  title: "SymptoSense | AI-Powered Healthcare Dashboard",
  description: "Dual-interface AI application connecting patient health diaries with clinician documentation workflows. Built for the MIT Minds & Machines Hackathon.",
  keywords: "healthcare, AI, patient portal, clinician, SOAP notes, health diary",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
