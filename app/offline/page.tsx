import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="offline-page">
      <section className="card offline-card">
        <span className="brandmark offline-brandmark">R</span>
        <span className="eyebrow">Raha Fielddesk</span>
        <h1>You’re offline.</h1>
        <p>
          Reconnect before starting a day or saving a field action. Location and
          reimbursement records are never queued silently on a shared device.
        </p>
        <Link className="btn btn-primary" href="/">
          Try again
        </Link>
      </section>
    </main>
  );
}
