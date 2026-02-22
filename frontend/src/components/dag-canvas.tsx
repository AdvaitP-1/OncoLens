"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DagNode, DagEdge } from "@/lib/dag-data";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;
const NODE_RADIUS = 12;

const TYPE_COLORS: Record<DagNode["type"], string> = {
  source: "#4da6ff",
  process: "#44c9a1",
  transform: "#e0a645",
  output: "#e0626e",
};

const STATUS_GLOW: Record<DagNode["status"], string> = {
  active: "rgba(77, 166, 255, 0.35)",
  idle: "rgba(100, 100, 120, 0.25)",
  warning: "rgba(224, 166, 69, 0.45)",
};

function drawBezierEdge(
  ctx: CanvasRenderingContext2D,
  from: DagNode,
  to: DagNode,
  highlight: boolean
) {
  const startX = from.x + NODE_WIDTH;
  const startY = from.y + NODE_HEIGHT / 2;
  const endX = to.x;
  const endY = to.y + NODE_HEIGHT / 2;
  const cpOffset = Math.abs(endX - startX) * 0.45;

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(
    startX + cpOffset,
    startY,
    endX - cpOffset,
    endY,
    endX,
    endY
  );
  ctx.strokeStyle = highlight
    ? "rgba(77, 166, 255, 0.7)"
    : "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = highlight ? 2.5 : 1.5;
  ctx.stroke();

  const arrowSize = 7;
  const angle = Math.atan2(endY - (endY + startY) / 2, endX - (endX - cpOffset));
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowSize * Math.cos(angle - Math.PI / 7),
    endY - arrowSize * Math.sin(angle - Math.PI / 7)
  );
  ctx.lineTo(
    endX - arrowSize * Math.cos(angle + Math.PI / 7),
    endY - arrowSize * Math.sin(angle + Math.PI / 7)
  );
  ctx.closePath();
  ctx.fillStyle = highlight
    ? "rgba(77, 166, 255, 0.7)"
    : "rgba(255, 255, 255, 0.12)";
  ctx.fill();
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: DagNode,
  isSelected: boolean,
  isHovered: boolean,
  isProcessing: boolean = false
) {
  const { x, y, label, type, status } = node;
  const color = TYPE_COLORS[type];

  if (isSelected || isHovered || isProcessing) {
    ctx.shadowColor = color;
    ctx.shadowBlur = isSelected ? 24 : isProcessing ? 20 : 14;
  }

  ctx.beginPath();
  ctx.roundRect(x, y, NODE_WIDTH, NODE_HEIGHT, NODE_RADIUS);
  ctx.fillStyle = isSelected
    ? "rgba(255, 255, 255, 0.12)"
    : isHovered
      ? "rgba(255, 255, 255, 0.07)"
      : "rgba(255, 255, 255, 0.04)";
  ctx.fill();

  ctx.strokeStyle = isSelected
    ? color
    : isHovered || isProcessing
      ? `${color}88`
      : "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;

  const dotRadius = 4;
  const dotX = x + 16;
  const dotY = y + NODE_HEIGHT / 2;
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
  ctx.fillStyle =
    status === "active"
      ? "#4da6ff"
      : status === "warning"
        ? "#e0a645"
        : "#555";
  ctx.fill();

  if (status === "active" || isProcessing) {
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotRadius + 3, 0, Math.PI * 2);
    ctx.strokeStyle = isProcessing ? "rgba(77, 166, 255, 0.6)" : STATUS_GLOW[status];
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.fillStyle = isSelected || isProcessing ? "#fff" : "rgba(255, 255, 255, 0.85)";
  ctx.font = "600 13px 'Geist', system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 30, y + NODE_HEIGHT / 2, NODE_WIDTH - 40);

  ctx.beginPath();
  ctx.roundRect(x + 8, y + 4, 28, 3, 1.5);
  ctx.fillStyle = color;
  ctx.fill();
}

const NODE_ORDER = ["wearables", "vision", "fusion", "guardrails", "decision"];

interface DagCanvasProps {
  nodes: DagNode[];
  edges: DagEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  processingStep?: number;
  isProcessing?: boolean;
}

