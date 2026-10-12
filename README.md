# HR Plus — Quotation & Invoice Manager

A full-stack quotation and invoicing app built with Next.js (App Router), React,
Tailwind CSS, Prisma, and Postgres. Create customers, build quotations with
multiple line items, watch totals calculate automatically, convert accepted
quotations into invoices with one click, and export polished PDF documents.

## Features

- **Quotations** — multi-line-item quotations with quantity × unit price,
  discount, tax rate, and automatic subtotal/tax/total calculation. Customer
  details (name, email, phone, address) are entered directly on the quotation.
  Each line item has a name, an optional description, an optional unit label
  (e.g. pcs/hrs — display only, never affects totals), and an optional product
  image (resized in the browser and stored with the document). Status
  workflow: Draft → Sent → Accepted/Rejected.
- **Item library** — a user-managed list of standardized/preset items (name,
  description, image, unit, unit price). Add, edit, and delete presets on the
  Item library page; they persist in the database and can be picked from a
  dropdown on every line item when building quotations and invoices.
- **One-click conversion** — turn an accepted quotation into an invoice. The
  invoice inherits the customer details, line items, and totals; the quotation
  is locked so its numbers can never drift from the invoice it produced.
- **Invoices** — can also be created directly. Status workflow: Unpaid → Paid /
  Overdue / Cancelled.
- **PDF export** — every quotation and invoice downloads as a PDF that
  follows the HR Plus quotation format: company logo top right, a
  "Quotation | <title>" bar, a Company Information box (customer + dates +
  document number), a fully bordered items table (Item / Package Description /
  Pricing / Quantity / Reference-image / Price) with unit labels merged into
  the Pricing and Quantity cells and a highlighted Total row, then Contact
  Information, Banking Information, Reminder, Remarks, Terms & Conditions, and
  a signature block — a blank "Agree & Accepted" client block on quotations,
  or the captured e-signature on invoices. Generated server-side via
  `@react-pdf/renderer`. Amounts are formatted in HKD by default.
