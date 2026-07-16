"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { ApplicationFormValues } from "@/lib/application-schema";
import {
  PHOTO_MAX_ZOOM,
  PHOTO_OUT_H,
  PHOTO_OUT_W,
  PHOTO_TRANSFORM_IDENTITY,
  clampTransform,
  framePlacement,
  loadPhotoFile,
  renderPhotoToDataUrl,
  type LoadedPhoto,
  type PhotoTransform,
} from "@/lib/photo";

// The crop preview is a scaled copy of the 300×420 output frame, so every
// coordinate below is computed in output pixels and multiplied by this on the
// way out. 240×336 keeps the exact 5:7 aspect and still fits a 390px phone.
const PREVIEW_W = 240;
const PREVIEW_SCALE = PREVIEW_W / PHOTO_OUT_W;
const PREVIEW_H = PHOTO_OUT_H * PREVIEW_SCALE;

const errorMessage: Record<string, string> = {
  not_an_image: "กรุณาเลือกไฟล์รูปภาพ (JPG หรือ PNG)",
  file_too_large: "ไฟล์รูปใหญ่เกินไป กรุณาเลือกไฟล์ที่เล็กกว่า 20 MB",
  // iOS transcodes HEIC to JPEG on pick, but a .heic dragged in on desktop
  // Chrome has no decoder and lands here.
  decode_failed: "ไม่สามารถอ่านไฟล์รูปนี้ได้ กรุณาลองไฟล์อื่น",
};

/** Drag-to-reposition + zoom, shown after a file is picked.
 *  The 25mm box itself is only ~95 CSS px wide — far too small to drag inside
 *  on a phone — so cropping happens here at a workable size instead. */
function PhotoCropDialog({
  photo,
  initialTransform,
  onCancel,
  onApply,
}: {
  photo: LoadedPhoto;
  initialTransform: PhotoTransform;
  onCancel: () => void;
  onApply: (dataUrl: string, transform: PhotoTransform) => void;
}) {
  const { img } = photo;
  const [transform, setTransform] = useState<PhotoTransform>(() =>
    clampTransform(initialTransform, img.naturalWidth, img.naturalHeight)
  );
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; origin: PhotoTransform } | null>(null);

  // Esc to dismiss — a modal that can only be closed by hitting the right
  // button is a trap for keyboard users.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const place = framePlacement(transform, img.naturalWidth, img.naturalHeight);

  // Pointer events cover mouse, touch and pen in one path, so PC and mobile
  // share this code rather than diverging into mouse*/touch* handlers.
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origin: transform };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    // Screen delta → output-frame units, so panning tracks the cursor exactly.
    const dx = (e.clientX - drag.startX) / PREVIEW_SCALE;
    const dy = (e.clientY - drag.startY) / PREVIEW_SCALE;
    setTransform(
      clampTransform(
        { zoom: drag.origin.zoom, offsetX: drag.origin.offsetX + dx, offsetY: drag.origin.offsetY + dy },
        img.naturalWidth,
        img.naturalHeight
      )
    );
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
  };

  const canPan = place.width > PHOTO_OUT_W + 0.5 || place.height > PHOTO_OUT_H + 0.5;

  return (
    <div
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="ปรับรูปถ่าย"
    >
      <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
        <h2 className="text-center text-[15px] font-semibold text-neutral-900">ปรับรูปถ่าย</h2>
        <p className="mt-1 text-center text-[11px] text-neutral-500">
          {canPan ? "ลากรูปเพื่อเลื่อนตำแหน่ง และใช้แถบเลื่อนเพื่อซูม" : "ใช้แถบเลื่อนเพื่อซูม"}
        </p>

        <div className="mt-3 flex justify-center">
          <div
            className="relative overflow-hidden border border-neutral-800 bg-neutral-100"
            style={{
              width: PREVIEW_W,
              height: PREVIEW_H,
              // Without this the browser scrolls the page instead of handing us
              // the pointermove stream, making the photo undraggable on mobile.
              touchAction: "none",
              cursor: canPan ? "move" : "default",
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.objectUrl}
              alt="ตัวอย่างรูปถ่าย"
              draggable={false}
              className="absolute select-none"
              style={{
                left: place.left * PREVIEW_SCALE,
                top: place.top * PREVIEW_SCALE,
                width: place.width * PREVIEW_SCALE,
                height: place.height * PREVIEW_SCALE,
                // Tailwind's preflight sets img{max-width:100%}, which would
                // silently cap a zoomed photo and desync preview from output.
                maxWidth: "none",
              }}
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-3">
          <span className="text-[11px] text-neutral-500">ซูม</span>
          <input
            type="range"
            min={1}
            max={PHOTO_MAX_ZOOM}
            step={0.01}
            value={transform.zoom}
            onChange={(e) =>
              setTransform((prev) =>
                clampTransform(
                  { ...prev, zoom: Number(e.target.value) },
                  img.naturalWidth,
                  img.naturalHeight
                )
              )
            }
            className="h-1 flex-1 cursor-pointer accent-blue-600"
            aria-label="ซูมรูปถ่าย"
          />
        </label>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded border border-neutral-300 px-4 py-2 text-[13px] text-neutral-700 hover:bg-neutral-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={() => onApply(renderPhotoToDataUrl(img, transform), transform)}
            className="flex-1 rounded bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700"
          >
            ใช้รูปนี้
          </button>
        </div>
      </div>
    </div>
  );
}

interface AppliedPhoto {
  photo: LoadedPhoto;
  transform: PhotoTransform;
}

interface PendingPhoto extends AppliedPhoto {
  /** Freshly decoded from a file picker (so cancelling must free it), rather
   *  than the already-applied source reopened for another crop. */
  isNew: boolean;
}

