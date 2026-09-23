export default function NewDesiredItemPage() {
  return (
    <main style={{ maxWidth: 480, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>I want to buy this</h1>
      <p>
        <a href="/">Back to home</a>
      </p>

      <h2>Paste a product URL</h2>
      <form action="/api/desired-items/from-url" method="POST" style={{ display: "grid", gap: "0.5rem", maxWidth: 400 }}>
        <input name="url" type="url" placeholder="https://..." required />
        <button type="submit">Look it up</button>
      </form>

      <h2 style={{ marginTop: "2rem" }}>Upload a screenshot</h2>
      <form
        action="/api/desired-items/from-screenshot"
        method="POST"
        encType="multipart/form-data"
        style={{ display: "grid", gap: "0.5rem", maxWidth: 400 }}
      >
        <input name="screenshot" type="file" accept="image/*" required />
        <button type="submit">Identify item</button>
      </form>

      <h2 style={{ marginTop: "2rem" }}>Or just type it</h2>
      <form action="/api/desired-items/from-text" method="POST" style={{ display: "grid", gap: "0.5rem", maxWidth: 400 }}>
        <input name="text" placeholder="e.g. navy wool blazer" required />
        <button type="submit">Continue</button>
      </form>
    </main>
  );
}
