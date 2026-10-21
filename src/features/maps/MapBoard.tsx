"use client";
import { useRef, useState } from "react";
import {
  terrains,
  symbols,
  symbolLabels,
  type AdventureMap,
} from "@/entities/map";
export function MapBoard({
  data,
  player = false,
  grid = true,
  paint,
  begin,
  zoom = 1,
}: {
  data: AdventureMap;
  player?: boolean;
  grid?: boolean;
  paint?: (x: number, y: number) => void;
  begin?: () => void;
  zoom?: number;
}) {
  const drawing = useRef(false),
    last = useRef("");
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  function point(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect(),
      x = Math.floor(((e.clientX - rect.left) / rect.width) * data.width),
      y = Math.floor(((e.clientY - rect.top) / rect.height) * data.height);
    if (
      x < 0 ||
      y < 0 ||
      x >= data.width ||
      y >= data.height ||
      last.current === `${x},${y}`
    )
      return;
    last.current = `${x},${y}`;
    setCursor({ x, y });
    paint?.(x, y);
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={paint ? "map-board editable" : "map-board"}
      viewBox={`0 0 ${data.width * 40} ${data.height * 40}`}
      style={{
        width: paint ? data.width * 32 * zoom : "100%",
        maxWidth: paint ? "none" : undefined,
      }}
      role="img"
      aria-label={`${data.name}, ${data.width} на ${data.height} клеток${paint ? ". Стрелки перемещают курсор, пробел рисует." : ""}`}
      tabIndex={paint ? 0 : undefined}
      onPointerDown={(e) => {
        if (!paint || e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.focus();
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = true;
        last.current = "";
        begin?.();
        point(e);
      }}
      onPointerMove={(e) => {
        if (drawing.current) point(e);
      }}
      onPointerUp={() => {
        drawing.current = false;
        last.current = "";
      }}
      onPointerCancel={() => {
        drawing.current = false;
        last.current = "";
      }}
      onKeyDown={(e) => {
        if (!paint) return;
        const directions: Record<string, number[]> = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        if (directions[e.key]) {
          e.preventDefault();
          const [dx, dy] = directions[e.key];
          setCursor((p) => ({
            x: Math.max(0, Math.min(data.width - 1, p.x + dx)),
            y: Math.max(0, Math.min(data.height - 1, p.y + dy)),
          }));
        }
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          begin?.();
          paint(
            Math.min(cursor.x, data.width - 1),
            Math.min(cursor.y, data.height - 1),
          );
        }
      }}
    >
      {data.cells.map((t, i) => (
        <rect
          key={i}
          x={(i % data.width) * 40}
          y={Math.floor(i / data.width) * 40}
          width="40"
          height="40"
          fill={terrains[t].color}
          stroke={grid ? "#ffffff33" : "none"}
        />
      ))}
      {data.markers
        .filter((p) => !player || !p.secret)
        .map((p) => (
          <g key={p.id}>
            <title>
              {p.label || symbolLabels[p.kind]}
              {p.secret ? " (скрыто)" : ""}
            </title>
            <circle
              cx={p.x * 40 + 20}
              cy={p.y * 40 + 20}
              r="15"
              fill={p.secret ? "#782a72" : "#faf2df"}
              stroke="#292d36"
            />
            <text
              x={p.x * 40 + 20}
              y={p.y * 40 + 26}
              textAnchor="middle"
              fontSize="20"
              fill={p.secret ? "white" : "#292d36"}
            >
              {symbols[p.kind]}
            </text>
            {p.label && (
              <text
                x={p.x * 40 + 20}
                y={p.y * 40 + 39}
                textAnchor="middle"
                fontSize="11"
                fill="white"
                stroke="#222"
                strokeWidth="3"
                paintOrder="stroke"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      {paint && (
        <rect
          x={Math.min(cursor.x, data.width - 1) * 40 + 1}
          y={Math.min(cursor.y, data.height - 1) * 40 + 1}
          width="38"
          height="38"
          fill="none"
          stroke="#fff"
          strokeWidth="3"
        />
      )}
    </svg>
  );
}
