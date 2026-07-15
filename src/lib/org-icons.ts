// Org-chart position icons — the 9 role cards the applicant drags into the
// "โครงสร้างองค์กร" builder. Every card shares one 400×400 layout (white card,
// coloured top bar, avatar, role label); only the colour and label differ, so
// they're generated parametrically from this manifest rather than shipped as 9
// separate SVG files. The same generator feeds both the on-screen builder and
// the PNG snapshot embedded in the generated PDF.

export type OrgIcon = { key: string; label: string; color: string };

export const ORG_ICONS: OrgIcon[] = [
  { key: "self", label: "ตนเอง", color: "#DC2626" },
  { key: "manager", label: "ผู้จัดการ", color: "#1E3A8A" },
  { key: "sales", label: "ฝ่ายขาย", color: "#16A34A" },
  { key: "marketing", label: "การตลาด", color: "#16A34A" },
  { key: "admin", label: "แอดมิน", color: "#7DA7D9" },
  { key: "accounting", label: "บัญชี", color: "#7DA7D9" },
  { key: "hr", label: "HR", color: "#7DA7D9" },
  { key: "purchasing", label: "จัดซื้อ", color: "#7DA7D9" },
  { key: "it", label: "IT", color: "#7DA7D9" },
];

export function orgIconByKey(key: string): OrgIcon | undefined {
  return ORG_ICONS.find((icon) => icon.key === key);
}

// Inner markup (children of the <svg>) for one role card. `uid` uniquifies the
// drop-shadow filter id so several cards can share one composite SVG document
// without id collisions. Shadow is optional — dropped in the flat PNG export.
export function orgIconInner(color: string, label: string, uid: string, withShadow = true): string {
  const fid = `orgShadow-${uid}`;
  const defs = withShadow
    ? `<defs><filter id="${fid}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.12"/></filter></defs>`
    : "";
  const shadowRef = withShadow ? ` filter="url(#${fid})"` : "";
  return `${defs}<rect x="10" y="10" width="380" height="380" rx="40" fill="#ffffff" stroke="${color}" stroke-width="3"${shadowRef}/><path d="M 10 50 C 10 27.9, 27.9 10, 50 10 L 350 10 C 372.1 10, 390 27.9, 390 50 L 390 66 L 10 66 Z" fill="${color}"/><circle cx="200" cy="176" r="82" fill="${color}" fill-opacity="0.10"/><circle cx="200" cy="176" r="82" fill="none" stroke="${color}" stroke-width="2.5"/><circle cx="200" cy="144" r="34" fill="${color}"/><path d="M 122 244 C 122 198, 156 174, 200 174 C 244 174, 278 198, 278 244 L 278 256 C 278 263, 272 268, 265 268 L 135 268 C 128 268, 122 263, 122 256 Z" fill="${color}"/><line x1="70" y1="298" x2="330" y2="298" stroke="${color}" stroke-opacity="0.35" stroke-width="1.5"/><text x="200" y="342" font-family="'Tahoma','Leelawadee UI','Segoe UI',sans-serif" font-size="34" font-weight="bold" fill="${color}" text-anchor="middle" dominant-baseline="central">${label}</text>`;
}

// Standalone 400×400 SVG for a single card (used by the palette / placed nodes).
export function orgIconSvg(color: string, label: string, uid: string, withShadow = true): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">${orgIconInner(color, label, uid, withShadow)}</svg>`;
}

// data: URI for use as an <img> src — encodeURIComponent keeps Thai labels intact.
export function orgIconDataUri(color: string, label: string, uid: string): string {
  return `data:image/svg+xml,${encodeURIComponent(orgIconSvg(color, label, uid))}`;
}

export type OrgChartNode = { id: string; key: string; xPct: number; yPct: number };

// Rasterise the placed nodes into a PNG data URL. Nodes are composed into one
// self-contained SVG (no external refs → canvas is not tainted → toDataURL
// works), then drawn to a 2× canvas for crispness. Runs in the browser only.
export async function composeOrgChartPng(
  nodes: OrgChartNode[],
  canvasW: number,
  canvasH: number,
  nodePx: number
): Promise<string> {
  const inner = nodes
    .map((node, i) => {
      const icon = orgIconByKey(node.key);
      if (!icon) return "";
      const x = (node.xPct / 100) * canvasW - nodePx / 2;
      const y = (node.yPct / 100) * canvasH - nodePx / 2;
      return `<svg x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${nodePx}" height="${nodePx}" viewBox="0 0 400 400" overflow="visible">${orgIconInner(icon.color, icon.label, `n${i}`, false)}</svg>`;
    })
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}"><rect width="${canvasW}" height="${canvasH}" fill="#ffffff"/>${inner}</svg>`;

  const scale = 2;
  return await new Promise<string>((resolve, reject) => {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new window.Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(canvasW * scale);
        canvas.height = Math.round(canvasH * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/png");
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("failed to rasterise org chart"));
    };
    img.src = url;
  });
}
