import type { Metadata } from "next";

// Insights — a single, on-brand content-marketing post. This page is a server
// component, so its content is in the initial HTML (good for crawlers on a
// client-rendered SPA) and doubles as the site's first ever content asset:
// the very "content marketing" recommendation it publishes.
//
// It answers PINW-53: a prioritized, actionable plan for driving traffic to
// Pinwheel Galaxy. Quick wins first, long-term plays second, measurement noted.

export const metadata: Metadata = {
  title: "Insights — how we drive traffic to Pinwheel Galaxy",
  description:
    "A prioritized, actionable growth plan for an ever-evolving generative-art site: SEO quick wins, content, communities, launch tactics, and measurement.",
  alternates: {
    canonical: "https://pinwheel-galaxy.vercel.app/insights",
  },
};

const NAV = (
  <nav className="glass fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-4 md:px-10">
    <a href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
      <span className="inline-block h-3 w-3 rotate-45 rounded-sm bg-gradient-to-br from-cosmos-violet to-cosmos-cyan" />
      <span className="text-gradient">Pinwheel Galaxy</span>
    </a>
    <div className="flex items-center gap-6 text-sm text-white/60">
      <a href="/" className="transition-colors hover:text-white">
        The galaxy
      </a>
      <a href="#plan" className="transition-colors hover:text-white">
        Growth plan
      </a>
    </div>
  </nav>
);

export default function Insights() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {NAV}

      <header className="relative mx-auto max-w-3xl px-6 py-24">
        <p className="animate-fade-up opacity-0 animation-delay-100 text-sm font-medium uppercase tracking-[0.3em] text-cosmos-cyan">
          Insights · Growth
        </p>
        <h1 className="animate-fade-up opacity-0 animation-delay-200 mt-4 font-display text-4xl font-bold leading-[1.08] sm:text-6xl">
          How we drive traffic to an{" "}
          <span className="text-gradient">ever-evolving</span> site
        </h1>
        <p className="animate-fade-up opacity-0 animation-delay-300 mt-6 max-w-2xl text-lg text-white/70">
          Pinwheel Galaxy is a live, AI-evolved generative-art site with no
          marketing budget and no ad spend. This is the prioritized, actionable
          plan for getting the right people to visit it — quick wins first,
          long-term plays second.
        </p>
      </header>

      <section id="plan" className="relative mx-auto max-w-3xl px-6 pb-24">
        <Plan />
      </section>

      <footer className="border-t border-white/10 px-6 py-10 text-center text-sm text-white/40">
        <a href="/" className="transition-colors hover:text-white/70">
          ← Back to the galaxy
        </a>
      </footer>
    </main>
  );
}

