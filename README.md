# TerraControl — Land Development Management System

A GitHub-ready React/Vite starter application that brings land development operations into one workspace.

## Included modules
- Executive dashboard and portfolio KPIs
- Projects and project profile records
- Cost plan, budget tracking, commitments, actuals and forecast variance
- Cash-flow planning and funding sources
- Task tracker, schedule health and milestone gates
- Land parcels / plots register, allocation and sale status
- Payroll register and payslip preview
- Procurement and contractor register
- Risk, issue and dependency register
- Document / permit register
- Change and decision log
- Reports, CSV export, JSON backup / restore, print-friendly views

## Important scope and data warning
This starter stores records in the current browser using `localStorage`. It is suitable for a demo, internal prototype or single-browser use. It does **not** yet provide secure user authentication, shared multi-user data, server-side backups, audit-grade controls, or protected payroll/identity data. Do not store real employee bank details, national IDs, passwords, or confidential documents in this prototype.

For production, connect a backend (for example Firebase/Firestore or Supabase), add role-based access control, server-side validation, scheduled backups, audit logs, encryption, and security rules. Tax and payroll formulas are illustrative only and must be configured for the relevant jurisdiction by a qualified payroll professional. Land subdivision, title, planning, environmental, tax and construction requirements vary by local authority and must be verified before operational use.

## Run locally
Requires Node.js 20+ (Node.js 18.18+ may also work with compatible package versions).

```bash
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Build for deployment
```bash
npm run build
npm run preview
```
The production build is created in `dist/`.

## Publish to GitHub
1. Create a new empty repository on GitHub.
2. Extract this ZIP.
3. Open a terminal in the extracted folder and run:

```bash
git init
git add .
git commit -m "Initial TerraControl land development system"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the remote URL with your own GitHub repository URL.

## Deploy to Vercel
Import the GitHub repository into Vercel. Framework preset: **Vite**. Build command: `npm run build`. Output directory: `dist`. No environment variables are required for this local-storage prototype.

## Data management
- Use **Export backup** to download a JSON snapshot of the browser data.
- Use **Import backup** to restore a previously exported JSON snapshot.
- Use CSV export from tables for spreadsheet reporting.
- Data is browser-specific and can be lost if browser storage is cleared. Export backups regularly.

## Suggested production roadmap
1. Firebase Auth / Supabase Auth with roles: Owner, Project Manager, Finance, HR/Payroll, Engineer, Sales, Auditor, Read-only.
2. Shared database schema with project-level access boundaries.
3. File storage for plans, permits, contracts, invoices and site photos.
4. Approval workflows for purchase orders, invoices, payroll, plot allocation and change requests.
5. Audit trail, notifications, email integration and automated reminders.
6. Local currency, exchange-rate, tax, payroll and statutory compliance configuration.
7. GIS/map integration and parcel geometry / title reference management.
8. Formal accounting integration and reconciliation controls.
