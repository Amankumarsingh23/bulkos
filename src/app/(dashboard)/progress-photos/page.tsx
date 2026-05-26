"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Plus, X, Trash2, ChevronLeft, ChevronRight,
  ZoomIn, ArrowLeftRight, Info,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  useProgressPhotos, POSE_LABELS, type Pose,
} from "@/hooks/useProgressPhotos";
import type { ProgressPhoto } from "@/types/database";
import { cn } from "@/lib/utils";

const POSES: { value: Pose; label: string }[] = [
  { value: "front",   label: "Front"      },
  { value: "back",    label: "Back"       },
  { value: "left",    label: "Left side"  },
  { value: "right",   label: "Right side" },
  { value: "flexing", label: "Flexing"    },
  { value: "other",   label: "Other"      },
];

const MAX_FILE_MB = 10;

// ── Upload modal ──────────────────────────────────────────────────────────────

function UploadModal({ onClose }: { onClose: () => void }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [takenAt, setTakenAt]   = useState(today);
  const [pose, setPose]         = useState<Pose | null>("front");
  const [notes, setNotes]       = useState("");
  const [preview, setPreview]   = useState<string | null>(null);
  const [file, setFile]         = useState<File | null>(null);
  const [fileError, setFileErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useProgressPhotos();
  const { success: toastOk, error: toastErr } = useToast();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setFileErr(`File too large — max ${MAX_FILE_MB} MB.`);
      return;
    }
    if (!f.type.startsWith("image/")) {
      setFileErr("Please select an image file.");
      return;
    }
    setFileErr(null);
    setFile(f);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  async function handleSave() {
    if (!file) { setFileErr("Please choose a photo first."); return; }
    const ok = await upload(file, takenAt, pose, notes);
    if (ok) { toastOk("Photo saved!"); onClose(); }
    else toastErr(error ?? "Upload failed.");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-espresso/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="w-full max-w-md bg-ivory rounded-2xl border border-sand/60 shadow-warm-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-sand/50">
          <h2 className="font-display text-lg font-semibold text-espresso">Add Progress Photo</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-warm-gray hover:bg-sand/40 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Photo picker */}
          <div>
            <input
              ref={inputRef} type="file" accept="image/*" capture="environment"
              className="sr-only" onChange={handleFileChange}
            />
            {preview ? (
              <div className="relative rounded-xl overflow-hidden bg-sand/20 aspect-[3/4] max-h-64">
                <Image src={preview} alt="Preview" fill className="object-cover" />
                <button
                  onClick={() => { setPreview(null); setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-espresso/70 text-ivory flex items-center justify-center"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full aspect-video max-h-48 rounded-xl border-2 border-dashed border-sand hover:border-gold transition-colors flex flex-col items-center justify-center gap-2 bg-cream"
              >
                <Camera className="h-8 w-8 text-warm-gray/50" strokeWidth={1.25} />
                <span className="text-sm text-warm-gray">Tap to choose or take a photo</span>
                <span className="text-xs text-warm-gray/60">Max {MAX_FILE_MB} MB · JPG, PNG, HEIC</span>
              </button>
            )}
            {fileError && <p className="text-xs text-rose mt-1.5">{fileError}</p>}
          </div>

          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">Date</label>
            <input
              type="date" value={takenAt} max={today}
              onChange={(e) => setTakenAt(e.target.value)}
              className="bg-cream border border-sand rounded-xl px-3 py-2.5 text-sm text-espresso focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
            />
          </div>

          {/* Pose */}
          <div>
            <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider mb-2">Pose (optional)</p>
            <div className="flex flex-wrap gap-2">
              {POSES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setPose(pose === value ? null : value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    pose === value
                      ? "bg-gold/20 border-gold/50 text-espresso"
                      : "border-sand text-warm-gray hover:border-gold/40"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-warm-gray uppercase tracking-wider">Notes (optional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Week 12, morning, after gym…"
              rows={2}
              className="bg-cream border border-sand rounded-xl px-3 py-2.5 text-sm text-espresso placeholder:text-warm-gray/50 resize-none focus:border-gold focus:ring-2 focus:ring-gold/20 outline-none transition-all"
            />
          </div>

          {error && (
            <p className="text-xs text-rose bg-rose/8 border border-rose/20 rounded-xl px-3 py-2.5 leading-relaxed">{error}</p>
          )}

          <div className="flex items-start gap-2 text-xs text-warm-gray/60 bg-cream rounded-xl border border-sand/40 px-3 py-2.5">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>Same time, same lighting, same spot each week gives the most accurate comparison.</span>
          </div>
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-sand/50 flex gap-3">
          <Button variant="ghost" size="md" onClick={onClose} className="flex-1">Cancel</Button>
          <Button variant="primary" size="md" onClick={handleSave} loading={uploading} className="flex-1">
            Save photo
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  photos, index, onClose, onDelete,
}: {
  photos: ProgressPhoto[];
  index: number;
  onClose: () => void;
  onDelete: (p: ProgressPhoto) => void;
}) {
  const [current, setCurrent] = useState(index);
  const photo = photos[current];

  const prev = useCallback(() => setCurrent((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setCurrent((i) => Math.min(photos.length - 1, i + 1)), [photos.length]);

  if (!photo) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-espresso/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <div>
          <p className="text-ivory font-semibold">
            {new Date(photo.taken_at + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
          </p>
          {photo.pose && <p className="text-ivory/60 text-sm">{POSE_LABELS[photo.pose]}</p>}
          {photo.notes && <p className="text-ivory/50 text-xs mt-0.5">{photo.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { onDelete(photo); onClose(); }}
            className="p-2 rounded-lg text-ivory/60 hover:text-rose hover:bg-rose/15 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button onClick={onClose} className="p-2 rounded-lg text-ivory/60 hover:text-ivory transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Photo */}
      <div className="flex-1 relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full h-full max-w-2xl mx-auto">
          <Image src={photo.public_url} alt="Progress photo" fill className="object-contain" />
        </div>

        {/* Nav arrows */}
        {current > 0 && (
          <button onClick={prev} className="absolute left-3 p-2 rounded-xl bg-ivory/10 text-ivory hover:bg-ivory/20 transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {current < photos.length - 1 && (
          <button onClick={next} className="absolute right-3 p-2 rounded-xl bg-ivory/10 text-ivory hover:bg-ivory/20 transition-colors">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Counter */}
      <p className="text-center text-ivory/50 text-sm pb-6 flex-shrink-0">
        {current + 1} / {photos.length}
      </p>
    </motion.div>
  );
}

// ── Compare view ──────────────────────────────────────────────────────────────

function CompareView({ photos }: { photos: ProgressPhoto[] }) {
  const sorted   = [...photos].sort((a, b) => a.taken_at.localeCompare(b.taken_at));
  const [leftId, setLeftId]   = useState<string>(sorted[0]?.id ?? "");
  const [rightId, setRightId] = useState<string>(sorted[sorted.length - 1]?.id ?? "");

  const left  = photos.find((p) => p.id === leftId)  ?? null;
  const right = photos.find((p) => p.id === rightId) ?? null;

  function PhotoPanel({ photo, side, selectedId, onSelect }: {
    photo: ProgressPhoto | null;
    side: "left" | "right";
    selectedId: string;
    onSelect: (id: string) => void;
  }) {
    return (
      <div className="flex flex-col gap-2">
        {/* Date selector */}
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="w-full bg-cream border border-sand rounded-xl px-3 py-2 text-sm text-espresso focus:border-gold outline-none"
        >
          {sorted.map((p) => (
            <option key={p.id} value={p.id}>
              {new Date(p.taken_at + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {p.pose ? ` · ${POSE_LABELS[p.pose]}` : ""}
            </option>
          ))}
        </select>

        {photo ? (
          <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-sand/20">
            <Image src={photo.public_url} alt="Compare" fill className="object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-espresso/70 to-transparent px-3 py-2">
              <p className="text-ivory text-xs font-medium">
                {new Date(photo.taken_at + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </p>
              {photo.pose && <p className="text-ivory/70 text-[10px]">{POSE_LABELS[photo.pose]}</p>}
            </div>
            {/* L / R badge */}
            <div className={cn(
              "absolute top-2 text-[10px] font-bold px-2 py-0.5 rounded-full",
              side === "left"
                ? "left-2 bg-gold text-espresso"
                : "right-2 bg-espresso/70 text-ivory"
            )}>
              {side === "left" ? "BEFORE" : "AFTER"}
            </div>
          </div>
        ) : (
          <div className="aspect-[3/4] rounded-2xl bg-sand/20 flex items-center justify-center">
            <Camera className="h-8 w-8 text-sand" strokeWidth={1} />
          </div>
        )}
      </div>
    );
  }

  if (photos.length < 2) return null;

  return (
    <div className="bg-ivory rounded-2xl border border-sand/60 shadow-warm-md p-5">
      <div className="flex items-center gap-2 mb-4">
        <ArrowLeftRight className="h-4 w-4 text-gold" />
        <h2 className="font-display text-base font-semibold text-espresso">Compare</h2>
        <span className="text-xs text-warm-gray">— pick any two photos to see your transformation</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PhotoPanel photo={left}  side="left"  selectedId={leftId}  onSelect={setLeftId}  />
        <PhotoPanel photo={right} side="right" selectedId={rightId} onSelect={setRightId} />
      </div>
    </div>
  );
}

// ── Photo grid (timeline) ────────────────────────────────────────────────────

function PhotoGrid({
  photos, onOpen, onDelete,
}: {
  photos: ProgressPhoto[];
  onOpen: (i: number) => void;
  onDelete: (p: ProgressPhoto) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-warm-gray uppercase tracking-widest mb-3">Timeline</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
        {photos.map((photo, i) => (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }}
            className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-sand/20 cursor-pointer"
          >
            <Image
              src={photo.public_url}
              alt="Progress"
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onClick={() => onOpen(i)}
            />
            {/* Hover overlay */}
            <div
              className="absolute inset-0 bg-espresso/0 group-hover:bg-espresso/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100"
              onClick={() => onOpen(i)}
            >
              <ZoomIn className="h-5 w-5 text-ivory" />
            </div>
            {/* Date + delete strip */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-espresso/80 to-transparent px-2 pt-4 pb-1.5">
              <p className="text-ivory text-[10px] font-medium leading-none">
                {new Date(photo.taken_at + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
              {photo.pose && (
                <p className="text-ivory/60 text-[9px]">{POSE_LABELS[photo.pose]}</p>
              )}
            </div>
            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(photo); }}
              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-espresso/60 text-ivory opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity hover:bg-rose/80"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center px-4"
    >
      <div className="h-20 w-20 rounded-2xl bg-gold/10 border-2 border-gold/20 flex items-center justify-center mb-6">
        <Camera className="h-9 w-9 text-gold/50" strokeWidth={1.25} />
      </div>
      <h2 className="font-display text-2xl font-semibold text-espresso mb-2">Your transformation starts here</h2>
      <p className="text-warm-gray text-sm max-w-sm mx-auto mb-2 leading-relaxed">
        Take a photo once a week — same pose, same lighting, same time of day.
        When you compare Week 1 to Week 12, you&apos;ll see what the scale can&apos;t show you.
      </p>
      <p className="text-warm-gray/60 text-xs max-w-xs mx-auto mb-8 leading-relaxed">
        Photos are private and stored securely in your account. Only you can see them.
      </p>
      <Button variant="primary" size="md" onClick={onUpload}>
        <Plus className="h-3.5 w-3.5" /> Add first photo
      </Button>
    </motion.div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProgressPhotosPage() {
  const { photos, loading, remove } = useProgressPhotos();
  const [showUpload, setShowUpload]     = useState(false);
  const [lightboxIdx, setLightboxIdx]   = useState<number | null>(null);
  const { success: toastOk, error: toastErr } = useToast();

  async function handleDelete(photo: ProgressPhoto) {
    const ok = await remove(photo);
    if (ok) toastOk("Photo deleted.");
    else toastErr("Failed to delete photo.");
  }

  return (
    <>
      <div className="space-y-6 pb-28 lg:pb-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div>
            <h1 className="font-display text-2xl font-semibold text-espresso">Progress Photos</h1>
            <p className="text-sm text-warm-gray mt-0.5">
              {photos.length > 0
                ? `${photos.length} photo${photos.length !== 1 ? "s" : ""} · compare any two to see your transformation`
                : "Visual proof of your journey."}
            </p>
          </div>
          {photos.length > 0 && (
            <Button variant="primary" size="md" onClick={() => setShowUpload(true)}>
              <Plus className="h-3.5 w-3.5" /> Add photo
            </Button>
          )}
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-sand/30 animate-pulse" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <EmptyState onUpload={() => setShowUpload(true)} />
        ) : (
          <div className="space-y-6">
            {/* Compare view — only if 2+ photos */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <CompareView photos={photos} />
            </motion.div>

            {/* Timeline grid */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <PhotoGrid photos={photos} onOpen={setLightboxIdx} onDelete={handleDelete} />
            </motion.div>
          </div>
        )}
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIdx !== null && (
          <Lightbox
            photos={photos}
            index={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </>
  );
}
