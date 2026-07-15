import { Font } from "@react-pdf/renderer";

let registered = false;

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
