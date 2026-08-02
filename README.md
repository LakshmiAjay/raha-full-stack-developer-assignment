# Raha Fielddesk

A field activity and distance reimbursement application built for Raha's full-stack assessment. Sales associates can open a day, record lead visits with live location, close the day, and see their ordered timeline. Branch heads get a direct-report-scoped activity view, associate search, date filters, daily totals, session start/end notifications, and a manager-scoped monthly CSV reimbursement export. A manager-controlled approval workspace covers new lead proposals, holiday work, and session-time exceptions, including requests made in advance.

## Run locally

Requirements: Node.js 20+, MongoDB, and a browser that permits geolocation (localhost is treated as secure).

MongoDB is optional for evaluation: when `MONGODB_URI` is absent, the application automatically starts in demo mode with in-memory users, leads, historical days, CSV data, and a working associate day flow. Demo changes reset whenever the server restarts. Production deployments should always configure MongoDB.

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI`, a strong `AUTH_SECRET`, and a strong temporary `DEFAULT_USER_PASSWORD`.
2. Run `npm install`.
3. Run `npm run seed`.
4. Run `npm run dev` and open `http://localhost:3000`.

### Assessment test credentials

The disposable seed accounts use `RahaDemo@2026`, matching the `DEFAULT_USER_PASSWORD` value in `.env.example`. Set the same value in the assessment Vercel environment before seeding it. Replace it for any non-demo deployment.

- Branch head: `meera@raha.in` / `RahaDemo@2026`
- Sales associate: `arjun@raha.in` / `RahaDemo@2026`

### Live demo

https://raha-assignment.vlajay.com

### Seed data

Run `npm run seed` to create a deterministic demonstration dataset containing:

- 1 branch head.
- 3 sales associates, all reporting to that branch head.
- 5 leads, each with a name, contact, latitude, and longitude.
- 15 completed historical activity days (5 per associate) with two visits per day, so the monthly CSV export contains data.

The script verifies these counts after insertion and exits unsuccessfully if they do not match. It is a replacement seed: running it clears the application's existing users, leads, days, approvals, notifications, and work-policy collections before inserting the demonstration data.

## Data model

- `users`: identity, password hash, role, branch, and manager relationship.
- `leads`: branch-owned lead, contact, and known location.
- `days`: one document per workday session with embedded activities. Start, activity, and end locations retain coordinate, browser-reported accuracy, and capture time. Embedding makes a day's ordered route atomic and easy to audit.
- `approvals`: associate requests, manager decisions, decision notes, and the request-specific payload. Leads are created only after their proposal is approved.
- `notifications`: branch-head session start/end events with unread state and links back to the recorded day.
- `workPolicies`: manager-owned timezone, session window, and named branch holidays.

A partial unique index allows only one active day per associate. Branch and date indexes support the manager view and monthly aggregation.

## Authorization and edge cases

Role checks run inside every API handler; the UI and middleware are convenience layers, not the security boundary. Branch heads query only associates assigned to them and can decide only requests addressed to them. Associates can access only their own current/latest day and approval history and cannot choose a user ID in day APIs. Leads are checked against the associate's branch.

Session notifications are saved when an associate successfully starts or ends a session. The branch-head bell checks for new events every 30 seconds and whenever the browser tab returns to the foreground, avoiding the operational overhead of WebSockets for this low-volume workflow.

Associates may propose leads, but proposals remain outside the branch lead list until the assigned manager approves them. Managers set the branch work window, holidays, and daily break allowance. Associates can split that allowance across multiple planned breaks; location capture and visit logging pause during each break. Additional break minutes require a manager-approved request and are added only to the requested day. Starting or ending outside the work window, or starting work on a holiday, is blocked unless a matching approval exists; a blocked attempt creates a pending request automatically. The Approvals page also supports advance requests.

Duplicate starts, ending without an active day, activities after close, foreign leads, invalid coordinates, and missing location permission return explicit errors. A day left open remains visible as active and can be closed later. `localDate` is calculated in the device's IANA timezone at start so midnight and deployment-server timezone do not reassign it.

## Distance calculation

At day end the start, activity, and end points are sorted by their captured timestamps. Every consecutive pair is sent to the OSRM driving-route API and summed. Identical points add zero. If routing is unavailable or times out, only that segment falls back to Haversine distance and the saved `distanceSource` makes the fallback visible. Haversine under-reports real road distance. The provider lives behind `segmentDistanceKm`, so OpenRouteService or Google Routes can replace OSRM without changing day logic.

Continuous two-minute route sampling is an optional associate-controlled enhancement. When it is off, start, visit, and end actions still capture locations and form the complete reimbursement route required by the assessment. When it is on, the additional samples refine the road route while the page remains active.

For production, use a contracted routing service instead of OSRM's public demo server and calculate asynchronously with retries for stronger reliability.

## Continuous route capture

**Browser approach:** while an associate has an active day and explicitly enables continuous tracking, the app can use `watchPosition`, reject stale or low-accuracy fixes, sample at a controlled interval, batch points, and upload them in timestamp order. The current optional two-minute sampler demonstrates this foreground-only approach.

**Browser limitations:** mobile browsers may throttle background tabs, suspend JavaScript when the screen locks, lose connectivity, or stop tracking when the user closes the page. Continuous GPS also consumes battery, browser permission can be revoked, and a browser cannot guarantee uninterrupted background collection.

**Production solution:** use a native mobile app with OS background-location permissions and clear on-duty/off-duty controls.

## Responsive and progressive web app support

The interface adapts across desktop, tablet, and phone layouts. On smaller screens the desktop sidebar becomes a persistent role-aware bottom navigation, dashboard grids collapse cleanly, wide reports remain horizontally scrollable, forms use single-column layouts, and dialogs respect the available viewport and safe-area insets.

The production build is installable as a Progressive Web App (PWA). It includes a web app manifest, application icons, standalone display metadata, an account-menu **Install app** action when the browser exposes installation, and a service worker with a dedicated offline fallback. The service worker deliberately never caches API responses or authenticated page data.

To test installation locally, run `npm run build` followed by `npm start`, open the HTTPS deployment (or localhost) in a supported browser, sign in, and choose **Install app** from the account menu. iOS Safari does not expose the custom install prompt; use **Share → Add to Home Screen** instead. Field actions still require a network connection and show the offline page when navigation cannot reach the server.

## Deployment

Create a MongoDB Atlas database, add the environment variables in Vercel (including `DEFAULT_USER_PASSWORD=RahaDemo@2026` for the disposable assessment accounts), run the seed script once against Atlas, and deploy this repository as a Next.js project. Geolocation requires HTTPS outside localhost. After verification, replace the placeholder in the `Live demo` section with the deployed URL.

## With more time

- Implement an auditable correction workflow for disputed visits, locations, and reimbursement amounts, ensuring that both the original and corrected values are retained for complete transparency and traceability.
- Introduce idempotency keys along with an offline action queue to prevent duplicate sessions or visit records when mobile devices retry requests due to network interruptions.
- Adopt cursor-based pagination to efficiently handle large datasets, including team activity histories, approval requests, notifications, and travel records, while maintaining consistent performance.
- Strengthen API security by applying rate limiting and abuse protection measures, particularly for authentication and data-modifying endpoints, to safeguard system reliability.
- Establish comprehensive observability through structured logging, performance metrics, distributed tracing, and automated alerts to quickly detect routing failures, database latency, and rejected operations.
- Offload distance calculations to background processing jobs with configurable routing-provider retry mechanisms and reconciliation processes, ensuring accurate travel distance records even when external routing services are temporarily unavailable.
