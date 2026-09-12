# SUTRA Judge Flow — End-to-End Test Guide

## Prerequisites
1. Backend running on `http://localhost:3015`
2. Frontend running on `http://localhost:3000`
3. Database has `judicial_cases` table (run SQL migration if not)

---

## Step 1: Register as Honourable Judiciary

1. Go to `http://localhost:3000/register`
2. Select **"Honourable Judiciary"** radio button
3. You should see: *"Judicial Case Intelligence — upload & analyze case files"*
4. Enter email and password (min 8 chars, uppercase, lowercase, digit, special char)
5. Click **Register**
6. You'll be redirected to `/verify-email`

## Step 2: Verify Email

1. On `/verify-email`, click **"Resend OTP"**
2. In dev mode, the OTP code appears in a yellow box
3. Enter the 6-digit code
4. Click **Verify**
5. You'll be redirected to `/login`

## Step 3: Login as Judge

1. Go to `http://localhost:3000/login`
2. Select **"Honourable Judiciary"** radio button
3. Enter your email and password
4. Click **Login**
5. You should land on `/cases` — the Judicial Cases list

## Step 4: Create a New Case

1. Click **"+ New Case"** button
2. Enter a case title (e.g. "State vs. Rajesh Kumar")
3. Enter a case number (e.g. "CRL/123/2026")
4. Click **"Create Case"**
5. The case appears in the list with status "Uploaded"

## Step 5: Open the Case

1. Click **"Open Case →"** on the case card
2. You'll land on `/cases/[id]` — the case detail workspace
3. You should see:
   - Case title and number
   - PDF upload area (dashed border)
   - Tabs: Case Brief, Parties & Accused, Witnesses, Evidence, Chronology, Legal Research

## Step 6: Upload Case PDF

1. Click the upload area or drag a PDF onto it
2. The PDF filename appears with a "Replace" button
3. Tabs become active below the PDF info

## Step 7: View Analysis Tabs

Each tab shows data extracted by AI (coming in Phase 2):

- **Case Brief** — background, key issues, current stage
- **Parties & Accused** — party names, roles, allegations
- **Witnesses** — names, statements, page references
- **Evidence** — classified evidence items with page refs
- **Chronology** — timeline of events
- **Legal Research** — acts, sections, precedents

Currently all tabs show "No data yet" empty states — AI integration comes next.

## Step 8: Delete the Case

1. Click the trash icon on the case card (list page) or top-right of detail page
2. Confirm the delete
3. Case is removed from the list

---

## What Mediator Sees (Different Flow)

1. Register/Login as **"Legal Practitioner"**
2. You land on `/mediation` — Mediation Sessions
3. Create sessions with Party A vs Party B
4. Upload documents per party
5. Run AI comparative analysis
6. This is completely separate from the judge flow

---

## Test Checklist

- [ ] Register as Judiciary → verify email → login → lands on `/cases`
- [ ] Register as Practitioner → verify email → login → lands on `/mediation`
- [ ] Create case → appears in list
- [ ] Open case → see workspace with tabs
- [ ] Upload PDF → filename shows, tabs activate
- [ ] Delete case → removed from list
- [ ] Profile page → edit and save details
- [ ] Sign out → redirects to `/login`
- [ ] TopBar shows "Cases" for judge, "Mediation" for practitioner
