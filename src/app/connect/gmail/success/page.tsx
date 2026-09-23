export default function GmailConnectedPage() {
  return (
    <div className="page">
      <span className="page__eyebrow">Connected</span>
      <h1>Gmail connected</h1>
      <p className="page__lede">
        Your Gmail account is now connected. We&apos;ll pull in the last six months of order
        confirmations, then keep syncing automatically.
      </p>
      <a href="/" className="btn btn-primary section">
        Back to home
      </a>
    </div>
  );
}
