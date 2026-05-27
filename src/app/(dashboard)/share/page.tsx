"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Share2, ImageOff, ToggleLeft, ToggleRight, RefreshCw, Loader2,
} from "lucide-react";
import { useShareCardData } from "@/hooks/useShareCardData";
import { generateShareCard } from "@/lib/shareCard";
import { useToast } from "@/components/ui/Toast";

// ── Preview scale: display the 1080×1920 canvas at ~35% to fit the page ──────

const SCALE = 0.35;
const PREVIEW_W = Math.round(1080 * SCALE);
const PREVIEW_H = Math.round(1920 * SCALE);

export default function ShareCardPage() {
  const { loading, data } = useShareCardData();
  const [includePhoto, setIncludePhoto] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const toast = useToast();

  const effectiveData = data ? { ...data, includePhoto: includePhoto && !!data.progressPhotoUrl } : null;

  // Build preview blob → object URL
  const buildPreview = useCallback(async () => {
    if (!effectiveData) return;
    setPreviewLoading(true);
    try {
      const blob = await generateShareCard(effectiveData);
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    } catch {
      // Preview silently fails — user can still download
    } finally {
      setPreviewLoading(false);
    }
  }, [effectiveData]);

  // Generate preview whenever data or toggle changes
  useEffect(() => {
    if (!loading && data) {
      buildPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, includePhoto]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDownload() {
    if (!effectiveData) return;
    setGenerating(true);
    try {
      const blob = await generateShareCard(effectiveData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bulkos-progress-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Card downloaded — share it!");
    } catch {
      toast.error("Failed to generate card. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleShare() {
    if (!effectiveData) return;
    if (!navigator.share) {
      handleDownload();
      return;
    }
    setGenerating(true);
    try {
      const blob = await generateShareCard(effectiveData);
      const file = new File([blob], "bulkos-progress.png", { type: "image/png" });
      await navigator.share({ files: [file], title: "My BulkOS Progress" });
    } catch {
      // Share cancelled or unsupported — silently ignore
    } finally {
      setGenerating(false);
    }
  }

  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="min-h-screen bg-ivory px-4 py-8 sm:px-8">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-espresso">
            Share Your Progress
          </h1>
          <p className="mt-1 text-sm text-warm-gray">
            A single-tap progress card built for Instagram stories and social sharing.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ── Card Preview ─────────────────────────────────────────────────── */}
          <div className="flex-shrink-0 mx-auto lg:mx-0">
            <div
              className="relative rounded-2xl overflow-hidden shadow-warm-lg bg-espresso"
              style={{ width: PREVIEW_W, height: PREVIEW_H }}
            >
              <AnimatePresence mode="wait">
                {loading || previewLoading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                  >
                    <Loader2 className="h-8 w-8 text-gold animate-spin" />
                    <p className="text-xs text-warm-gray">Rendering card…</p>
                  </motion.div>
                ) : previewUrl ? (
                  <motion.img
                    key="preview"
                    src={previewUrl}
                    alt="Share card preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-warm-gray"
                  >
                    <ImageOff className="h-8 w-8" />
                    <p className="text-xs">Preview unavailable</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Refresh button */}
              {!loading && !previewLoading && (
                <button
                  onClick={buildPreview}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-colors"
                  title="Refresh preview"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dimension label */}
            <p className="mt-2 text-center text-[11px] text-warm-gray/60">
              1080 × 1920 px · Story format
            </p>
          </div>

          {/* ── Controls ─────────────────────────────────────────────────────── */}
          <div className="flex-1 w-full space-y-6">

            {/* Stats preview */}
            {data && !loading && (
              <div className="bg-white/70 border border-sand/60 rounded-2xl p-5 space-y-4">
                <h2 className="font-display text-base font-semibold text-espresso">
                  Card details
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Weeks on program" value={`${data.weeksOnProgram}w`} />
                  <Stat
                    label="Weight change"
                    value={
                      data.weightChange !== null
                        ? `${data.weightChange > 0 ? "+" : ""}${data.weightChange} kg`
                        : "—"
                    }
                  />
                  <Stat
                    label="Best lift"
                    value={
                      data.bestLiftName && data.bestLiftKg
                        ? `${data.bestLiftKg} kg ${data.bestLiftName}`
                        : "—"
                    }
                  />
                  <Stat
                    label="This week's grade"
                    value={data.weekScore > 0 ? `${data.weekGrade} · ${data.weekScore}` : "—"}
                  />
                </div>
              </div>
            )}

            {/* Photo toggle */}
            <div className="bg-white/70 border border-sand/60 rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-espresso">Include progress photo</p>
                  <p className="text-xs text-warm-gray mt-0.5">
                    {data?.progressPhotoUrl
                      ? "Your latest photo will fill the hero section."
                      : "No progress photos on record yet — add one in Progress Photos."}
                  </p>
                </div>
                <button
                  onClick={() => setIncludePhoto((v) => !v)}
                  disabled={!data?.progressPhotoUrl}
                  className="flex-shrink-0 mt-0.5 disabled:opacity-40 transition-opacity"
                  aria-label={includePhoto ? "Disable photo" : "Enable photo"}
                >
                  {includePhoto && data?.progressPhotoUrl ? (
                    <ToggleRight className="h-8 w-8 text-gold" />
                  ) : (
                    <ToggleLeft className="h-8 w-8 text-warm-gray" />
                  )}
                </button>
              </div>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownload}
                disabled={loading || generating || !data}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gold text-espresso font-semibold text-sm px-5 py-3.5 hover:bg-gold-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-warm"
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Download PNG
              </button>

              {canShare && (
                <button
                  onClick={handleShare}
                  disabled={loading || generating || !data}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-espresso text-ivory font-semibold text-sm px-5 py-3.5 hover:bg-charcoal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share2 className="h-4 w-4" />
                  Share…
                </button>
              )}
            </div>

            {/* Tip */}
            <p className="text-xs text-warm-gray leading-relaxed">
              The card is generated entirely in your browser — your data never leaves your device.
              For best results, save to camera roll and share directly from your photos app.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-ivory/60 rounded-xl px-3 py-2.5">
      <p className="text-[11px] text-warm-gray uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-espresso mt-0.5 truncate">{value}</p>
    </div>
  );
}
