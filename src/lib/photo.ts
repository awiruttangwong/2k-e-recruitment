// Client-side photo processing for the letterhead's 25mm × 35mm photo box
// (standard Thai job-application "รูปถ่าย 1 นิ้ว").
//
// Everything here runs in the browser BEFORE the photo touches the network:
// a phone camera JPEG is 3-8 MB, and base64 inflates it another 33%, so
// uploading the original would bloat the POST body, the D1 row and the
// generated PDF alike. Downscaling first keeps each photo at ~20-40 KB.
//
// Re-encoding through a canvas also strips every EXIF tag — including the GPS
// coordinates phones embed by default — which we want off a public form.

// 300×420 is the exact 5:7 aspect of the 25mm × 35mm box, so the output needs
// no letterboxing or object-fit anywhere downstream. Printed at 25mm wide it
// lands at 304.8 DPI (300px ÷ 0.9843in), just above the 300 DPI print bar.
export const PHOTO_OUT_W = 300;
export const PHOTO_OUT_H = 420;
export const PHOTO_JPEG_QUALITY = 0.82;
export const PHOTO_MAX_ZOOM = 3;

// Reject absurd files before decoding: a JPEG decodes to width×height×4 bytes
// of RAM regardless of its compressed size, so this guard is about memory on
// low-end phones, not bandwidth.
export const PHOTO_MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/** How the source image is positioned inside the 300×420 output frame.
 *  offsetX/offsetY are in output-frame pixels, measured from centred. */
export interface PhotoTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export const PHOTO_TRANSFORM_IDENTITY: PhotoTransform = { zoom: 1, offsetX: 0, offsetY: 0 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Scale at which the source image exactly covers the output frame — the
 *  zoom=1 baseline, so zoom can never reveal a blank edge. */
export function coverScale(imgW: number, imgH: number): number {
  return Math.max(PHOTO_OUT_W / imgW, PHOTO_OUT_H / imgH);
}

/** Clamps zoom to [1, PHOTO_MAX_ZOOM] and the pan offsets to whatever slack
 *  that zoom leaves, so the frame stays fully covered. Zooming out shrinks the
 *  slack, which is why the offsets must be re-clamped on every zoom change. */
export function clampTransform(t: PhotoTransform, imgW: number, imgH: number): PhotoTransform {
  const zoom = clamp(t.zoom, 1, PHOTO_MAX_ZOOM);
  const scale = coverScale(imgW, imgH) * zoom;
  const maxX = Math.max(0, (imgW * scale - PHOTO_OUT_W) / 2);
  const maxY = Math.max(0, (imgH * scale - PHOTO_OUT_H) / 2);
  return {
    zoom,
    offsetX: clamp(t.offsetX, -maxX, maxX),
    offsetY: clamp(t.offsetY, -maxY, maxY),
  };
}

/** Where the source image sits inside the output frame, in output pixels.
 *  The crop dialog scales this by (preview width ÷ PHOTO_OUT_W) to draw its
 *  preview, so preview and exported JPEG are guaranteed to agree. */
export function framePlacement(t: PhotoTransform, imgW: number, imgH: number) {
  const scale = coverScale(imgW, imgH) * t.zoom;
  const width = imgW * scale;
  const height = imgH * scale;
  return {
    scale,
    width,
    height,
    left: (PHOTO_OUT_W - width) / 2 + t.offsetX,
    top: (PHOTO_OUT_H - height) / 2 + t.offsetY,
  };
}

/** Inverse of framePlacement: the rectangle of the SOURCE image that ends up
 *  filling the output frame. Feeding this to drawImage's 9-arg form lets us
 *  resample only the visible crop instead of materialising the whole photo. */
function sourceRect(t: PhotoTransform, imgW: number, imgH: number) {
  const { scale, left, top } = framePlacement(t, imgW, imgH);
  return {
    sx: -left / scale,
    sy: -top / scale,
    sw: PHOTO_OUT_W / scale,
    sh: PHOTO_OUT_H / scale,
  };
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/** Renders the cropped photo to a JPEG data URL at exactly PHOTO_OUT_W×H.
 *
 *  Downscaling a 12MP photo straight to 300px in one drawImage aliases badly —
 *  browsers point-sample rather than average across such a large ratio, which
 *  is what makes shrunken photos look gritty. Halving repeatedly until we're
 *  within 2× of the target and letting the final draw cover the remainder is
 *  the standard fix, and it's what keeps the face crisp at print size. */
export function renderPhotoToDataUrl(img: HTMLImageElement, transform: PhotoTransform): string {
  const imgW = img.naturalWidth;
  const imgH = img.naturalHeight;
  if (!imgW || !imgH) throw new Error("image_not_loaded");

  const t = clampTransform(transform, imgW, imgH);
  const { sx, sy, sw, sh } = sourceRect(t, imgW, imgH);

  // First step doubles as the crop: never allocate below the output size, and
  // never above the crop's own size (a small source shouldn't be upscaled into
  // a huge intermediate only to be shrunk again).
  let width = Math.max(PHOTO_OUT_W, Math.round(sw / 2));
  let height = Math.max(PHOTO_OUT_H, Math.round(sh / 2));
  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  context2d(canvas).drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

  // Bounded rather than while(true): a rounding quirk must not spin forever.
  for (let step = 0; step < 8 && width > PHOTO_OUT_W * 2 && height > PHOTO_OUT_H * 2; step++) {
    const nextWidth = Math.max(PHOTO_OUT_W, Math.round(width / 2));
    const nextHeight = Math.max(PHOTO_OUT_H, Math.round(height / 2));
    const next = document.createElement("canvas");
    next.width = nextWidth;
    next.height = nextHeight;
    context2d(next).drawImage(canvas, 0, 0, width, height, 0, 0, nextWidth, nextHeight);
    canvas = next;
    width = nextWidth;
    height = nextHeight;
  }

  const out = document.createElement("canvas");
  out.width = PHOTO_OUT_W;
  out.height = PHOTO_OUT_H;
  const ctx = context2d(out);
  // JPEG has no alpha channel: without an explicit white matte a transparent
  // PNG source composites onto black instead of the paper.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, PHOTO_OUT_W, PHOTO_OUT_H);
  ctx.drawImage(canvas, 0, 0, width, height, 0, 0, PHOTO_OUT_W, PHOTO_OUT_H);

  return out.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY);
}

export interface LoadedPhoto {
  img: HTMLImageElement;
  /** Caller owns this and must URL.revokeObjectURL it once the img is dropped.
   *  It is deliberately NOT revoked on load: browsers may evict decoded pixels
   *  under memory pressure and re-fetch from the src, which fails on a revoked
   *  blob URL — and this img is kept alive for re-cropping. */
  objectUrl: string;
}

/** Decodes a picked file into an <img>.
 *
 *  This goes through an <img> rather than createImageBitmap() on purpose:
 *  image-orientation:from-image is the browser default for <img>, so EXIF
 *  rotation is applied and drawImage draws the photo upright. createImageBitmap
 *  defaults to ignoring EXIF, which renders phone portraits sideways. */
export function loadPhotoFile(file: File): Promise<LoadedPhoto> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("not_an_image"));
      return;
    }
    if (file.size > PHOTO_MAX_SOURCE_BYTES) {
      reject(new Error("file_too_large"));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("decode_failed"));
        return;
      }
      resolve({ img, objectUrl });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("decode_failed"));
    };
    img.src = objectUrl;
  });
}
