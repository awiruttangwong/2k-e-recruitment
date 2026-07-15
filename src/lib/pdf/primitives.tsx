import { StyleSheet, Text, View } from "@react-pdf/renderer";

// react-pdf clips the final glyph of a text run to the measured line width, and
// fontkit under-measures the last Thai glyph's advance — so the last character
// gets visually cut off. A trailing non-breaking space (NOT a normal space,
// which the layout engine trims before measuring) reserves that width so the
// real last glyph is never at the clip edge.
const NBSP = " ";
export function pad(v: string | number | null | undefined): string {
  if (v === 0) return "0" + NBSP;
  if (v == null || v === "") return "";
  return String(v) + NBSP;
}

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Sarabun",
    fontSize: 9,
    color: "#171717",
    // Top padding clears the fixed corner logo that rides on pages 2+ (logo
    // is top:12 + height:35, so content must start at 47+ to avoid overlap).
    paddingTop: 52,
    paddingBottom: 30,
    paddingHorizontal: 30,
  },

  // Letterhead
  // No divider under the letterhead; marginBottom keeps the field block spaced
  // below it (page 1 only — the header doesn't render on later pages).
  headerRow: { flexDirection: "row", alignItems: "flex-start", paddingBottom: 6, marginBottom: 24 },
  logo: { width: 58, height: 35, marginTop: 2 },
  headerCenter: { flex: 1, alignItems: "center", paddingTop: 2 },
  companyName: { fontSize: 11, fontWeight: "bold" },
  companyAddress: { fontSize: 8, color: "#404040", marginTop: 4 },
  formTitleTh: { fontSize: 13, fontWeight: "bold", marginTop: 4 },
  formTitleEn: { fontSize: 8.5, fontStyle: "normal", color: "#404040", marginTop: 4 },
  photoBox: { width: "25mm", height: "35mm", borderWidth: 1, borderColor: "#262626", alignItems: "center", justifyContent: "center" },
  photoBoxText: { fontSize: 6.5, color: "#a3a3a3", textAlign: "center" },

  // Section divider — "English (Thai)" on a shaded bar. All 7 section bars
  // (Personal/Family/Education/Training/Work Experience/Language/Special
  // Ability) share this ONE style object, so background + both border rules
  // are guaranteed identical across every section — never fork per-section
  // overrides for these three properties.
  sectionBar: {
    backgroundColor: "#f7f7f7",
    // 0.75pt (not 0.5pt) is deliberate: at 0.5pt, whichever fractional-point
    // Y position a given bar happens to land at (a side effect of how much
    // variable-height content precedes it) pushed the rasterized border
    // across a different number of anti-aliased pixel rows for some
    // sections (Work Experience / Language Ability rendered ~1px "blurrier"
    // than the other 5, even though every bar uses this exact same style
    // object) — a sub-pixel rendering artifact, not a style difference. The
    // thicker line is far less sensitive to that sub-pixel offset, so every
    // bar reads uniformly crisp regardless of its exact page position.
    borderTopWidth: 0.75,
    borderBottomWidth: 0.75,
    borderColor: "#737373",
    paddingVertical: 3,
    paddingHorizontal: 4,
    // Larger top margin than the ~5pt row gap → sections read as a clear tier
    // in the vertical rhythm rather than sitting cramped against the block above.
    marginTop: 16,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "baseline",
  },
  sectionBarEn: { fontSize: 10, fontWeight: "bold" },
  sectionBarTh: { fontSize: 9, fontWeight: 600, color: "#404040", marginLeft: 5 },

  // Fields
  row: { flexDirection: "row", alignItems: "flex-end", marginBottom: 5 },
  fieldWrap: { marginRight: 12 },
  fieldInline: { flexDirection: "row", alignItems: "flex-end" },
  fieldLabel: { fontSize: 9, marginRight: 3 },
  fieldValueBox: { flex: 1, borderBottomWidth: 0.6, borderBottomColor: "#737373", borderStyle: "dotted", paddingBottom: 1, minHeight: 12 },
  fieldValue: { fontSize: 9.5 },
  fieldSuffix: { fontSize: 8, color: "#525252", marginLeft: 3 },
  fieldEn: { fontSize: 7, fontStyle: "italic", color: "#a3a3a3", marginTop: 1 },

  // Checkboxes
  checkRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginBottom: 5 },
  checkLabel: { fontSize: 9, marginRight: 8 },
  checkOption: { flexDirection: "row", alignItems: "center", marginRight: 12 },
  checkBox: { width: 8.5, height: 8.5, borderWidth: 1, borderColor: "#404040", marginRight: 3.5, alignItems: "center", justifyContent: "center" },
  checkBoxOn: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  checkTick: { fontSize: 7, color: "#ffffff", fontWeight: "bold", lineHeight: 1 },
  checkText: { fontSize: 9 },

  // Tables — every border, outer frame AND every internal gridline (header
  // divider, column rules, row rules), uses the SAME black color AND the
  // SAME width (0.6pt) across every data table (Siblings, Education,
  // Training, Work Experience, Language Ability, References). No more
  // "thicker outer / thinner inner" distinction — fully uniform per the
  // owner's explicit request.
  table: { borderWidth: 0.6, borderColor: "#000000", marginBottom: 6, marginTop: 2 },
  tr: { flexDirection: "row" },
  th: { fontSize: 7, fontWeight: "bold", padding: 3, borderRightWidth: 0.6, borderBottomWidth: 0.6, borderColor: "#000000", textAlign: "center" },
  thLast: { borderRightWidth: 0 },
  td: { fontSize: 8.5, paddingVertical: 3, paddingHorizontal: 3, borderRightWidth: 0.6, borderColor: "#000000", minHeight: 15, justifyContent: "center" },
  tdText: { fontSize: 8.5 },
  tdLast: { borderRightWidth: 0 },
  trBottom: { borderBottomWidth: 0.6, borderColor: "#000000" },

  paragraphLabel: { fontSize: 9, marginTop: 4 },
  paragraphLabelEn: { fontSize: 7, fontStyle: "italic", color: "#a3a3a3" },
  paragraphBox: { fontSize: 9, lineHeight: 1.4, color: "#262626", borderWidth: 0.6, borderStyle: "dotted", borderColor: "#a3a3a3", padding: 4, marginTop: 2, minHeight: 16 },

  certifyTh: { fontSize: 8.5, lineHeight: 1.45, color: "#262626" },
  certifyEn: { fontSize: 7, fontStyle: "italic", lineHeight: 1.35, color: "#a3a3a3", marginTop: 2 },

  footer: { position: "absolute", bottom: 12, left: 30, right: 30, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 7, color: "#a3a3a3" },
});