export function DagCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodeSelect,
  processingStep = -1,
  isProcessing = false,
}: DagCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPos = useRef({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const getConnectedEdges = useCallback(
    (nodeId: string | null) => {
      if (!nodeId) return new Set<string>();
      const connected = new Set<string>();
      edges.forEach((e) => {
        if (e.from === nodeId || e.to === nodeId) {
          connected.add(e.from);
          connected.add(e.to);
        }
      });
      return connected;
    },
    [edges]
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(scale, scale);

    const gridSize = 30;
    ctx.fillStyle = "rgba(255, 255, 255, 0.025)";
    for (let gx = 0; gx < rect.width / scale + 200; gx += gridSize) {
      for (let gy = 0; gy < rect.height / scale + 200; gy += gridSize) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const activeNodeId = selectedNodeId || hoveredNodeId;
    const processingNodeId =
      isProcessing && processingStep >= 0 && processingStep < NODE_ORDER.length
        ? NODE_ORDER[processingStep]
        : null;

    edges.forEach((edge) => {
      const fromNode = nodes.find((n) => n.id === edge.from);
      const toNode = nodes.find((n) => n.id === edge.to);
      if (!fromNode || !toNode) return;
      const highlight =
        activeNodeId !== null &&
        (edge.from === activeNodeId || edge.to === activeNodeId);
      const processingHighlight =
        processingNodeId !== null &&
        (edge.to === processingNodeId || edge.from === processingNodeId);
      drawBezierEdge(ctx, fromNode, toNode, highlight || processingHighlight);
    });

    nodes.forEach((node) => {
      const isSelected = node.id === selectedNodeId;
      const isHovered = node.id === hoveredNodeId;
      const isProcessingNode = node.id === processingNodeId;
      drawNode(ctx, node, isSelected, isHovered, isProcessingNode);
    });

    ctx.restore();
  }, [nodes, edges, selectedNodeId, hoveredNodeId, panOffset, scale, processingStep, isProcessing]);

  useEffect(() => {
    draw();
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  const getNodeAtPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left - panOffset.x) / scale;
      const y = (clientY - rect.top - panOffset.y) / scale;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (
          x >= node.x &&
          x <= node.x + NODE_WIDTH &&
          y >= node.y &&
          y <= node.y + NODE_HEIGHT
        ) {
          return node;
        }
      }
      return null;
    },
    [nodes, panOffset, scale]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const node = getNodeAtPoint(e.clientX, e.clientY);
      if (!node) {
        setIsPanning(true);
        lastPanPos.current = { x: e.clientX, y: e.clientY };
      }
    },
    [getNodeAtPoint]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - lastPanPos.current.x;
        const dy = e.clientY - lastPanPos.current.y;
        setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const node = getNodeAtPoint(e.clientX, e.clientY);
      setHoveredNodeId(node?.id || null);
      if (canvasRef.current) {
        canvasRef.current.style.cursor = node ? "pointer" : "grab";
      }
    },
    [isPanning, getNodeAtPoint]
  );

  const handleMouseUp = useCallback(() => {
    if (isPanning) setIsPanning(false);
  }, [isPanning]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const node = getNodeAtPoint(e.clientX, e.clientY);
      if (node) {
        onNodeSelect(node.id === selectedNodeId ? null : node.id);
      } else {
        onNodeSelect(null);
      }
    },
    [getNodeAtPoint, onNodeSelect, selectedNodeId]
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.95 : 1.05;
    setScale((prev) => Math.min(Math.max(prev * delta, 0.3), 3));
  }, []);

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full min-h-[400px] overflow-hidden rounded-lg bg-slate-900/50"
      role="img"
      aria-label={`Pipeline diagram: ${nodes.map((n) => n.label).join(", ")}. ${selectedNode ? `Selected: ${selectedNode.label}` : "Select a node for details"}`}
    >
      <div aria-live="polite" className="sr-only">
        {selectedNode ? `Selected node: ${selectedNode.label}` : "No node selected"}
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        aria-hidden="true"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredNodeId(null);
          setIsPanning(false);
        }}
        onClick={handleClick}
        onWheel={handleWheel}
      />
      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-1.5">
        <button
          onClick={() => setScale((s) => Math.min(s * 1.2, 3))}
          className="text-slate-400 text-sm font-mono hover:text-white"
          aria-label="Zoom in"
        >
          +
        </button>
        <span className="text-slate-400 text-xs font-mono min-w-[3ch] text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          onClick={() => setScale((s) => Math.max(s * 0.8, 0.3))}
          className="text-slate-400 text-sm font-mono hover:text-white"
          aria-label="Zoom out"
        >
          -
        </button>
      </div>
    </div>
  );
}
