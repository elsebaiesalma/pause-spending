export default function DeleteGmailDataPage() {
  return (
    <main style={{ maxWidth: 560, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>Permanently delete your Gmail data</h1>
      <p>This will:</p>
      <ul>
        <li>Revoke this app&apos;s access to your Gmail account.</li>
        <li>Permanently delete every purchase parsed from that account.</li>
        <li>Permanently delete every wardrobe item seeded from those purchases.</li>
      </ul>
      <p><strong>This cannot be undone.</strong> Manually-added wardrobe items you created yourself are not affected.</p>
      <form action="/api/auth/gmail/delete" method="POST">
        <button
          type="submit"
          style={{
            padding: "0.6rem 1.2rem",
            background: "#c5221f",
            color: "white",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Yes, permanently delete everything
        </button>
      </form>
      <p style={{ marginTop: "1rem" }}>
        <a href="/">Cancel, go back</a>
      </p>
    </main>
  );
}
