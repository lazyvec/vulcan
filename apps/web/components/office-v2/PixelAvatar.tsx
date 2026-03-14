"use client";

import { useMemo } from "react";

interface PixelAvatarProps {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  size?: number;
  className?: string;
}

/** 에이전트 이름을 시드로 결정론적 8x8 대칭 픽셀 패턴 생성 */
function generatePattern(seed: string): boolean[][] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }

  const grid: boolean[][] = [];
  for (let y = 0; y < 8; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < 4; x++) {
      // 각 셀 결정 (시드 기반)
      hash = ((hash * 16807) + 1) | 0;
      const val = ((hash >>> 0) % 100) < 45;
      row.push(val);
    }
    // 좌우 대칭
    grid.push([...row, ...row.slice().reverse()]);
  }
  return grid;
}

export function PixelAvatar({
  name,
  primaryColor,
  secondaryColor,
  size = 32,
  className = "",
}: PixelAvatarProps) {
  const pattern = useMemo(() => generatePattern(name), [name]);
  const cellSize = size / 8;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ imageRendering: "pixelated" }}
      role="img"
      aria-label={`${name} 아바타`}
    >
      {/* 배경 (둥근 사각형) */}
      <rect
        width={size}
        height={size}
        rx={size * 0.15}
        fill={`color-mix(in srgb, ${primaryColor} 15%, var(--color-background))`}
      />

      {/* 픽셀 패턴 */}
      {pattern.map((row, y) =>
        row.map(
          (filled, x) =>
            filled && (
              <rect
                key={`${x}-${y}`}
                x={x * cellSize}
                y={y * cellSize}
                width={cellSize}
                height={cellSize}
                fill={y < 3 ? primaryColor : secondaryColor}
                opacity={y === 0 || y === 7 ? 0.6 : 0.9}
              />
            ),
        ),
      )}

      {/* 이니셜 오버레이 */}
      <text
        x={size / 2}
        y={size / 2 + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size * 0.3}
        fontWeight="900"
        fill="var(--color-foreground)"
      >
        {name.slice(0, 2).toUpperCase()}
      </text>
    </svg>
  );
}
