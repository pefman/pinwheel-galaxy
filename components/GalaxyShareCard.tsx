"use client";

/**
 * GalaxyShareCard — "Shareable Galaxy Prints".
 *
 * Turns the live starfield canvas into a framed, branded, shareable image, all
 * client-side and with zero dependencies:
 *   1. capture the current galaxy frame from the starfield canvas,
 *   2. composite it into a 1080×1350 portrait card (cosmos glow + the captured
 *      galaxy cover-cropped into a rounded frame + a branded footer with the
 *      shareable deep link),
 *   3. offer Download PNG, native Share (Web Share API, with a copy-link
 *      fallback), and Copy deep link.
 *
 * The composition geometry is delegated to the pure, tested `exportCard`
 * module so the visual result is always driven by tested logic.
 */

import { useCallback, useRef, useState } from "react";
import {
  BRAND_NAME,
  CARD,
  CARD_BG,
  CARD_GLOW_BOTTOM,
  CARD_GLOW_TOP,
  computeCover,
  describePrint,
  deepLink,
  imageWindow,
  wrapText,
} from "@/lib/exportCard";

type Status = "idle" | "rendering" | "ready" | "error";

const FONT = '"Space Grotesk", "Inter", system-ui, sans-serif';

/**
 * Draw the captured galaxy frame into the branded card and return the resulting
 * PNG data URL. All layout is sourced from `exportCard` so it stays testable.
 */
function renderCard(
  canvas: HTMLCanvasElement,
  capture: HTMLImageElement,
  description: string,
  deepLinkUrl: string,
): string {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context for the print card.");
  const { w, h } = { w: CARD.w, h: CARD.h };
  const dpr = 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 1. Background: a deep-cosmos fill with a soft violet→indigo glow rising
  //    from behind the frame, so the card reads as "galaxy" even when blank.
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(
    w / 2,
    (CARD.h * 0.62) / 2 + CARD.margin,
    20,
    w / 2,
    (CARD.h * 0.62) / 2 + CARD.margin,
    w * 0.75,
  );
  glow.addColorStop(0, CARD_GLOW_TOP);
  glow.addColorStop(1, CARD_GLOW_BOTTOM);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // 2. The captured galaxy, cover-fit into the image window and clipped to a
  //    rounded rectangle.
  const win = imageWindow();
  const fit =
    capture.width && capture.height
      ? computeCover(capture.width, capture.height, win.w, win.h)
      : { x: 0, y: 0, w: win.w, h: win.h };
  ctx.save();
  roundRect(ctx, win.x, win.y, win.w, win.h, CARD.radius);
  ctx.clip();
  if (capture.width && capture.height) {
    ctx.drawImage(capture, fit.x + win.x, fit.y + win.y, fit.w, fit.h);
  }
  ctx.restore();

  // A hairline frame around the image so it reads as a printed card.
  ctx.save();
  roundRect(ctx, win.x, win.y, win.w, win.h, CARD.radius);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.stroke();
  ctx.restore();

  // 3. Footer: brand mark + name, the galaxy description, and the shareable
  //    deep link (wrapped). All vertically centred in the space below the frame.
  const footerTop = win.y + win.h + 46;
  const startX = CARD.margin;
  const maxW = w - CARD.margin * 2;
  ctx.textBaseline = "top";

  // Brand mark + name.
  ctx.font = `600 40px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(BRAND_NAME, startX, footerTop);

  // Description.
  const desc = describePrint(description, "");
  ctx.font = `400 30px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  const descLines = wrapText(desc, maxW, (s) => ctx.measureText(s).width);
  const descY = footerTop + 56;
  descLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, startX, descY + i * 42);
  });

  // Deep link, wrapped, in a muted mono style.
  const linkY = descY + descLines.length * 42 + 36;
  ctx.font = `400 26px ui-monospace, "SF Mono", Menlo, monospace`;
  ctx.fillStyle = "rgba(167,139,250,0.95)";
  const linkLines = wrapText(deepLinkUrl, maxW, (s) => ctx.measureText(s).width);
  linkLines.slice(0, 3).forEach((line, i) => {
    ctx.fillText(line, startX, linkY + i * 36);
  });

  return canvas.toDataURL("image/png");
}

/** Draw a rounded-rectangle path (canvas has no built-in). */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/** Minimal stand-in for the parts of the capture we rely on. */
interface Capturable {
  width: number;
  height: number;
  toBlob: (
    cb: (b: Blob | null) => void,
    type?: string,
    quality?: number,
  ) => void;
}

