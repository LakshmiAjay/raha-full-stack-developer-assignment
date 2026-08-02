# Raha Fielddesk

A field activity and distance reimbursement application built for Raha's full-stack assessment. Sales associates can open a day, record lead visits with live location, close the day, and see their ordered timeline. Branch heads get a branch-scoped activity view, associate search, date filters, daily totals, session start/end notifications, and a monthly CSV reimbursement export. A manager-controlled approval workspace covers new lead proposals, holiday work, and session-time exceptions, including requests made in advance.

## Run locally

Requirements: Node.js 20+, MongoDB, and a browser that permits geolocation (localhost is treated as secure).

MongoDB is optional for evaluation: when `MONGODB_URI` is absent, the application automatically starts in demo mode with in-memory users, leads, historical days, CSV data, and a working associate day flow. Demo changes reset whenever the server restarts. Production deployments should always configure MongoDB.

1. Copy `.env.example` to `.env.local` and set `MONGODB_URI` and a strong `AUTH_SECRET`.
2. Run `npm install`.
3. Run `npm run seed`.
4. Run `npm run dev` and open `http://localhost:3000`.

Seed login accounts (all use `Raha@123`):

- Branch head: `meera@raha.in`
- Sales associate: `arjun@raha.in` (also `nisha@raha.in`, `vikram@raha.in`)

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

For production, use a contracted routing service instead of OSRM's public demo server and calculate asynchronously with retries for stronger reliability.

## Continuous route capture

A browser could use `watchPosition`, batch samples, reject low-accuracy jumps, and upload periodically. In practice, mobile browsers throttle or stop background tabs, the OS may suspend them, battery usage is significant, and users can terminate the page. A production-grade solution should use a consent-led native app with background-location permissions, an offline queue, adaptive sampling based on motion, signed upload batches, retention controls, and clear on-duty/off-duty indicators. Raw trails should be access-limited and retained only as long as reimbursement or audit policy requires.

## Deployment

Create a MongoDB Atlas database, add the environment variables in Vercel, run the seed script once against Atlas, and deploy this repository as a Next.js project. Geolocation requires HTTPS outside localhost.

## With more time

I would add an auditable correction flow, idempotency keys for mobile retries, a road-route map, pagination, manager timezone preferences, rate limiting, structured logs, and integration tests against an ephemeral MongoDB instance.
