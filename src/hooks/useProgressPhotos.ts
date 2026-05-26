"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { ProgressPhoto } from "@/types/database";

export type Pose = "front" | "back" | "left" | "right" | "flexing" | "other";

export const POSE_LABELS: Record<Pose, string> = {
  front:   "Front",
  back:    "Back",
  left:    "Left side",
  right:   "Right side",
  flexing: "Flexing",
  other:   "Other",
};

const BUCKET = "progress-photos";

export function useProgressPhotos() {
  const { profile } = useAuth();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const supabase = createBrowserClient();
    const { data, error: err } = await supabase
      .from("progress_photos")
      .select("*")
      .eq("user_id", profile.id)
      .order("taken_at", { ascending: false });
    if (err) setError(err.message);
    else setPhotos(data ?? []);
    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  async function upload(
    file: File,
    takenAt: string,
    pose: Pose | null,
    notes: string
  ): Promise<boolean> {
    if (!profile?.id) return false;
    setUploading(true);
    setError(null);
    const supabase = createBrowserClient();

    // Unique path: userId/uuid.ext
    const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upErr) {
      setError(upErr.message.includes("Bucket not found")
        ? 'Storage bucket "progress-photos" not found. Create it in Supabase Dashboard → Storage → New bucket (name: progress-photos, public: ON).'
        : upErr.message
      );
      setUploading(false);
      return false;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = urlData.publicUrl;

    const { error: dbErr } = await supabase.from("progress_photos").insert({
      user_id:      profile.id,
      taken_at:     takenAt,
      storage_path: path,
      public_url:   publicUrl,
      pose:         pose,
      notes:        notes.trim() || null,
    });

    if (dbErr) {
      // Rollback storage if DB insert failed
      await supabase.storage.from(BUCKET).remove([path]);
      setError(dbErr.message);
      setUploading(false);
      return false;
    }

    await fetchPhotos();
    setUploading(false);
    return true;
  }

  async function remove(photo: ProgressPhoto): Promise<boolean> {
    const supabase = createBrowserClient();
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    const { error: err } = await supabase
      .from("progress_photos").delete().eq("id", photo.id);
    if (err) { setError(err.message); return false; }
    setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    return true;
  }

  return { photos, loading, uploading, error, upload, remove, refetch: fetchPhotos };
}