export interface GalaxyShareCardProps {
  /** Returns the live starfield canvas (forwarded via `canvasRef`). */
  getCanvas: () => Capturable | null;
  /** The shareable deep link for the current galaxy. */
  deepLinkUrl: string;
  /** Human-readable galaxy description shown on the print. */
  description: string;
}

export default function GalaxyShareCard({
  getCanvas,
  deepLinkUrl,
  description,
}: GalaxyShareCardProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cardCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Lazily create the off-card canvas once (kept off-screen).
  const getCardCanvas = useCallback(() => {
    if (cardCanvasRef.current === null) {
      const c = document.createElement("canvas");
      c.width = CARD.w;
      c.height = CARD.h;
      c.style.position = "fixed";
      c.style.left = "-99999px";
      document.body.appendChild(c);
      cardCanvasRef.current = c;
    }
    return cardCanvasRef.current;
  }, []);

  const build = useCallback(() => {
    setStatus("rendering");
    const source = getCanvas();
    if (!source) {
      setStatus("error");
      return;
    }
    source.toBlob(
      (blob) => {
        if (!blob) {
          setStatus("error");
          return;
        }
        const img = new Image();
        img.onload = () => {
          const card = getCardCanvas();
          if (!card) {
            setStatus("error");
            return;
          }
          const ctx = card.getContext("2d");
          if (!ctx) {
            setStatus("error");
            return;
          }
          const dataUrl = renderCard(card, img, description, deepLinkUrl);
          setPreview(dataUrl);
          setStatus("ready");
        };
        img.onerror = () => setStatus("error");
        img.src = URL.createObjectURL(blob);
      },
      "image/png",
      1,
    );
  }, [getCanvas, getCardCanvas, description, deepLinkUrl]);

  // (Re)build the card whenever the overlay opens.
  const onOpen = useCallback(() => {
    setOpen(true);
    setPreview(null);
    setStatus("idle");
  }, []);

  const onClose = useCallback(() => {
    setOpen(false);
    setCopied(false);
  }, []);

  const download = useCallback(() => {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview;
    a.download = "pinwheel-galaxy.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [preview]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(deepLinkUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [deepLinkUrl]);

  const share = useCallback(async () => {
    const blob = await new Promise<Blob | null>((resolve) => {
      if (!preview) return resolve(null);
      fetch(preview)
        .then((r) => r.blob())
        .then(resolve)
        .catch(() => resolve(null));
    });
    const shareFiles = blob ? [new File([blob], "galaxy.png")] : [];
    const payload = {
      title: BRAND_NAME,
      text: description || "My Pinwheel Galaxy",
      files: shareFiles,
      url: deepLinkUrl,
    };
    // Native share: hand the image + the deep link to the OS share sheet.
    let shared = false;
    if (typeof navigator.canShare === "function" && navigator.canShare({ files: shareFiles })) {
      if (typeof navigator.share === "function") {
        await navigator.share(payload);
        shared = true;
      }
    }
    if (shared) {
      return;
    }
    // Fallback: nothing else to send but the link.
    await copyLink();
  }, [preview, description, deepLinkUrl, copyLink]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onOpen}
        aria-label="Share this galaxy as an image"
        title="Share this galaxy as an image"
        className="rounded-full px-3 py-1 font-medium text-white/80 transition-colors hover:bg-white/15 hover:text-white"
      >
        ✦ Share
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Share your galaxy"
        >
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-white/15 p-6 glass">
            <div className="flex w-full items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-white">
                Share your galaxy
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close share"
                className="rounded-md px-2 py-1 text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-white/55">
              {description || "Your galaxy"}
            </p>

            <button
              type="button"
              onClick={build}
              disabled={status === "rendering"}
              className="self-center rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              {status === "idle"
                ? "Create preview"
                : status === "rendering"
                  ? "Rendering…"
                  : status === "error"
                    ? "Couldn’t render — try again"
                    : "Render again"}
            </button>

            {preview && status === "ready" && (
              <>
                <img
                  src={preview}
                  alt="Your galaxy as a shareable print"
                  className="w-full max-w-xs rounded-2xl border border-white/10 shadow-2xl"
                />
                <div className="flex w-full flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={download}
                    className="cosmos-glow rounded-full px-4 py-2 font-semibold text-white transition-transform hover:scale-105"
                  >
                    Download PNG
                  </button>
                  <button
                    type="button"
                    onClick={share}
                    className="rounded-full border border-white/20 px-4 py-2 font-semibold text-white/80 transition-colors hover:text-white"
                  >
                    Share…
                  </button>
                  <button
                    type="button"
                    onClick={copyLink}
                    className="rounded-full border border-white/20 px-4 py-2 font-semibold text-white/80 transition-colors hover:text-white"
                  >
                    {copied ? "Link copied ✓" : "Copy link"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
