export const metadata = {
  title: "Privacy Policy — Ask Better Questions",
};

export default function PrivacyPage() {
  return (
    <main style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px", fontFamily: "system-ui, sans-serif", lineHeight: 1.7, color: "#ffffff" }}>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ color: "#252525", marginBottom: 32 }}>Last updated: April 2026</p>

      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 32 }}>About this policy</h2>
      <p>This policy covers the Ask Better Questions Chrome extension, website, and Android app (available on Google Play). All surfaces share the same backend API and the same data practices described here.</p>

      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 32 }}>What we collect</h2>
      <p>When you use Ask Better Questions, the URL of the page you choose to analyze is sent to our server. This is necessary to fetch and analyze the article content.</p>
      <p style={{ marginTop: 12 }}>We do not collect, store, or share:</p>
      <ul style={{ paddingLeft: 20, marginTop: 8 }}>
        <li>Your identity or account information</li>
        <li>Your browsing history</li>
        <li>Cookies or credentials from pages you visit</li>
        <li>Any data beyond the URL you explicitly submit for analysis</li>
      </ul>

      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 32 }}>How URLs are used</h2>
      <p>The submitted URL is used in real time to retrieve the article text and generate analysis. It is not logged, stored, or used for any other purpose.</p>

      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 32 }}>Third parties</h2>
      <p>Article URLs and the text extracted from them are sent to <strong>OpenAI</strong> for AI-powered analysis. OpenAI processes this content to generate questions and cues. Please refer to <a href="https://openai.com/policies/privacy-policy" style={{ color: "#0070f3" }}>OpenAI&apos;s Privacy Policy</a> for details on how they handle data submitted via API.</p>
      <p style={{ marginTop: 12 }}>The Chrome extension loads fonts from Google Fonts. This causes your browser to make a request to Google&apos;s servers. No other third-party services receive your data.</p>

      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 32 }}>Data deletion</h2>
      <p>We do not store article content or URLs after processing. There is no persistent user data associated with your use of the app. If you believe data about you has been retained and wish to request its deletion, contact us at <a href="mailto:privacy@ask-better-questions.app" style={{ color: "#0070f3" }}>privacy@ask-better-questions.app</a>.</p>

      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, marginTop: 32 }}>Contact</h2>
      <p>Questions? Open an issue on our <a href="https://github.com/cestellevif/ask-better-questions" style={{ color: "#0070f3" }}>GitHub repository</a> or email <a href="mailto:privacy@ask-better-questions.app" style={{ color: "#0070f3" }}>privacy@ask-better-questions.app</a>.</p>
    </main>
  );
}
