import { WelcomeIntro } from "./WelcomeIntro";

export default function ConnectGmailPage() {
  return (
    <div className="page">
      <WelcomeIntro />
      <span className="page__eyebrow">Connect your wardrobe</span>
      <h1>Build it from what you&apos;ve already bought</h1>
      <p className="page__lede">
        Instead of logging every item by hand, PAUSE reads your Gmail order confirmations and turns
        them into a wardrobe automatically. Here is exactly what that means:
      </p>

      <div className="section stack">
        <div className="note">
          <strong>Read-only access.</strong> PAUSE can only read messages - it can never send, delete,
          reply to, or change anything in your inbox.
        </div>
        <div className="note">
          <strong>Only order confirmations are processed.</strong> Everything else in your inbox is
          skipped. We look for clothing, shoe, and accessory purchases and nothing more.
        </div>
        <div className="note">
          <strong>The raw email is discarded after extraction.</strong> We keep the item name, price,
          photo, and date we pull from a confirmation - never the email itself.
        </div>
        <div className="note">
          <strong>We never share your data.</strong> Nothing we read or extract is sold or passed to
          any third party.
        </div>
        <div className="note">
          <strong>You&apos;re always in control.</strong> Disconnect Gmail, or permanently delete
          everything PAUSE has stored, at any time from your Account page.
        </div>
      </div>

      <a href="/api/auth/gmail/start" className="btn btn-primary section">
        Continue to Google
      </a>
    </div>
  );
}
