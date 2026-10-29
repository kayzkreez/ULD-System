# TerraControl — MongoDB Edition

TerraControl is a land-development operations workspace for project delivery, budget and cost control, cash flow, plots/sales, payroll registers, procurement, customer follow-up, risk, documents, invoices, payments, site reports, leave requests, GIS point mapping, team roles, audit logs and exports.

## Architecture

- **Frontend:** React 18 + Vite
- **Backend:** Node.js + Express REST API
- **Database:** MongoDB / MongoDB Atlas
- **Authentication:** API-managed email/password accounts, bcrypt password hashing, signed JWT sessions
- **Files:** private server-side uploads, authorised API downloads
- **Security:** Helmet, CORS allowlist, rate-limited authentication routes, server-side workspace membership and role checks, organisation-scoped data paths
- **Reports:** CSV exports, JSON export, print views
- **Map:** Leaflet + OpenStreetMap for plot coordinate points; not a cadastral survey tool

> This is a MongoDB migration build, not a deployed service. Configure the server, test with non-production data, and complete a security review before storing real financial, payroll, identity or land-title records. The current starter marks newly created accounts as email-verified because no SMTP verification flow is bundled; do not treat that as proof of mailbox ownership. Configure real email verification before public production use.

## Requirements

- Node.js 20+
- A MongoDB Atlas cluster or secured MongoDB server

## 1. Configure MongoDB

1. Create a MongoDB Atlas project and cluster, or use your managed MongoDB server.
2. Create a database user with only the permissions needed for the TerraControl database.
3. Restrict Atlas network access to your backend deployment's IP addresses. Avoid `0.0.0.0/0` for production.
4. Copy `server/.env.example` to `server/.env` and configure `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, `CLIENT_ORIGIN`, and the upload settings.
5. Use a randomly generated `JWT_SECRET` of at least 32 characters. Never commit `server/.env`.

Example backend environment:

```dotenv
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=terracontrol
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-characters
CLIENT_ORIGIN=http://localhost:5173
UPLOAD_DIR=./uploads
MAX_UPLOAD_MB=25
```

## 2. Install and run

In the project root:

```bash
npm install
```

Start the API in one terminal:

```bash
cd server
npm install
cp .env.example .env
# Edit .env with your MongoDB connection string and secrets
npm run dev
```

Start the frontend in another terminal from the project root:

```bash
npm run dev
```

Open the Vite URL shown in the terminal. The Vite development server proxies `/api` to `http://localhost:4000`. For a separately hosted frontend, set `VITE_API_URL` to your deployed API origin plus `/api`, and set `CLIENT_ORIGIN` on the backend to the exact frontend origin.

Check the backend health endpoint at `/api/health`.

## 3. Deploy

Deploy the Node API to a trusted Node.js host and the Vite frontend to Vercel or another static frontend host. Set backend environment variables in the host's secret manager. Set `VITE_API_URL` in the frontend build environment. Persist the upload directory using private durable storage; do not rely on ephemeral local disk on serverless hosts. For horizontally scaled or serverless deployments, move files to private object storage or MongoDB GridFS and use a shared storage strategy.

Frontend build:

```bash
npm run build
```

## Data model

The backend stores documents in MongoDB collections:

- `users`: account metadata and password hashes
- `records`: tenant-scoped application documents with a canonical `path`, `orgId`, collection name, document ID and `data` payload
- `uploads`: private file metadata; file bytes are stored in the configured upload directory in this starter

Logical document paths preserve the app's workspace model, for example `organizations/{orgId}/projects/{recordId}`, `organizations/{orgId}/members/{userId}`, and `users/{userId}`.

## Security and production checklist

1. **Email verification:** implement and verify a real email verification flow before opening registration to the public. This starter does not prove mailbox ownership.
2. **Password recovery:** configure a real, single-use, expiring password-reset flow and transactional email provider. The current endpoint deliberately returns a generic message and does not send reset emails.
3. **Authentication:** JWT sessions expire after 12 hours; add refresh/revocation controls and consider secure same-site cookies for a public production deployment.
4. **Authorisation:** test every role against every module, especially payroll, documents, audit records, member management and cross-workspace access. Treat the backend as the security boundary; UI role checks alone are insufficient.
5. **Invitations:** the app records invitations and accepts them on a matching email sign-in; add email delivery, expiry, one-time tokens and abuse controls before public use.
6. **Uploads:** use private durable object storage or GridFS, scan uploaded files, enforce access controls and retention, and back up the file store alongside MongoDB. Configure reverse-proxy upload limits.
7. **Backups:** enable MongoDB Atlas backups / point-in-time recovery, retention, alerting and restore drills. Do not rely only on browser JSON exports.
8. **Audit integrity:** add server-side immutable audit events for every sensitive operation and consider export to a separate append-only log service.
9. **Payroll compliance:** deductions are manually entered and formulas are basic. Have a Zimbabwe payroll professional validate PAYE, NSSA, AIDS levy, benefits, overtime, leave, pension, currency and payslip requirements.
10. **Accounting:** invoices and payment registers are operational tracking only; no QuickBooks or other accounting API is connected.
11. **GIS and land:** markers use latitude/longitude only. Survey-grade polygons, cadastral files, coordinate reference systems, title verification and authority approvals require qualified professionals.
12. **Operations:** set HTTPS, secret rotation, database least privilege, monitoring, rate limits, dependency scanning, error reporting and a documented incident-response process.

## Included modules

Dashboard; Alerts & Notifications; Projects; Budget & Costs; Cash Flow; Tasks & Schedule; Milestones; Plots & Sales; GIS / Site Map; Customers & Buyers; Procurement; Payroll & Payslips; Leave Requests; Invoices & Payments; Payments; Documents & Permits; Site Reports; Risks & Issues; Decisions & Changes; Team & Access; Audit Log; Reports & Export; Settings.

## Limitations to know

- In-app data refresh is polling-based (about every five seconds), not real-time change streams.
- Email verification and password reset delivery are not implemented in this starter.
- Invitations are recorded in-app but invitation emails are not sent automatically.
- File uploads use private local disk storage; use durable private storage for production.
- GIS displays points, not surveyed parcel boundaries.
- Statutory payroll calculations and accounting integrations require separate implementation and professional validation.
