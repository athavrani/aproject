"use client";

import { useMemo, useRef, useState } from "react";

const MONTHS = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const CHART_LEFT = 40;
const CHART_RIGHT = 620;
const CHART_TOP = 10;
const CHART_BOTTOM = 176;

// Small deterministic PRNG so the same strategy always renders the same
// illustrative curve on every load, rather than a fresh random one.
function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function buildPoints(seed: string, endValue: number) {
  const rand = seededRandom(seed);
  const n = MONTHS.length;
  const values: number[] = [0];
  for (let i = 1; i < n - 1; i++) {
    const base = (endValue * i) / (n - 1);
    const wobble = (rand() - 0.5) * Math.abs(endValue) * 0.25;
    values.push(base + wobble);
  }
  values.push(endValue);

  const maxAbs = Math.max(...values.map((v) => Math.abs(v)), Math.abs(endValue), 1);
  const axisMax = Math.ceil((maxAbs * 1.15) / 5) * 5;

  const points = MONTHS.map((month, i) => {
    const x = CHART_LEFT + (i * (CHART_RIGHT - CHART_LEFT)) / (n - 1);
    const y = CHART_BOTTOM - (values[i] / axisMax) * (CHART_BOTTOM - CHART_TOP);
    return { x, y, month, value: values[i] };
  });

  return { points, axisMax };
}

export default function PerformanceChart({
  seed,
  endValue,
}: {
  seed: string;
  endValue: number;
}) {
  const { points, axisMax } = useMemo(() => buildPoints(seed, endValue), [seed, endValue]);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ x: number; y: number; month: string; value: number } | null>(null);

  function handleMove(e: React.PointerEvent<SVGRectElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * 640;
    let nearest = points[0];
    let best = Math.abs(points[0].x - svgX);
    for (const p of points) {
      const d = Math.abs(p.x - svgX);
      if (d < best) { best = d; nearest = p; }
    }
    setHover(nearest);
  }

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x.toFixed(1)},${CHART_BOTTOM} L${CHART_LEFT},${CHART_BOTTOM} Z`;
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
  const last = points[points.length - 1];

  return (
    <div className="relative">
      <svg ref={svgRef} viewBox="0 0 640 200" className="w-full h-auto block font-sans">
        {gridSteps.map((step) => {
          const y = CHART_BOTTOM - step * (CHART_BOTTOM - CHART_TOP);
          const label = Math.round(axisMax * step);
          return (
            <g key={step}>
              <line x1={CHART_LEFT} y1={y} x2={CHART_RIGHT} y2={y} stroke={step === 0 ? "#c3c2b7" : "#e1e0d9"} strokeWidth="1" />
              <text x={CHART_LEFT - 6} y={y + 3} textAnchor="end" fontSize="11" fill="#898781">{label}%</text>
            </g>
          );
        })}

        <path d={areaPath} fill="var(--accent)" opacity="0.1" stroke="none" />
        <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        <circle cx={last.x} cy={last.y} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
        <text x={last.x + 6} y={last.y - 6} fontSize="12" fontWeight="600" fill="var(--foreground)">
          {endValue >= 0 ? "+" : ""}{endValue.toFixed(1)}%
        </text>

        {points.map((p) => (
          <text key={p.month} x={p.x} y={192} fontSize="11" fill="#898781" textAnchor="middle">{p.month}</text>
        ))}

        {hover && (
          <>
            <line x1={hover.x} y1={CHART_TOP} x2={hover.x} y2={CHART_BOTTOM} stroke="#898781" strokeWidth="1" />
            <circle cx={hover.x} cy={hover.y} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
          </>
        )}

        <rect
          x={CHART_LEFT}
          y={0}
          width={CHART_RIGHT - CHART_LEFT}
          height={200}
          fill="transparent"
          style={{ cursor: "crosshair" }}
          onPointerMove={handleMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
      {hover && (
        <div
          className="absolute pointer-events-none bg-foreground text-white text-xs px-2.5 py-1.5 rounded-md whitespace-nowrap"
          style={{
            left: `${(hover.x / 640) * 100}%`,
            top: `${(hover.y / 200) * 100}%`,
            transform: "translate(-50%, -130%)",
          }}
        >
          {hover.month}: {hover.value >= 0 ? "+" : ""}{hover.value.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
