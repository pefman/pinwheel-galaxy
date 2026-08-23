"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import StarField from "@/components/StarField";
import GalaxyDock from "@/components/GalaxyDock";
import GalaxyShareCard from "@/components/GalaxyShareCard";
import { useGalaxyParams } from "@/lib/useGalaxyParams";
import { galaxyOfDay, dailyDeepLink, dayKey, DailyGalaxy } from "@/lib/galaxyOfDay";
import { useSoundscape, installSoundscapeGesture } from "@/lib/useSoundscape";
import { describeConfig } from "@/lib/galaxyPresets";
import { describeRecipe } from "@/lib/recipe";
import { deepLink, describePrint } from "@/lib/exportCard";
import {
  FULLSCREEN_SHORTCUT,
  fullscreenUrl,
  parseFullscreen,
} from "@/lib/fullscreen";

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

/**
 * Whether the browser Fullscreen API is available.
 *
 * Checked lazily — inside event handlers and effects, never during render —
 * so that the server render and the first client render produce identical
 * output. Reading `typeof document` while rendering would make the server
 * (`undefined`) and the client (`"object"`) diverge and break hydration.
 */
function fullscreenApiSupported(): boolean {
  return (
    typeof document !== "undefined" &&
    !!document.documentElement.requestFullscreen
  );
}

