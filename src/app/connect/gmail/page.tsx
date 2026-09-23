export default function ConnectGmailPage() {
  return (
    <main style={{ maxWidth: 560, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Connect your Gmail account</h1>
      <p>Before you continue to Google, here is exactly what this does:</p>
      <ul>
        <li>We read the contents of order-confirmation emails to find clothing, shoe, and accessory purchases.</li>
        <li>We never send, delete, or modify anything in your email.</li>
        <li>We never share your data with any third party.</li>
        <li>You can disconnect and permanently delete everything we&apos;ve stored at any time.</li>
      </ul>
      <a
        href="/api/auth/gmail/start"
        style={{
          display: "inline-block",
          marginTop: "1.5rem",
          padding: "0.6rem 1.2rem",
          background: "#1a73e8",
          color: "white",
          borderRadius: 6,
          textDecoration: "none",
        }}
      >
        Continue to Google
      </a>
    </main>
  );
}