function Section({
  id,
  label,
  title,
}: {
  id: string;
  label: string;
  title: string;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-cosmos-cyan">
        {label}
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}

function Plan() {
  return (
    <div className="space-y-16">
      <Section
        id="quick-wins"
        label="Phase 1 · do this week"
        title="Quick wins"
      />
      <QuickWins />

      <Section
        id="long-term"
        label="Phase 2 · weeks 2–8"
        title="Long-term plays"
      />
      <LongTerm />

      <Section
        id="measurement"
        label="Phase 3 · already live"
        title="Measurement"
      />
      <Measurement />

      <div className="cosmos-glow rounded-2xl p-6 sm:p-8">
        <h3 className="font-display text-xl font-semibold">The one-paragraph version</h3>
        <p className="mt-3 text-white/70">
          Ship the SEO quick wins now — they are free, non-breaking, and improve
          discoverability on every future cycle. Then publish one genuinely
          useful craft post a month (content marketing compounds). Then make one
          prepared launch (Show HN first — the audience is exactly here) once a
          meaningful milestone lands. Measurement is already handled by Vercel
          Web Analytics, so every move is measurable from day one.
        </p>
      </div>
    </div>
  );
}

function Row({
  impact,
  effort,
  title,
  body,
}: {
  impact: "High" | "Medium" | "Already done";
  effort: "Minutes" | "Hours" | "Days";
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <span className="ml-auto rounded-full border border-cosmos-cyan/30 px-2.5 py-0.5 text-xs text-cosmos-cyan">
          {impact} impact · {effort}
        </span>
      </div>
      <p className="mt-2 text-sm text-white/65">{body}</p>
    </div>
  );
}

function QuickWins() {
  return (
    <div className="space-y-4">
      <Row
        impact="High"
        effort="Minutes"
        title="Add structured data (JSON-LD)"
        body={
          <>
            Mark the site up as{" "}
            <span className="text-white/90">
              SoftwareApplication + CreativeWork
            </span>
            . Search engines can otherwise only see a blank SPA shell. A
            <code className="text-white/80">next/script</code> JSON-LD block
            costs nothing and gives Google a clear product definition, version,
            and homepage. Highest-leverage SEO change on the board.
          </>
        }
      />
      <Row
        impact="High"
        effort="Minutes"
        title="Publish a dynamic sitemap.xml"
        body={
          <>
            robots.txt already exists and points to agent files, but there is no
            sitemap listing the pages crawlers should index. A generated
            <code className="text-white/80"> /sitemap.xml </code>
            (root + insights) closes that gap. One line in the build.
          </>
        }
      />
      <Row
        impact="Medium"
        effort="Hours"
        title="Own the core keywords"
        body={
          <>
            Set page <code className="text-white/80">title</code> and{" "}
            <code className="text-white/80">description</code> around the terms
            people actually search —{" "}
            <span className="text-white/90">
              “interactive generative galaxy web app, WebGL starfield, shareable”
            </span>
            . Add a meta{" "}
            <code className="text-white/80">keywords</code> set and an Open
            Graph / Twitter card so shared links render a rich preview.
          </>
        }
      />
      <Row
        impact="Medium"
        effort="Hours"
        title="Claim the free, high-authority directories"
        body={
          <>
            List the site on GitHub (stars), Product Hunt, alternativeTo,
            Chrome Web Store “web apps”, and creative-coding directories. These
            are backlinks that also surface in the very searches your audience
            runs. Zero ongoing cost.
          </>
        }
      />
    </div>
  );
}

function LongTerm() {
  return (
    <div className="space-y-4">
      <Row
        impact="High"
        effort="Days"
        title="Publish one craft post a month (content marketing)"
        body={
          <>
            Content is the single highest-compounding channel for a developer
            audience. Post a genuinely useful, on-brand piece a month — e.g.
            “How a gravity-well starfield is built in pure Canvas”, or a
            breakdown of how the site evolves itself. Tutorials earn backlinks
            and rank for years; a tweet lasts a day. This page is the first of
            many.
          </>
        }
      />
      <Row
        impact="High"
        effort="Hours"
        title="Show HN as the primary launch channel"
        body={
          <>
            The target audience — creative coders, WebGL/Three.js makers,
            generative-art collectors — lives on Hacker News. A well-titled{" "}
            <span className="text-white/90">Show HN</span> with a short demo
            clip is the highest-ROI launch this product can do. Prepare the
            post in advance; ship it at a milestone, not on a calendar.
          </>
        }
      />
      <Row
        impact="Medium"
        effort="Hours"
        title="Post the work where makers share it"
        body={
          <>
            Share finished cycles where the audience actually gathers:{" "}
            <span className="text-white/90">
              r/creativecoding, r/shaders, r/Generative, r/webdev
            </span>
            , the shadertoy / OpenProcessing communities, and X with a demo
            video. Show the process, not just the product — makers engage with
            “how was that made?”.
          </>
        }
      />
      <Row
        impact="Medium"
        effort="Days"
        title="One prepared Product Hunt launch at a milestone"
        body={
          <>
            Once a notable feature lands (say v1.0), run a single Product Hunt
            launch with gallery-quality visuals and a maker comment full of
            work made with the tool. Visuals are the proof for a design
            audience — prep them before launch day.
          </>
        }
      />
    </div>
  );
}

function Measurement() {
  return (
    <div className="cosmos-glow rounded-2xl p-6 sm:p-8">
      <h3 className="font-display text-xl font-semibold">
        Measurement — already live
      </h3>
      <p className="mt-3 text-white/70">
        Site statistics are handled by{" "}
        <span className="text-white/90">Vercel Web Analytics</span>, the
        no-code, built-in analytics already provisioned for this project —
        traffic, retention, referrers, and Core Web Vitals. No competing
        analytics (GA4, Plausible, self-hosted) should be added. To attribute
        traffic from each play, add UTM parameters to every external link (e.g.{" "}
        <code className="text-white/80">?utm_source=hackernews</code>) and watch
        the referrer report. That is enough to know what is working from week one.
      </p>
    </div>
  );
}
