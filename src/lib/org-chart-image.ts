// Client-side processing for an applicant-supplied org-chart image — the
// "upload my own chart" alternative to the drag-and-drop builder.
//
// Unlike the 1-inch photo (a fixed 5:7 crop of a face), an org chart must be
// shown WHOLE and undistorted, so this keeps the source aspect ratio and never
// crops. Source files are typically PNG exports several MB in size, so the work
// here — done entirely in the browser before anything touches the network — is
// (1) downscale to a print-sane resolution and (2) re-encode to bound the
// stored data-URL, which otherwise bloats the POST body, the D1 row and the
// generated PDF. Re-encoding through a canvas also strips EXIF, same as photo.ts.

import { loadPhotoFile } from "./photo";
// The size cap lives in the schema so client (here) and server validation share
// one source of truth; this module stays the DOM-only processing half.
import { ORG_CHART_IMAGE_MAX_DATA_URL_CHARS } from "./application-schema";

// Longest side of the stored image. Across the A4 content width (~535pt ≈
// 7.4in) 1500px prints at ~200 DPI — crisp for the boxes/lines/small text of a
// hand-made chart — while collapsing a multi-MB source to a few hundred KB.
export const ORG_CHART_MAX_DIM = 1500;
// Second attempt if even a re-encode at MAX_DIM overshoots the size cap.
export const ORG_CHART_FALLBACK_DIM = 1100;
// PNG keeps line art crisp; JPEG is the fallback when PNG is too heavy. 0.92 is
// high enough that box edges/text stay clean while still shrinking photos hard.
export const ORG_CHART_JPEG_QUALITY = 0.92;

export interface OrgChartImageResult {
  /** `data:image/png;base64,…` or `data:image/jpeg;base64,…`. */
  dataUrl: string;
  /** height / width of the encoded image, so the frame and the PDF can size it
   *  to fill the width while preserving the exact source proportions. */
  aspect: number;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/** Downscales the image to fit within `maxDim` on its longest side, preserving
 *  aspect. Halving repeatedly until within 2× of the target (then one final
 *  draw) is what keeps thin chart lines from aliasing into a gritty mess — the
 *  same technique the photo pipeline uses. A source already smaller than the
 *  target is drawn once, never upscaled. */
function downscaleWithin(img: HTMLImageElement, maxDim: number): HTMLCanvasElement {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  let width = srcW;
  let height = srcH;
  let canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  context2d(canvas).drawImage(img, 0, 0);

  for (let step = 0; step < 8 && width > targetW * 2 && height > targetH * 2; step++) {
    const nextWidth = Math.max(targetW, Math.round(width / 2));
    const nextHeight = Math.max(targetH, Math.round(height / 2));
    const next = document.createElement("canvas");
    next.width = nextWidth;
    next.height = nextHeight;
    context2d(next).drawImage(canvas, 0, 0, width, height, 0, 0, nextWidth, nextHeight);
    canvas = next;
    width = nextWidth;
    height = nextHeight;
  }

  if (width === targetW && height === targetH) return canvas;

  const out = document.createElement("canvas");
  out.width = targetW;
  out.height = targetH;
  context2d(out).drawImage(canvas, 0, 0, width, height, 0, 0, targetW, targetH);
  return out;
}

/** JPEG has no alpha channel: a transparent PNG source would composite onto
 *  black without an explicit white matte. */
function toJpeg(canvas: HTMLCanvasElement): string {
  const matted = document.createElement("canvas");
  matted.width = canvas.width;
  matted.height = canvas.height;
  const ctx = context2d(matted);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, matted.width, matted.height);
  ctx.drawImage(canvas, 0, 0);
  return matted.toDataURL("image/jpeg", ORG_CHART_JPEG_QUALITY);
}

/**
 * Loads, downscales and encodes an org-chart image file.
 *
 * Encoding is chosen to stay under ORG_CHART_MAX_DATA_URL_CHARS while keeping
 * lines as crisp as possible:
 *   1. PNG at MAX_DIM — lossless, best for computer-drawn line art.
 *   2. If too heavy, JPEG at MAX_DIM — kills PNG's size blow-up on photographic
 *      or richly-shaded charts.
 *   3. If still too heavy, JPEG at the smaller FALLBACK_DIM.
 * Rejects (image_too_large) only if a chart is so dense it overflows even step 3.
 *
 * @throws not_an_image | file_too_large | decode_failed (from loadPhotoFile),
 *         canvas_unavailable, or image_too_large.
 */
export async function processOrgChartImage(file: File): Promise<OrgChartImageResult> {
  const { img, objectUrl } = await loadPhotoFile(file);
  try {
    const primary = downscaleWithin(img, ORG_CHART_MAX_DIM);
    const aspectPrimary = primary.height / primary.width;

    let dataUrl = primary.toDataURL("image/png");
    if (dataUrl.length <= ORG_CHART_IMAGE_MAX_DATA_URL_CHARS) {
      return { dataUrl, aspect: aspectPrimary };
    }

    dataUrl = toJpeg(primary);
    if (dataUrl.length <= ORG_CHART_IMAGE_MAX_DATA_URL_CHARS) {
      return { dataUrl, aspect: aspectPrimary };
    }

    const smaller = downscaleWithin(img, ORG_CHART_FALLBACK_DIM);
    dataUrl = toJpeg(smaller);
    if (dataUrl.length <= ORG_CHART_IMAGE_MAX_DATA_URL_CHARS) {
      return { dataUrl, aspect: smaller.height / smaller.width };
    }

    throw new Error("image_too_large");
  } finally {
    // The <img> is single-use here (no re-crop), so its object URL is freed as
    // soon as encoding finishes, unlike the re-croppable 1-inch photo.
    URL.revokeObjectURL(objectUrl);
  }
}