- **Standardized Terms & Conditions** — a single template in
  `src/lib/settings.ts` is auto-populated onto every new document so wording
  stays consistent. The **Payment Due (Days)** field (default 30) is woven
  into the terms via a `{{paymentDueDays}}` placeholder ("Payment shall be
  made within 30 days…"), staying in sync until the terms are hand-edited. A
  `getDocumentDefaults()` seam lets a future admin settings page override the
  template from one place.
- **Reminder** — an editable reminder block (default: pay before the due date,
  quote the document number, contact us with questions) rendered between
  Banking Information and Terms & Conditions.
- **Invoice e-signature** — draw on a canvas, upload an image, or type a name
  rendered in a handwriting font; the signature is stored with the invoice and
  appears in its signature area and PDF.
- **Send by email** — a "Send email" button on quotation and invoice detail
  pages opens a modal with an editable subject and body, validates the
  recipient, generates and attaches the latest PDF, appends an HR Plus
  signature, and reports success/failure. Uses SMTP configured via `.env`
  (see `.env.example`); if SMTP is unset the UI reports it clearly rather than
  failing silently.
- **Dashboard** — customer/quotation/invoice counts, outstanding balance, and
  recent activity.
- **Online quotation e-signature** — every quotation gets a unique, random
  signing token. "Send email" delivers a secure `/sign/{token}` link (no
  login required) alongside the PDF; the public page shows the quotation
  read-only, lets the client draw or type a signature, and captures their
  name, email, timestamp, and IP address on "Accept & Sign". Signing flips the
  status to Accepted, regenerates the PDF with the signature embedded, emails
  the signed copy to both the client and HR Plus, shows a success page, and
  permanently locks the link against re-signing.
- **Settings page** — configure the Google Drive sync folder ID, company
  branding (name, logo, website), and the standing email CC list from the
  app itself, no code or redeploy required. See
  [Settings page](#settings-page) below.
- **Responsive UI** — collapsible sidebar drawer on mobile, stacked line-item
  editor on small screens, desktop table layout on larger screens; the public
  signing page is fully responsive too.

## Tech stack

| Layer      | Choice                                   |
|------------|-------------------------------------------|
| Framework  | Next.js 14 (App Router, Route Handlers)   |
| UI         | React 18, Tailwind CSS                    |
| Database   | Postgres via Prisma ORM (Vercel Postgres / Neon) |
| PDF export | @react-pdf/renderer (server-side render)  |
| Icons      | lucide-react                              |

## Getting started

Requires **Node.js 18.17+** (Node 20 recommended), npm, and a Postgres
database — the schema targets Postgres (see "Deploying to Vercel" below
for hosting; for local development, either point at a Vercel Postgres
database via `vercel env pull .env`, or run Postgres locally, e.g.
`docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`.

```bash
# 1. Install dependencies
npm install

# 2. Set POSTGRES_PRISMA_URL and POSTGRES_URL_NON_POOLING in .env
#    (see .env.example), then create the tables:
npm run db:push

# 3. (Optional) seed a sample customer + quotation
npm run db:seed

# 4. Start the dev server
npm run dev
```

Open **http://localhost:3000**.

Login is via Google Workspace only — there's no username/password system.
Set `GOOGLE_OAUTH_CLIENT_ID` and `GOOGLE_OAUTH_CLIENT_SECRET` in `.env`
before starting the app (see `.env.example` for the full Google Cloud
Console setup steps); without them, nobody can log in and the login page
will say so.

You'll be sent to `/login` on first run. Since there are no staff accounts
yet, the very first person to sign in with Google becomes the first
account automatically. After that, add teammates from **Settings → Staff
accounts** — just their work email, no password to set — before they can
sign in; an unrecognized Google account is turned away with a clear
message once the first account exists.

Set `AUTH_SECRET` in `.env` before deploying anywhere real — it signs the
login session cookie. Without it, sessions fall back to a hardcoded
development-only value. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

If you're updating an existing install to a version that adds a new table
or column, just re-run `npm run db:push` — it's non-destructive for
additive schema changes, but back up first if you're ever unsure.

## Settings page

Visit **Settings** in the sidebar (`/settings`) to configure, from the app
itself — stored in the database, no redeploy needed:

- **Google Drive sync** — the Shared Drive (or folder inside one) ID that
  generated quotation/invoice/receipt PDFs are synced into. Overrides the
  `GOOGLE_DRIVE_ROOT_FOLDER_ID` env var when set; leave blank to keep using
  the env var. See `.env.example` for how to set up the underlying Google
  Cloud service account and Shared Drive — the Settings page only configures
  which folder to use, not the credentials.
- **Company branding** — company name, logo (uploaded as an image, resized
  and stored as a PNG data URL), and website. These override the matching
  fields on `COMPANY` in `src/lib/company.ts` wherever they're set, and show
  up on every exported PDF and in the header/footer of every outgoing email
  (the website link appears at the bottom of every email). Leave a field
  blank to fall back to the code default.
- **Email CC** — turn standing CC'ing on/off, and edit the comma/newline
  separated list of addresses CC'd on every outgoing quotation, invoice,
  and notification email.

All three are read through helpers in `src/lib/appSettings.ts`
(`getEffectiveDriveFolderId`, `getEffectiveCompany`, `getEffectiveCc`) — the
rest of the app never talks to the `Setting` table directly.

## Personalizing the PDF (contact, banking, currency)

The Settings page (above) covers company name, logo, and website. Everything
else on the letterhead is still edited in `src/lib/company.ts`:

- `currency` / `currencyLocale` — used everywhere amounts are shown
  (defaults: HKD / en-HK, e.g. "HK$3,200").
- `contact` — sales name, title, tel, and email for the **Contact
  Information** section.
- `banking` — account name, bank, branch, account type, account number, and
  SWIFT code for the **Banking Information** section.

Every exported PDF reads from this file, merged with any Settings-page
overrides.

## Project structure

```
prisma/
  schema.prisma          Quotation, QuotationItem, Invoice, InvoiceItem, PresetItem, Setting models
  seed.js                 Sample data
src/
  app/
    layout.tsx              Bare document shell (fonts, globals) — no staff nav
    (app)/                   Route group: the internal staff app
      layout.tsx               Sidebar + Topbar chrome for everything below
      page.tsx                 Dashboard
      quotations/              List / new / detail / edit
      invoices/                List / new / detail / edit
      items/                   Item library (manage preset items)
      settings/                Settings page (Drive folder, branding, CC)
    sign/[token]/            Public quotation signing page (no login, no
                            Sidebar/Topbar — sibling of (app), not inside it)
    api/
      quotations/             CRUD + /convert (quotation -> invoice) + /pdf + /email
      invoices/               CRUD + /pdf + /email
      preset-items/            CRUD for the item library
      settings/                GET/PUT for the Settings page
      public/sign/[token]/     Public (token-authenticated) GET/POST + /pdf —
                              fetch, sign, and download, no login required
      dashboard/               Summary stats
  components/               Forms, line-item editor, preset manager, settings
                            form, signature pads (staff + public), send-email
                            modal, copy-link button, status badges, etc.
  lib/
    prisma.ts               Prisma client singleton
    calculations.ts         Line totals, subtotal/tax/total, currency/date formatting
    document-helpers.ts     Shared request-body normalization for API routes
    settings.ts             Standardized Terms & Reminder templates, payment-due
                            rendering, email defaults + validation (single source
                            of truth)
    appSettings.ts          Settings-page-backed config: Drive folder id, company
                            branding, and CC list, plus the getEffective* helpers
                            everything else reads through
    signing.ts              Token generation, signing-link building, IP capture
    publicQuotation.ts       Token-scoped read-only quotation lookup (shared by
                            the public API and the signing page's server render)
    signatureImage.ts        Typed-name-to-handwriting-font PNG rendering
    mailer.ts               Nodemailer SMTP transport + email signature/footer
                            (company branding + CC pulled from appSettings.ts)
    numbering.ts            Sequential QT-YYYY-#### / INV-YYYY-#### numbering
    company.ts              Your business details for the PDF letterhead —
                            name/logo/website/CC defaults, overridable from
                            the Settings page (see appSettings.ts)
    pdf/DocumentPdf.tsx     Shared react-pdf template for quotations & invoices
    pdf/build.ts            Server-side PDF builder shared by /pdf and /email routes
  types/index.ts             Shared TypeScript types
```

## Online quotation e-signature

Every quotation gets a random `signingToken` (192 bits, URL-safe) — generated
at creation, or lazily backfilled the first time it's needed (e.g. quotations
created before this feature shipped). The token is the only access control
for the public flow; there's no login.

**Flow:**
1. Staff clicks **Send email** on a quotation. The email includes a "Review &
   Sign Online" button linking to `/sign/{token}`, plus the PDF as usual.
   Staff can also grab the same link directly with **Copy signing link** on
   the quotation detail page, without sending an email.
2. The client opens `/sign/{token}` — a standalone page (no staff navigation)
   showing the quotation read-only: customer details, items, totals,
   reminder, and terms, matching the PDF.
3. The client draws a signature (mouse/touch) or types their name to render
   it in a handwriting font, enters their full name and email, and clicks
   **Accept & Sign**.
4. The server validates the signature/name/email, captures the request IP,
   and — in one transaction — saves the signature image, signer name/email,
   timestamp, and IP on the quotation and flips its status to `ACCEPTED`.
   The same token can never be used to sign again (checked server-side on
   every submit, independent of the UI).
5. The quotation PDF is regenerated (now embedding the signature in the
   "Agree & Accepted" block) and emailed to both the client and HR Plus.
6. The client sees a success page in place of the form; revisiting the same
   link later shows the same read-only "already signed" summary instead of
   the form.

Because `/sign/[token]` is a sibling of the `(app)` route group rather than a
child of it, it renders with only the bare root layout — none of the staff
Sidebar/Topbar — while still sharing the same fonts, Tailwind theme, and
`card`/`btn` utility classes for a consistent look.

## Email setup

The "Send email" feature (and the signed-quotation notification) uses SMTP
via [nodemailer](https://nodemailer.com/). Copy `.env.example` to `.env` and
fill in your SMTP credentials:

```
SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
```

Optionally set `NEXT_PUBLIC_APP_URL` (e.g. `https://quotes.hrplus.info`) so
signing links use your production domain instead of the incoming request's
own host — useful behind certain proxies/load balancers.

Until SMTP is set, the send-email modal reports that email is not configured
rather than failing silently; signing itself still succeeds even if the
follow-up notification email fails to send (the failure is reported back but
doesn't undo the signature).

## Notes on the data model

- Quotation and Invoice numbers are sequential per year (`QT-2026-0001`,
  `INV-2026-0001`), computed by scanning existing numbers for the current year
  — no separate counter table needed.
- Converting a quotation creates a new `Invoice` row linked via
  `Invoice.quotationId` (unique, one invoice per quotation), copies the
  customer details and items (including unit and image), and flips the
  quotation's status to `CONVERTED`, after which it becomes read-only.
- Customer details live directly on each quotation/invoice (no separate
  customer table), so editing one document never changes another.
- Line-item `unit` is a free-text display label; totals are always
  quantity × unit price regardless of unit.
- Every quotation/invoice stores `paymentDueDays` (default 30), `reminder`,
  and `terms`; new documents are pre-filled from the standardized templates in
  `src/lib/settings.ts`, and the payment window is substituted into the terms.
- Invoices store `signatureData` (PNG data URL), `signatureName`, and
  `signedAt` for HR Plus's own invoice e-signature (captured in the app by
  staff). Quotations separately store `signingToken` (unique, for the public
  link), `signatureData`, `signerName`, `signerEmail`, `signedAt`, and
  `signedIp` for the client's online signature — the two features are
  independent even though the field names overlap.
- A quotation is considered signed once `signedAt` is set; the public sign
  API checks this before accepting a submission and returns 409 if it's
  already set, so a token can never be used to sign twice.
- All monetary math (line amount, subtotal, discount, tax, total) lives in
  `src/lib/calculations.ts` and is used identically by the API, the on-screen
  editor, and the PDF renderer, so the three never disagree.
- `Setting` is a single-row table (fixed id `"singleton"`) backing the
  Settings page — treat it as a config blob rather than a normal per-record
  model. It's created lazily on first save; before that, `getSettings()`
  returns empty defaults so the rest of the app behaves exactly as it did
  before the Settings page existed.

## Scripts

| Command             | Purpose                                  |
|----------------------|--------------------------------------------|
| `npm run dev`         | Start the dev server                      |
| `npm run build`       | Production build                          |
| `npm run start`       | Run the production build                  |
| `npm run db:push`     | Sync Prisma schema to the Postgres database |
| `npm run db:seed`     | Insert a sample customer + quotation      |
| `npm run db:studio`   | Open Prisma Studio to browse the database |

## Deploying to Vercel + Vercel Postgres

This app runs on Postgres (see `prisma/schema.prisma`) specifically so it
can be hosted on Vercel, whose serverless functions can't use a local
SQLite file. Vercel Postgres is Neon under the hood, sold through Vercel's
marketplace — real Postgres, so nothing here is Vercel-proprietary.

**1. Push your code to a Git repo** (GitHub/GitLab/Bitbucket) — Vercel
deploys from a repo, not a local folder.

**2. Import the project on Vercel.** [vercel.com/new](https://vercel.com/new) →
pick the repo → Vercel auto-detects Next.js, no config changes needed.
Don't click "Deploy" yet — add the database first (step 3), since the app
won't build/run correctly without it.

**3. Add a Postgres database.** In the project → **Storage** tab → **Create
Database** → **Postgres** (Neon). Once created, go to **.env.local** tab
and connect it to your project — this automatically injects
`POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` (among others) into
your project's environment variables. You don't set these by hand.

**4. Add the rest of the environment variables** (Project → Settings →
Environment Variables) — see `.env.example` for what each one does:
- `AUTH_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`
- `NEXT_PUBLIC_APP_URL` — your production URL, e.g. `https://yourdomain.com`
  (or the `*.vercel.app` URL if you haven't attached a custom domain yet)
- SMTP settings, if you want outgoing email
- Google Drive settings, if you want PDF sync

**5. Push the schema to the new database.** Locally:
```bash
npm i -g vercel        # if you don't have the CLI yet
vercel link            # connect this folder to the Vercel project
vercel env pull .env    # pulls real POSTGRES_* values down locally
npx prisma db push      # creates all the tables on the real database
```
Do this once before your first real deploy, and again any time
`schema.prisma` changes afterward — `db push` is non-destructive for
additive changes (new tables/columns), but back up first if you're ever
unsure.

**6. Deploy.** Push to your repo's main branch (or click **Deploy** in the
Vercel dashboard) — every push auto-deploys.

**7. Update the Google OAuth redirect URI.** In Google Cloud Console →
your OAuth client → add
`https://yourdomain.com/api/auth/google/callback` (or the `*.vercel.app`
URL) as an Authorized redirect URI. Login won't work on the new domain
until this matches exactly.

**8. Sign in.** Visit the live site — since no accounts exist yet, the
first person to sign in with Google becomes the first account
automatically. Add teammates afterward from Settings → Staff accounts.

**9. Connect your custom domain**, if you have one (Project → Settings →
Domains) — add the DNS records it gives you at your domain's registrar
(e.g. Wix's DNS settings), then repeat step 7 for the final domain.

