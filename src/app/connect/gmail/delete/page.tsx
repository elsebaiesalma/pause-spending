export default function DeleteGmailDataPage() {
  return (
    <div className="page">
      <span className="page__eyebrow">Careful, this is permanent</span>
      <h1>Permanently delete your Gmail data</h1>
      <p className="page__lede">This will:</p>
      <ul style={{ margin: "var(--space-2) 0", paddingLeft: "1.1em", display: "grid", gap: "0.5rem", color: "var(--color-ink-soft)" }}>
        <li>Revoke this app&apos;s access to your Gmail account.</li>
        <li>Permanently delete every purchase parsed from that account.</li>
        <li>Permanently delete every wardrobe item seeded from those purchases.</li>
      </ul>
      <p className="note section">
        <strong>This cannot be undone.</strong> Manually-added wardrobe items you created yourself are
        not affected.
      </p>
      <form action="/api/auth/gmail/delete" method="POST" className="section">
        <button type="submit" className="btn-danger">
          Yes, permanently delete everything
        </button>
      </form>
      <p className="section">
        <a href="/" className="btn-quiet">
          Cancel, go back
        </a>
      </p>
    </div>
  );
}
