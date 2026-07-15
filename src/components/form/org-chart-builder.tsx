"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";
import type { ApplicationFormValues } from "@/lib/application-schema";
import type { OrgChartPayload } from "@/lib/pdf/OrgChartPdf";
import {
  ORG_ICONS,
  orgIconByKey,
  orgIconDataUri,
  composeOrgChartPng,
  type OrgChartNode,
} from "@/lib/org-icons";

const NODE_PX = 76;

type Drag =
  | { kind: "new"; key: string; clientX: number; clientY: number }
  | { kind: "move"; id: string; clientX: number; clientY: number; grabDxPx: number; grabDyPx: number };

/**
 * Drag-and-drop org-chart builder. The applicant drags role cards from the
 * palette into the frame and arranges them freely (no connector lines — the
 * spatial layout conveys the hierarchy). On every commit (add / move-end /
 * delete) the placed nodes are rasterised to a PNG data URL and written into
 * the `orgChartDescription` form field, which the PDF renders as an image.
 */
export function OrgChartBuilder({
  className,
  onPayloadChange,
}: {
  className?: string;
  /** Emits the placed nodes + box proportions so the PDF can redraw the chart
   *  as true vector (crisp, undistorted) instead of a raster image. */
  onPayloadChange?: (payload: OrgChartPayload | null) => void;
}) {
  const { setValue } = useFormContext<ApplicationFormValues>();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<OrgChartNode[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  // Mirror of `nodes` for reads inside pointer handlers/async callbacks that
  // are created before the latest state has flushed.
  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  // Regenerate the PNG snapshot from the latest nodes and push it into the form.
  const syncSnapshot = useCallback(
    async (next: OrgChartNode[]) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect || next.length === 0) {
        setValue("orgChartDescription", "", { shouldDirty: true });
        onPayloadChange?.(null);
        return;
      }
      // Vector payload for the PDF: node positions plus box proportions.
      onPayloadChange?.({
        nodes: next.map((n) => ({ ...n })),
        aspect: rect.height / rect.width,
        nodePxRatio: NODE_PX / rect.width,
      });
      try {
        const dataUrl = await composeOrgChartPng(next, rect.width, rect.height, NODE_PX);
        setValue("orgChartDescription", dataUrl, { shouldDirty: true });
      } catch {
        /* rasterisation failed — leave previous value untouched */
      }
    },
    [setValue, onPayloadChange]
  );

  const clampPct = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const halfX = (NODE_PX / 2 / rect.width) * 100;
    const halfY = (NODE_PX / 2 / rect.height) * 100;
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yPct = ((clientY - rect.top) / rect.height) * 100;
    return {
      xPct: Math.min(100 - halfX, Math.max(halfX, xPct)),
      yPct: Math.min(100 - halfY, Math.max(halfY, yPct)),
    };
  }, []);

  const isInsideCanvas = useCallback((clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }, []);

  // Global pointer handlers while a drag is in progress.
  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      e.preventDefault();
      if (drag.kind === "move") {
        const { xPct, yPct } = clampPct(e.clientX - drag.grabDxPx, e.clientY - drag.grabDyPx);
        setNodes((prev) => prev.map((n) => (n.id === drag.id ? { ...n, xPct, yPct } : n)));
      }
      setDrag((d) => (d ? { ...d, clientX: e.clientX, clientY: e.clientY } : d));
    };

    const onUp = (e: PointerEvent) => {
      if (drag.kind === "new") {
        if (isInsideCanvas(e.clientX, e.clientY)) {
          const { xPct, yPct } = clampPct(e.clientX, e.clientY);
          const node: OrgChartNode = { id: crypto.randomUUID(), key: drag.key, xPct, yPct };
          const next = [...nodesRef.current, node];
          setNodes(next);
          void syncSnapshot(next);
        }
      } else {
        void syncSnapshot(nodesRef.current);
      }
      setDrag(null);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [drag, clampPct, isInsideCanvas, syncSnapshot]);

  const startNewDrag = (e: React.PointerEvent, key: string) => {
    e.preventDefault();
    setDrag({ kind: "new", key, clientX: e.clientX, clientY: e.clientY });
  };

  const startMoveDrag = (e: React.PointerEvent, node: OrgChartNode) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = canvasRef.current!.getBoundingClientRect();
    const centerX = rect.left + (node.xPct / 100) * rect.width;
    const centerY = rect.top + (node.yPct / 100) * rect.height;
    setDrag({
      kind: "move",
      id: node.id,
      clientX: e.clientX,
      clientY: e.clientY,
      grabDxPx: e.clientX - centerX,
      grabDyPx: e.clientY - centerY,
    });
  };

  const removeNode = (id: string) => {
    const next = nodesRef.current.filter((n) => n.id !== id);
    setNodes(next);
    void syncSnapshot(next);
  };

  const clearAll = () => {
    setNodes([]);
    void syncSnapshot([]);
  };

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between">
        <span className="text-[15px]">จงวาดผังโครงสร้างองค์กรหรือแผนก ของคุณ (ที่ทำงานล่าสุด)</span>
        {nodes.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="no-print text-[12px] font-medium text-red-600 hover:underline"
          >
            ล้างทั้งหมด
          </button>
        )}
      </div>
      <p className="no-print mt-0.5 text-[12px] text-neutral-500">
        ลากไอคอนตำแหน่งจากด้านล่าง มาวางในกรอบ แล้วจัดวางเป็นผังโครงสร้างองค์กรได้อิสระ
      </p>

      {/* Canvas frame */}
      <div
        ref={canvasRef}
        className="relative mt-1.5 w-full overflow-hidden rounded border border-dashed border-neutral-400 bg-neutral-50"
        style={{ height: 300, touchAction: "none" }}
      >
        {nodes.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-[13px] text-neutral-400">
            ลากไอคอนมาวางที่นี่
          </div>
        )}
        {nodes.map((node) => {
          const icon = orgIconByKey(node.key);
          if (!icon) return null;
          return (
            <div
              key={node.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2 select-none"
              style={{
                left: `${node.xPct}%`,
                top: `${node.yPct}%`,
                width: NODE_PX,
                height: NODE_PX,
                cursor: drag?.kind === "move" && drag.id === node.id ? "grabbing" : "grab",
                touchAction: "none",
              }}
              onPointerDown={(e) => startMoveDrag(e, node)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={orgIconDataUri(icon.color, icon.label, node.key)}
                alt={icon.label}
                draggable={false}
                className="pointer-events-none h-full w-full"
              />
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => removeNode(node.id)}
                aria-label={`ลบ ${icon.label}`}
                className="no-print absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[12px] leading-none text-white opacity-0 shadow transition group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* Palette */}
      <div className="no-print mt-2 flex flex-wrap gap-2">
        {ORG_ICONS.map((icon) => (
          <button
            key={icon.key}
            type="button"
            onPointerDown={(e) => startNewDrag(e, icon.key)}
            className="flex flex-col items-center gap-1 rounded border border-neutral-300 bg-white p-1.5 transition hover:border-neutral-500 hover:shadow-sm"
            style={{ touchAction: "none", cursor: "grab" }}
            title={`ลาก "${icon.label}" ลงในกรอบ`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={orgIconDataUri(icon.color, icon.label, icon.key)}
              alt={icon.label}
              draggable={false}
              className="pointer-events-none h-11 w-11"
            />
          </button>
        ))}
      </div>

      {/* Drag ghost — follows the pointer while dragging a new icon from the palette */}
      {drag?.kind === "new" &&
        (() => {
          const icon = orgIconByKey(drag.key);
          if (!icon) return null;
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={orgIconDataUri(icon.color, icon.label, drag.key)}
              alt=""
              draggable={false}
              className="pointer-events-none fixed z-50 opacity-80"
              style={{
                left: drag.clientX,
                top: drag.clientY,
                width: NODE_PX,
                height: NODE_PX,
                transform: "translate(-50%, -50%)",
              }}
            />
          );
        })()}
    </div>
  );
}