/** Inline "label : value(underline)" field. `width` fixes the column; omit for flex:1. */
export function Field({
  label,
  value,
  suffix,
  en,
  width,
}: {
  label: string;
  value?: string | number | null;
  suffix?: string;
  en?: string;
  width?: number | string;
}) {
  return (
    <View style={[styles.fieldWrap, width !== undefined ? { width } : { flex: 1 }]}>
      <View style={styles.fieldInline}>
        <Text style={styles.fieldLabel}>{pad(label)}</Text>
        <View style={styles.fieldValueBox}>
          <Text style={styles.fieldValue}>{pad(value)}</Text>
        </View>
        {suffix ? <Text style={styles.fieldSuffix}>{pad(suffix)}</Text> : null}
      </View>
      {en ? <Text style={styles.fieldEn}>{en}</Text> : null}
    </View>
  );
}

export function Section({ en, th }: { en: string; th: string }) {
  return (
    <View style={styles.sectionBar} wrap={false}>
      <Text style={styles.sectionBarEn}>{pad(en)}</Text>
      <Text style={styles.sectionBarTh}>{pad(`(${th})`)}</Text>
    </View>
  );
}

export function Check({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <View style={styles.checkOption}>
      <View style={[styles.checkBox, checked ? styles.checkBoxOn : {}]}>
        {checked ? <Text style={styles.checkTick}>✓</Text> : null}
      </View>
      <Text style={styles.checkText}>{pad(label)}</Text>
    </View>
  );
}

export function CheckRow({ label, en, children }: { label?: string; en?: string; children: React.ReactNode }) {
  return (
    <View style={styles.checkRow} wrap={false}>
      {label ? <Text style={styles.checkLabel}>{pad(label)}</Text> : null}
      {children}
      {en ? <Text style={styles.fieldEn}>{en}</Text> : null}
    </View>
  );
}

/** Yes/No pair with the paper form's custom labels; renders neither box ticked
 *  when the value is still undefined (unanswered). */
export function YesNoRow({
  label,
  en,
  value,
  yes = "ได้",
  no = "ไม่ได้",
  children,
}: {
  label: string;
  en?: string;
  value?: boolean;
  yes?: string;
  no?: string;
  children?: React.ReactNode;
}) {
  return (
    <View style={styles.checkRow} wrap={false}>
      <Text style={styles.checkLabel}>{pad(label)}</Text>
      <Check label={no} checked={value === false} />
      <Check label={yes} checked={value === true} />
      {children}
      {en ? <Text style={styles.fieldEn}>{en}</Text> : null}
    </View>
  );
}
