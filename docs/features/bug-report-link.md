## Bug Report Link — Straight to the GitHub Tracker

- **Date added:** 2026-08-22
- **Version:** 0.4.0
- **Status:** Shipped & live on Vercel — https://pinwheel-galaxy.vercel.app

### What + why

Visitors can now **report a bug in one click**. A "Report a bug" link appears in
the navigation bar and the footer; it opens a pre-filled GitHub "new issue" page
for this repo, so feedback lands directly in the issue tracker where the
autonomous bug-fixing autopilot picks it up. This closes the loop between the
live site and the agents that maintain it: see the "Bug-report feedback loop"
design in the pinned issue.

### How it works (high-level)

- A module-level constant `BUG_REPORT_URL` in `app/page.tsx` builds the GitHub
  new-issue URL with `URLSearchParams`: a `[Bug]` title stub and a small body
  template (describe → reproduce → expected → environment) that guides the
  reporter.
- The link opens in a new tab with `target="_blank" rel="noreferrer"`.
- The reporter **suggests** a problem; they never write or dictate the fix (the
  autopilot owns the fix — see the feedback-loop issue for the security model).

### Key files / components

- `app/page.tsx` — the `BUG_REPORT_URL` constant and the two link placements
  (nav + footer).
- `https://github.com/pefman/pinwheel-galaxy/issues/new` — the destination.

### User-facing behavior

- Click **Report a bug** in the top nav or the footer.
- A new GitHub issue form opens with a `[Bug] …` title and a structured body to
  fill in.
- Submit to file the report; the bug-fixing autopilot triages it on its next run.

### How to test / try it

1. `npm install` then `npm run build` and `npm start`.
2. Open the site.
3. Click **Report a bug** in the nav bar (and again in the footer).
4. Confirm the GitHub new-issue page opens with the `[Bug]` title and template
   body pre-filled.

### Known limitations / follow-ups

- The issue body template is inline; a repo-level `.github/ISSUE_TEMPLATE` file
  would give a richer, reusable form (possible follow-up).
- No in-site bug form — it defers entirely to GitHub, by design, so fixes live
  in the tracker.
