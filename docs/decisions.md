# Product Decisions

Stable decisions that future evolution cycles must respect. If a planned feature
conflicts with one of these, do it anyway only with an explicit override —
otherwise follow the decision as written.

---

## Analytics / site statistics — use Vercel Web Analytics (as-is)

- **Decided:** 2026-08-22
- **Owner decision:** Peter Frank
- **Scope:** basic traffic, retention, referrer, and web-vitals statistics.

**What:** Site statistics are handled by **Vercel Web Analytics**, the built-in,
no-code analytics already provisioned for this project. It is enabled by default
and collects automatically from every deployment.

**Why:** Zero code change, free on the Hobby tier, and already covering the
metrics that matter here (traffic, retention, referrers, Core Web Vitals — the
last one is useful because the hero is a heavy WebGL canvas).

**Rule for future cycles:** Do **NOT** add a competing analytics solution
(Plausible, Umami, Google Analytics / GA4, Mixpanel, self-hosted, etc.). Do not
add analytics script tags or a `next/script` analytics integration. Vercel Web
Analytics is the chosen and final solution for site statistics.

> Note: Vercel Web Analytics is a **distribution/marketing** concern, not a
> site *feature*. It does not belong in `FEATURES.md` and is out of scope for the
> creative Feature loop. It lives here so every run sees it.
