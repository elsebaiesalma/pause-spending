export default function NewDesiredItemPage() {
  return (
    <div className="page">
      <span className="page__eyebrow">Before you buy</span>
      <h1>I want to buy this</h1>

      <h2>Paste a product URL</h2>
      <form action="/api/desired-items/from-url" method="POST">
        <input name="url" type="url" placeholder="https://..." required />
        <button type="submit">Look it up</button>
      </form>

      <h2>Upload a screenshot</h2>
      <form action="/api/desired-items/from-screenshot" method="POST" encType="multipart/form-data">
        <input name="screenshot" type="file" accept="image/*" required />
        <button type="submit">Identify item</button>
      </form>

      <h2>Or just type it</h2>
      <form action="/api/desired-items/from-text" method="POST">
        <input name="text" placeholder="e.g. navy wool blazer" required />
        <button type="submit" className="btn-primary">
          Continue
        </button>
      </form>
    </div>
  );
}
