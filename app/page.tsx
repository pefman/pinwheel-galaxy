"use client";

import { useState } from "react";
import StarField from "@/components/StarField";
import GalaxyDock from "@/components/GalaxyDock";
import { useGalaxyParams } from "@/lib/useGalaxyParams";

// "Report a bug" sends visitors straight to a pre-filled GitHub issue so bugs
// land in the tracker where the autopilot picks them up. The body is a small
// template that guides the reporter without letting them dictate the fix.
const BUG_REPORT_URL = (() => {
  const base = "https://github.com/pefman/pinwheel-galaxy/issues/new";
  const params = new URLSearchParams();
  params.set("title", "[Bug] ");
  params.set(
    "body",
      "**Describe the bug**\n" +
        "A clear and concise description of what is wrong.\n\n" +
        "**To reproduce**\n" +
        "1. Go to '...'\n" +
        "2. Click on '...'\n" +
        "3. See error\n\n" +
        "**Expected behaviour**\n" +
        "What you expected to happen.\n\n" +
        "**Environment**\n" +
        "- Browser:\n" +
        "- Device / viewport:\n" +
        "- Screenshot (if applicable):",
  );
  return `${base}?${params.toString()}`;
})();

export default function Home() {
  const { config, gravity, zoom, applyConfig, toggleGravity, shuffle, setZoom, shareQuery } =
    useGalaxyParams();
  const [constellations, setConstellations] = useState(false);
  const [nebula, setNebula] = useState(false);
  const [shooting, setShooting] = useState(false);
  const [zoomEnabled, setZoomEnabled] = useState(false);
  const [depth, setDepth] = useState(false);
  const [variable, setVariable] = useState(false);
  const [comet, setComet] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Navigation */}
      <nav className="glass fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="inline-block h-3 w-3 rotate-45 rounded-sm bg-gradient-to-br from-cosmos-violet to-cosmos-cyan" />
          <span className="text-gradient">Pinwheel Galaxy</span>
        </div>
        <div className="hidden items-center gap-6 text-sm text-white/60 md:flex">
          <a href="#features" className="transition-colors hover:text-white">
            Features
          </a>
          <a
            href="https://github.com/pefman/pinwheel-galaxy"
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white"
          >
            Source
          </a>
          <a
            href={BUG_REPORT_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 transition-colors hover:text-white"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4 fill-current"
              viewBox="0 0 16 16"
            >
              <path d="8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
              <path
                fill-rule="evenodd"
                d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"
              />
            </svg>
            Report a bug
          </a>
        </div>
      </nav>

      {/* Hero with the interactive starfield */}
      <section className="relative flex min-h-screen items-center justify-center px-6">
        <StarField
          active={gravity}
          constellation={constellations}
          nebula={nebula}
          shooting={shooting}
          zoomEnabled={zoomEnabled}
          depthMode={depth}
          variableMode={variable}
          onZoom={setZoom}
        />

        <div className="relative z-10 max-w-3xl text-center">
          <p className="animate-fade-up opacity-0 animation-delay-100 text-sm font-medium uppercase tracking-[0.3em] text-cosmos-cyan">
            An ever-evolving product
          </p>
          <h1 className="animate-fade-up opacity-0 animation-delay-200 mt-4 font-display text-5xl font-bold leading-[1.05] sm:text-7xl">
            A galaxy that{" "}
            <span className="text-gradient">keeps evolving</span>
          </h1>
          <p className="animate-fade-up opacity-0 animation-delay-300 mx-auto mt-6 max-w-xl text-lg text-white/70">
            Pinwheel Galaxy is a living website that ships new features on its
            own. Move your cursor — the stars lean into your gravity well. Spin
            up your own galaxy below; the URL is shareable.
          </p>

          <div className="animate-fade-up opacity-0 animation-delay-400 mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="#features"
              className="cosmos-glow rounded-full px-6 py-3 font-semibold text-white transition-transform hover:scale-105"
            >
              Explore the galaxy
            </a>
          </div>
        </div>

        {/* Galaxy control dock — tune theme, arms, spin, stars + gravity */}
        <GalaxyDock
          config={config}
          gravity={gravity}
          applyConfig={applyConfig}
          toggleGravity={toggleGravity}
          shuffle={shuffle}
          label={shareQuery}
          environment={[
            { label: "Nebula", active: nebula, onToggle: () => setNebula((n) => !n), color: "rgba(168,85,247,0.7)" },
            { label: "Constellations", active: constellations, onToggle: () => setConstellations((c) => !c), color: "rgba(56,189,248,0.7)" },
            { label: "Shooting Stars", active: shooting, onToggle: () => setShooting((s) => !s), color: "rgba(167,139,250,0.7)" },
            { label: "Zoom", active: zoomEnabled, onToggle: () => setZoomEnabled((z) => !z), color: "rgba(34,211,238,0.7)" },
            { label: "Depth", active: depth, onToggle: () => setDepth((d) => !d), color: "rgba(132,204,227,0.7)" },
            { label: "Variable Stars", active: variable, onToggle: () => setVariable((v) => !v), color: "rgba(250,204,21,0.75)" },
            { label: "Comet", active: comet, onToggle: () => setComet((c) => !c), color: "rgba(134,239,233,0.85)" },
          ]}
        />
      </section>

      {/* Features */}
      <section id="features" className="relative mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-display text-3xl font-bold sm:text-4xl">
          What is <span className="text-gradient">Pinwheel Galaxy</span>?
        </h2>
        <p className="mt-4 max-w-2xl text-white/60">
          A website run by AI agents that never stop improving it. Every cycle
          ships one focused, documented feature — then rolls on to the next.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <FeatureCard
            title="Autonomous evolution"
            body="A scheduled autopilot opens a new feature every cycle, researches, builds, deploys, and documents it."
          />
          <FeatureCard
            title="Additive by design"
            body="Each feature is small, non-breaking, and layered on top of the last — the product only ever gets richer."
          />
          <FeatureCard
            title="Live on Vercel"
            body="Every change ships to a production URL the moment it is ready, so the galaxy is always observable."
          />
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10 text-center text-sm text-white/40">
        <div className="flex flex-col items-center gap-2">
          <span>Built and evolved inside a Multica workspace · Pinwheel Galaxy</span>
          <a
            href={BUG_REPORT_URL}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-white/70"
          >
            Report a bug →
          </a>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="cosmos-glow rounded-2xl p-6">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-white/60">{body}</p>
    </div>
  );
}