/** The letterhead's 25mm × 35mm photo box, upgraded to accept an upload.
 *  Optional by design: applicants without a photo leave it as the printed
 *  placeholder and attach one to the paper copy, exactly as before. */
export function PhotoUploadBox() {
  const { setValue, watch } = useFormContext<ApplicationFormValues>();
  const dataUrl = watch("photoDataUrl");

  const inputRef = useRef<HTMLInputElement>(null);
  // `applied` is the source behind whatever photoDataUrl currently holds. It is
  // kept for the whole session so re-opening the dialog can re-crop from the
  // original: cropping the already-downscaled output again would compound
  // resampling loss with every pass.
  const [applied, setApplied] = useState<AppliedPhoto | null>(null);
  // A file being cropped is staged here and only promoted to `applied` on
  // "ใช้รูปนี้". Mutating `applied` up front would make "ยกเลิก" a lie: the box
  // would still show the old photo while a later edit silently opened the
  // abandoned one.
  const [pending, setPending] = useState<PendingPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Object URLs outlive their component unless revoked, so every path that
  // drops a source frees it — and only if nothing else still points at it.
  const release = useCallback((target: LoadedPhoto | null | undefined, keep?: LoadedPhoto | null) => {
    if (target && target !== keep) URL.revokeObjectURL(target.objectUrl);
  }, []);

  // Unmount cleanup reads the latest sources through a ref so its effect can
  // stay dependency-free — depending on the state directly would re-run the
  // cleanup on every change and revoke a URL that is still in use.
  const liveRef = useRef<{ applied: AppliedPhoto | null; pending: PendingPhoto | null }>({ applied: null, pending: null });
  useEffect(() => {
    liveRef.current = { applied, pending };
  }, [applied, pending]);
  useEffect(
    () => () => {
      const { applied: a, pending: p } = liveRef.current;
      release(a?.photo);
      release(p?.photo, a?.photo);
    },
    [release]
  );

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const loaded = await loadPhotoFile(file);
      setPending((prev) => {
        release(prev?.photo, applied?.photo);
        return { photo: loaded, transform: PHOTO_TRANSFORM_IDENTITY, isNew: true };
      });
    } catch (e) {
      const key = e instanceof Error ? e.message : "decode_failed";
      setError(errorMessage[key] ?? errorMessage.decode_failed);
    }
  };

  const clearPhoto = () => {
    release(applied?.photo, pending?.photo);
    setApplied(null);
    setValue("photoDataUrl", "", { shouldDirty: true });
    setError(null);
  };

  return (
    <div className="shrink-0">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          // Reset so picking the same file twice still fires onChange.
          e.target.value = "";
        }}
      />

      <div className="group relative">
        <button
          type="button"
          onClick={() =>
            applied ? setPending({ ...applied, isNew: false }) : inputRef.current?.click()
          }
          // The frame is an outline, not a border, so it draws OUTSIDE the box
          // instead of eating 1px off each side: the photo itself then prints at
          // a true 25mm × 35mm (a real "1 นิ้ว" photo), which is also what the
          // 304.8 DPI of the 300×420 export assumes. A border here would shrink
          // it to 24.47mm and silently disagree with the PDF, which lays the
          // same box out content-box.
          className="flex items-center justify-center overflow-hidden bg-white text-center text-[9px] leading-tight text-neutral-400 outline outline-1 outline-neutral-800 hover:text-blue-600 hover:outline-blue-600 focus-visible:outline-blue-600"
          style={{ width: "25mm", height: "35mm" }}
          aria-label={dataUrl ? "แก้ไขรูปถ่าย" : "อัปโหลดรูปถ่าย 1 นิ้ว"}
        >
          {dataUrl ? (
            // Pre-cropped to the box's exact 5:7 aspect, so this needs no
            // object-fit and cannot distort.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={dataUrl} alt="รูปถ่ายผู้สมัคร" className="h-full w-full" />
          ) : (
            <span>
              ติดรูปถ่าย
              <br />
              1 นิ้ว
              {/* Screen-only affordance: on paper this box is where a physical
                  photo gets glued, so an "upload" hint must not print. */}
              <span className="no-print mt-2 block text-[8px] text-blue-600 group-hover:underline">
                แตะเพื่ออัปโหลด
              </span>
            </span>
          )}
        </button>

        {dataUrl ? (
          <button
            type="button"
            onClick={clearPhoto}
            // Same hover-gating fix as the org chart's node delete: touch
            // devices have no hover, so the button must be visible by default
            // and only hide-until-hover on pointers that can actually hover.
            className="no-print absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[14px] leading-none text-white shadow transition-opacity opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
            aria-label="ลบรูปถ่าย"
          >
            ×
          </button>
        ) : null}
      </div>

      {error ? <p className="no-print mt-1 w-[25mm] text-[9px] leading-tight text-red-600">{error}</p> : null}

      {pending ? (
        <PhotoCropDialog
          // Remount on a new source so the dialog re-seeds its transform state.
          key={pending.photo.objectUrl}
          photo={pending.photo}
          initialTransform={pending.transform}
          onCancel={() => {
            // A cancelled new pick is dropped entirely; re-cropping an existing
            // photo shares `applied`'s source, which must survive.
            if (pending.isNew) release(pending.photo, applied?.photo);
            setPending(null);
          }}
          onApply={(nextDataUrl, nextTransform) => {
            if (pending.isNew) release(applied?.photo, pending.photo);
            setApplied({ photo: pending.photo, transform: nextTransform });
            setValue("photoDataUrl", nextDataUrl, { shouldDirty: true });
            setPending(null);
          }}
        />
      ) : null}
    </div>
  );
}