export default function Home() {
  const {
    config,
    gravity,
    zoom,
    recipe,
    applyConfig,
    toggleGravity,
    shuffle,
    toggle,
    setZoom,
    sound,
    toggleSound,
    shareQuery,
  } = useGalaxyParams();

  // Fullscreen mode for the interactive galaxy (PINW-62). Off by default; the
  // visitor can expand the starfield to fill the whole viewport and return to
  // the normal hero layout. The flag can also be pre-seeded via ?fullscreen=on.
  const [fullscreen, setFullscreen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Seed from the URL on mount (after hydration, so there is no SSR mismatch).
  useEffect(() => {
    if (parseFullscreen(new URLSearchParams(window.location.search).get("fullscreen"))) {
      setFullscreen(true);
    }
  }, []);

  const updateFullscreenUrl = (next: boolean) => {
    if (typeof window === "undefined") return;
    const url = fullscreenUrl(window.location.pathname, window.location.search, next);
    window.history.replaceState(null, "", url);
  };

  const enterFullscreen = () => {
    setFullscreen(true);
    const el = heroRef.current;
    if (el && fullscreenApiSupported()) {
      el.requestFullscreen?.().catch(() => {
        // Falling back to the chrome-less expanded layout below; the request
        // can be blocked (e.g. not user-triggered) and that is fine.
      });
    }
    updateFullscreenUrl(true);
  };

  const exitFullscreen = () => {
    setFullscreen(false);
    if (fullscreenApiSupported() && document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
    updateFullscreenUrl(false);
  };

  // Detect exits that we did not trigger ourselves (Escape key, browser UI).
  useEffect(() => {
    if (!fullscreenApiSupported()) return;
    const onChange = () => {
      if (document.fullscreenElement === null) {
        exitFullscreen();
      }
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Keyboard shortcut: press "f" (not while typing into a field) to toggle.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (
        e.key === FULLSCREEN_SHORTCUT &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        e.preventDefault();
        if (fullscreen) exitFullscreen();
        else enterFullscreen();
      }
      // When we are in the fallback (no browser Fullscreen API) layout, the
      // browser does not handle Escape for us, so exit manually.
      if (e.key === "Escape" && fullscreen && !fullscreenApiSupported()) {
        e.preventDefault();
        exitFullscreen();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  // The Cosmic Soundscape runtime: turns the live galaxy into sound. Muted by
  // default; audio starts on the first user gesture (see installSoundscapeGesture).
  useSoundscape(config, recipe, sound);
  installSoundscapeGesture();

  // Forward the live canvas element to the share card so it can capture and
  // export the current galaxy as a branded image.
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // The deep link for the current galaxy — the canonical share URL that the
  // exported card and the “Copy link” action both point back to.
  // Guarded for server-side rendering, where `window` is not defined.
  const deepLinkUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return deepLink("https://pinwheelgalaxy.com", "/", "");
    }
    return deepLink(window.location.origin, window.location.pathname, window.location.search);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Navigation */}
      <nav className="glass fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-4 md:px-10">
        <div className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="inline-block h-3 w-3 rotate-45 rounded-sm bg-gradient-to-br from-cosmos-violet to-cosmos-cyan" />
          <span className="text-gradient">Pinwheel Galaxy</span>
        </div>
        <div className="hidden items-center gap-6 text-sm text-white/60 md:flex">
          <a href="/insights" className="transition-colors hover:text-white">
            Insights
          </a>
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

      {/* Hero with the interactive starfield.

          In fullscreen mode (PINW-62) this section becomes the fullscreen target:
          it expands to fill the whole viewport (via the browser Fullscreen API
          where available, or the fixed inset-0 layout as a fallback) so the
          starfield fills the screen. The hero text is hidden for an immersive
          view; the control dock stays reachable and collapsible. */}
      <section
        ref={heroRef}
        data-fullscreen={fullscreen ? "" : undefined}
        className={[
          "relative flex items-center justify-center px-6",
          fullscreen
            ? "fixed inset-0 z-50 h-screen w-full bg-black/80"
            : "min-h-screen",
        ].join(" ")}
      >
        <StarField
          config={config}
          active={gravity}
          constellation={recipe.constellation}
          nebula={recipe.nebula}
          shooting={recipe.meteors}
          zoomEnabled={recipe.zoomMode}
          depthMode={recipe.depth}
          variableMode={recipe.variable}
          auroraMode={recipe.aurora}
          moonMode={recipe.moon}
          supernovaMode={recipe.supernova}
          distantMode={recipe.distant}
          blackHoleMode={recipe.blackHole}
          ringedGiantMode={recipe.ringedGiant}
          pulsarMode={recipe.pulsar}
          onZoom={setZoom}
          canvasRef={(el) => {
            canvasRef.current = el;
          }}
        />

        {/* The hero heading is hidden while the galaxy fills the screen, so
            fullscreen mode stays an immersive view of the starfield. */}
        {!fullscreen && (
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
        )}

        {/* Galaxy control dock — tune theme, arms, spin, stars + gravity */}
        <GalaxyDock
          config={config}
          gravity={gravity}
          applyConfig={applyConfig}
          toggleGravity={toggleGravity}
          shuffle={shuffle}
          label={shareQuery}
          fullscreen={fullscreen}
          onToggleFullscreen={fullscreen ? exitFullscreen : enterFullscreen}
          share={
            <GalaxyShareCard
              getCanvas={() => canvasRef.current}
              deepLinkUrl={deepLinkUrl}
              description={describePrint(describeConfig(config), describeRecipe(recipe))}
            />
          }
          environment={[
            { label: "Nebula", active: recipe.nebula, onToggle: () => toggle("nebula"), color: "rgba(168,85,247,0.7)" },
            { label: "Constellations", active: recipe.constellation, onToggle: () => toggle("constellation"), color: "rgba(56,189,248,0.7)" },
            { label: "Shooting Stars", active: recipe.meteors, onToggle: () => toggle("meteors"), color: "rgba(167,139,250,0.7)" },
            { label: "Zoom", active: recipe.zoomMode, onToggle: () => toggle("zoomMode"), color: "rgba(34,211,238,0.7)" },
            { label: "Depth", active: recipe.depth, onToggle: () => toggle("depth"), color: "rgba(132,204,227,0.7)" },
            { label: "Variable Stars", active: recipe.variable, onToggle: () => toggle("variable"), color: "rgba(250,204,21,0.75)" },
            { label: "Comet", active: recipe.comet, onToggle: () => toggle("comet"), color: "rgba(134,239,233,0.85)" },
            {
              label: "Sound",
              active: sound,
              onToggle: toggleSound,
              color: "rgba(167,139,250,0.85)",
            },
            {
              label: "Aurora",
              active: recipe.aurora,
              onToggle: () => toggle("aurora"),
              color: "rgba(52,211,153,0.7)",
            },
            {
              label: "Moon",
              active: recipe.moon,
              onToggle: () => toggle("moon"),
              color: "rgba(230,230,245,0.85)",
            },
            {
              label: "Supernovae",
              active: recipe.supernova,
              onToggle: () => toggle("supernova"),
              color: "rgba(150,190,255,0.9)",
            },
            {
              label: "Distant Galaxy",
              active: recipe.distant,
              onToggle: () => toggle("distant"),
              color: "rgba(180,150,255,0.85)",
            },
            {
              label: "Black Hole",
              active: recipe.blackHole,
              onToggle: () => toggle("blackHole"),
              color: "rgba(150,110,255,0.95)",
            },
            {
              label: "Ringed Giant",
              active: recipe.ringedGiant,
              onToggle: () => toggle("ringedGiant"),
              color: "rgba(240,190,90,0.9)",
            },
            {
              label: "Pulsar",
              active: recipe.pulsar,
              onToggle: () => toggle("pulsar"),
              color: "rgba(143,227,255,0.9)",
            },
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

      {/* Galaxy of the Day — a fresh, seeded galaxy that refreshes at local
          midnight. Fully client-side: the same calendar day always yields the
          same galaxy, and its deep link re-hydrates exactly (see lib/galaxyOfDay.ts). */}
      <GalaxyOfTheDay />

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

// Galaxy of the Day — a single fresh galaxy that refreshes once per calendar
// day. Deterministic and backend-free: the same day always yields the same
// galaxy, and its deep link re-hydrates the exact creation (lib/galaxyOfDay.ts).
function GalaxyOfTheDay() {
  const [today, setToday] = useState({ day: dayKey() });
  const [copied, setCopied] = useState(false);

  // Recompute at local midnight so the card flips to the new galaxy automatically.
  useEffect(() => {
    const tick = () => {
      const next = dayKey();
      if (next !== today.day) setToday({ day: next });
    };
    const now = Date.now();
    // Fire the first check at the next local midnight.
    const delay = 60_000 - (now % 60_000);
    const t1 = setTimeout(tick, delay);
    const t2 = setInterval(tick, 60_000);
    return () => {
      clearTimeout(t1);
      clearInterval(t2);
    };
  }, [today.day]);

  const daily: DailyGalaxy = useMemo(
    () => galaxyOfDay(new Date(today.day + "T00:00:00")),
    [today.day],
  );
  const link = useMemo(() => dailyDeepLink(today.day), [today.day]);

  const copyLink = async () => {
    const url = `${window.location.origin}${link}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is best-effort; fall back to leaving the value visible.
      setCopied(false);
    }
  };

  return (
    <section
      id="galaxy-of-the-day"
      className="relative mx-auto max-w-6xl px-6 py-16"
    >
      <div className="cosmos-glow rounded-2xl p-8 sm:p-10">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-cosmos-cyan">
              {daily.prompt.tag}
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              Galaxy of the <span className="text-gradient">Day</span>
            </h2>
            <p className="mt-1 text-white/50">{today.day}</p>
          </div>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/60">
            Fresh at local midnight
          </span>
        </div>

        <p className="mt-6 max-w-2xl text-white/70">
          {daily.prompt.text} Give it a try — or open the exact galaxy everyone
          is creating today.
        </p>

        <dl className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-white/60">
          <dt>Today&rsquo;s galaxy</dt>
          <dd className="font-medium text-white/90">{daily.label}</dd>
        </dl>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="cosmos-glow rounded-full px-6 py-2.5 font-semibold text-white transition-transform hover:scale-105"
          >
            Open today&rsquo;s galaxy
          </a>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-full border border-white/20 px-6 py-2.5 font-semibold text-white/80 transition-colors hover:text-white"
          >
            {copied ? "Link copied ✓" : "Copy shareable link"}
          </button>
        </div>
      </div>
    </section>
  );
}
