import { Svg, G, Rect, Path, Circle, Line, Text as SvgText } from "@react-pdf/renderer";
import { orgIconByKey, type OrgChartNode } from "@/lib/org-icons";

/** Serialisable payload the builder hands to the PDF so the org chart can be
 *  redrawn as true vector (crisp, never distorted) rather than a raster image.
 *  `aspect` = box height / width; `nodePxRatio` = node size / box width — both
 *  captured at edit time so the PDF reproduces the on-screen proportions. */
export type OrgChartPayload = {
  nodes: OrgChartNode[];
  aspect: number;
  nodePxRatio: number;
};

/** One 400×400 role card, drawn with react-pdf SVG primitives (mirrors
 *  orgIconInner in org-icons.ts). Vector → stays crisp at any zoom. */
function OrgIcon({ color, label }: { color: string; label: string }) {
  return (
    <>
      <Rect x={10} y={10} width={380} height={380} rx={40} fill="#ffffff" stroke={color} strokeWidth={3} />
      <Path d="M 10 50 C 10 27.9, 27.9 10, 50 10 L 350 10 C 372.1 10, 390 27.9, 390 50 L 390 66 L 10 66 Z" fill={color} />
      <Circle cx={200} cy={176} r={82} fill={color} fillOpacity={0.1} />
      <Circle cx={200} cy={176} r={82} fill="none" stroke={color} strokeWidth={2.5} />
      <Circle cx={200} cy={144} r={34} fill={color} />
      <Path d="M 122 244 C 122 198, 156 174, 200 174 C 244 174, 278 198, 278 244 L 278 256 C 278 263, 272 268, 265 268 L 135 268 C 128 268, 122 263, 122 256 Z" fill={color} />
      <Line x1={70} y1={298} x2={330} y2={298} stroke={color} strokeOpacity={0.35} strokeWidth={1.5} />
      <SvgText x={200} y={352} fill={color} textAnchor="middle" style={{ fontFamily: "Sarabun", fontSize: 34, fontWeight: "bold" }}>
        {label}
      </SvgText>
    </>
  );
}

/** Renders the placed org-chart nodes into a vector SVG of the given width,
 *  preserving the on-screen layout via the stored aspect / node-size ratios. */
export function OrgChartPdf({ payload, width }: { payload: OrgChartPayload; width: number }) {
  const { nodes, aspect, nodePxRatio } = payload;
  const boxW = width;
  const boxH = Math.max(40, width * (aspect || 0.42));
  const nodePx = nodePxRatio > 0 ? nodePxRatio * width : width * 0.14;
  const scale = nodePx / 400;

  return (
    <Svg width={boxW} height={boxH} viewBox={`0 0 ${boxW} ${boxH}`}>
      <Rect x={0.5} y={0.5} width={boxW - 1} height={boxH - 1} fill="#ffffff" stroke="#a3a3a3" strokeWidth={0.75} />
      {nodes.map((node, i) => {
        const icon = orgIconByKey(node.key);
        if (!icon) return null;
        const cx = (node.xPct / 100) * boxW;
        const cy = (node.yPct / 100) * boxH;
        const tx = cx - nodePx / 2;
        const ty = cy - nodePx / 2;
        return (
          <G key={node.id ?? i} transform={`translate(${tx.toFixed(2)}, ${ty.toFixed(2)}) scale(${scale.toFixed(4)})`}>
            <OrgIcon color={icon.color} label={icon.label} />
          </G>
        );
      })}
    </Svg>
  );
}
