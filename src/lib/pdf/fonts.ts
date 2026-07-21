import { Font } from "@react-pdf/renderer";

let registered = false;

// Every (weight, style) variant registered below. Preloading each one before
// render is what makes the export deterministic across devices (see loadPdfFonts).
const SARABUN_VARIANTS = [
  { fontWeight: "normal", fontStyle: "normal" },
  { fontWeight: "bold", fontStyle: "normal" },
  { fontWeight: "normal", fontStyle: "italic" },
  { fontWeight: 600, fontStyle: "normal" },
] as const;

/** Registers the Sarabun family (Thai + Latin glyph coverage) for @react-pdf/renderer.
 *  Must run once, client-side, before any <Document> using font family "Sarabun" renders. */
export function ensurePdfFontsRegistered() {
  if (registered) return;
  registered = true;
  Font.register({
    family: "Sarabun",
    fonts: [
      { src: "/form-assets/fonts/Sarabun-Regular.ttf", fontWeight: "normal", fontStyle: "normal" },
      { src: "/form-assets/fonts/Sarabun-Bold.ttf", fontWeight: "bold", fontStyle: "normal" },
      { src: "/form-assets/fonts/Sarabun-Italic.ttf", fontWeight: "normal", fontStyle: "italic" },
      { src: "/form-assets/fonts/Sarabun-SemiBold.ttf", fontWeight: 600, fontStyle: "normal" },
    ],
  });
  // react-pdf's default hyphenation callback breaks Thai words (which have no
  // spaces) at arbitrary byte offsets; disable it so Thai text wraps on
  // natural breaks (spaces) only.
  Font.registerHyphenationCallback((word) => [word]);
}

/** Registers, then actually fetches + parses every Sarabun variant, resolving
 *  only once they're all ready.
 *
 *  react-pdf fetches registered fonts lazily during layout. On a fast desktop /
 *  headless run they finish before the glyph metrics are needed, so the PDF is
 *  correct. On a real phone (slower CPU + network) that race can lose: layout
 *  runs against a fallback font with the wrong metrics and no Thai/✓ glyphs,
 *  which is exactly the "PDF จากมือถือดูแปลก" report — text overflowing its
 *  field, cells not sizing to content, checkmarks/text not appearing. Awaiting
 *  this before pdf().toBlob() removes the race so every device renders the same
 *  bytes the desktop does. Failures are swallowed: a font hiccup should fall
 *  back to react-pdf's own lazy load, never block the download outright. */
export async function loadPdfFonts(): Promise<void> {
  ensurePdfFontsRegistered();
  await Promise.all(
    SARABUN_VARIANTS.map((v) =>
      Font.load({ fontFamily: "Sarabun", ...v }).catch(() => undefined)
    )
  );
}
