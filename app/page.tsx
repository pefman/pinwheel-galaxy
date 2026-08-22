"use client";

import { useState } from "react";
import StarField from "@/components/StarField";

export default function Home() {
  const [gravity, setGravity] = useState(true);

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
        </div>
      </nav>

      {/* Hero with the interactive starfield */}
      <section className="relative flex min-h-screen items-center justify-center px-6">
        <StarField active={gravity} />

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
            own. Move your cursor — the stars lean into your gravity well.
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

        {/* Gravity-well control */}
        <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2">
          <div className="glass flex items-center gap-3 rounded-full px-4 py-2 text-sm">
            <span className="px-1 text-white/60">Move your cursor • click to pulse</span>
            <button
              onClick={() => setGravity((g) => !g)}
              aria-pressed={gravity}
              className={`relative rounded-full px-3 py-1 font-medium transition-colors ${
                gravity ? "text-white" : "text-white/40"
              }`}
              style={{ backgroundColor: gravity ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.1)" }}
            >
              Gravity Well: {gravity ? "On" : "Off"}
            </button>
          </div>
        </div>
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
        Built and evolved inside a Multica workspace · Pinwheel Galaxy
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
