import { SyncProgress } from "./SyncProgress";

export default function GmailConnectedPage() {
  return (
    <div className="page">
      <span className="page__eyebrow">Connected</span>
      <h1>Gmail connected</h1>
      <p className="page__lede">
        We&apos;re looking through the last six months of order confirmations now, matching what we
        find to build your wardrobe. This only runs once.
      </p>
      <SyncProgress />
    </div>
  );
}
