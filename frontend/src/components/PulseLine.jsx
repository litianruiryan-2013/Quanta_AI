import { useId, useMemo } from "react";

const COLORS = {
  ember: "#F0741F",
  up: "#22C38E",
  down: "#F2546E",
};

/**
 * Reusable SVG sparkline. Ember with a soft glow by default; pass
 * variant="up"/"down" (or leave "auto" to infer from the data trend) to
 * reflect a gain/loss. Orange is never used to mean up/down — only as the
 * neutral/brand default when direction isn't the point.
 */
export default function PulseLine({
  data,
  variant = "auto",
  width = 120,
  height = 32,
  strokeWidth = 2,
  glow = true,
  animate = true,
  fill = true,
  className = "",
}) {
  const rawId = useId();
  const id = rawId.replace(/[:]/g, "");
  const clean = (data || []).filter((n) => typeof n === "number" && !Number.isNaN(n));

  const resolvedVariant =
    variant === "auto"
      ? clean.length >= 2
        ? clean[clean.length - 1] >= clean[0] ? "up" : "down"
        : "ember"
      : variant;
  const color = COLORS[resolvedVariant] || COLORS.ember;

  const { linePath, areaPath } = useMemo(() => {
    if (clean.length < 2) return { linePath: "", areaPath: "" };
    const min = Math.min(...clean);
    const max = Math.max(...clean);
    const range = max - min || 1;
    const pad = strokeWidth;
    const usableH = height - pad * 2;
    const stepX = width / (clean.length - 1);
    const points = clean.map((v, i) => {
      const x = i * stepX;
      const y = pad + usableH - ((v - min) / range) * usableH;
      return [x, y];
    });
    const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { linePath: line, areaPath: area };
  }, [clean, width, height, strokeWidth]);

  if (clean.length < 2) {
    return <div className={className} style={{ width, height }} aria-hidden="true" />;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`plGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        {glow && (
          <filter id={`plGlow-${id}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>

      {fill && <path d={areaPath} fill={`url(#plGrad-${id})`} className={animate ? "pulseline-area" : ""} />}

      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={glow ? `url(#plGlow-${id})` : undefined}
        className={animate ? "pulseline-line" : ""}
        style={animate ? { strokeDasharray: 1000, "--pl-len": 1000 } : undefined}
      />
    </svg>
  );
}
