export default function ConnectGmailPage() {
  return (
    <div className="page">
      <span className="page__eyebrow">Before we connect</span>
      <h1>Connect your Gmail account</h1>
      <p className="page__lede">Before you continue to Google, here is exactly what this does:</p>
      <ul style={{ margin: "var(--space-2) 0", paddingLeft: "1.1em", display: "grid", gap: "0.5rem", color: "var(--color-ink-soft)" }}>
        <li>We read the contents of order-confirmation emails to find clothing, shoe, and accessory purchases.</li>
        <li>We never send, delete, or modify anything in your email.</li>
        <li>We never share your data with any third party.</li>
        <li>You can disconnect and permanently delete everything we&apos;ve stored at any time.</li>
      </ul>
      <a href="/api/auth/gmail/start" className="btn btn-primary section">
        Continue to Google
      </a>
    </div>
  );
}
