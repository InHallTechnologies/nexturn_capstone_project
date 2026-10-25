import React, { useState } from 'react';

export const AreaChart = ({
  data = [], // [{ label, value }]
  height = 240,
  strokeColor = '#2563eb',
  gradientFrom = 'rgba(37, 99, 235, 0.25)',
  gradientTo = 'rgba(37, 99, 235, 0.0)',
  valuePrefix = '$',
  emptyMessage = 'No sales data to chart for this period',
}) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
          backgroundColor: '#fafbfc',
          borderRadius: 'var(--radius-md)',
          border: '1px dashed var(--border-medium)',
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 35, left: 55 };
  const width = 650;
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const rawValues = data.map((d) => Number(d.value) || 0);
  const maxValue = Math.max(...rawValues, 10);
  const yTicks = [0, Math.round(maxValue * 0.33), Math.round(maxValue * 0.66), maxValue];

  const points = data.map((d, index) => {
    const x = padding.left + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const y = padding.top + chartHeight - (Number(d.value || 0) / maxValue) * chartHeight;
    return { x, y, label: d.label, value: Number(d.value) || 0 };
  });

  const pathD = points.reduce((acc, point, index) => {
    return `${acc} ${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={gradientFrom} />
            <stop offset="100%" stopColor={gradientTo} />
          </linearGradient>
        </defs>

        {/* Y Grid lines and labels */}
        {yTicks.map((tick, i) => {
          const y = padding.top + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#64748b"
                fontFamily="inherit"
              >
                {valuePrefix}
                {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
              </text>
            </g>
          );
        })}

        {/* Filled Area */}
        <path d={areaD} fill="url(#areaGradient)" />

        {/* Stroke Line */}
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />

        {/* Data points & X Labels */}
        {points.map((p, i) => {
          // Show reduced labels to avoid clutter
          const showLabel = data.length <= 8 || i % Math.ceil(data.length / 6) === 0 || i === data.length - 1;
          const isHovered = hoveredPoint?.index === i;

          return (
            <g key={i}>
              {showLabel && (
                <text
                  x={p.x}
                  y={height - 10}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748b"
                  fontFamily="inherit"
                >
                  {p.label}
                </text>
              )}
              {/* Invisible larger hit target for smooth hover */}
              <circle
                cx={p.x}
                cy={p.y}
                r="12"
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPoint({ ...p, index: i })}
                onMouseLeave={() => setHoveredPoint(null)}
              />
              {/* Visible dot on hover */}
              {isHovered && (
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#ffffff"
                  stroke={strokeColor}
                  strokeWidth="2.5"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint && (
        <div
          style={{
            position: 'absolute',
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: 'translate(-50%, -120%)',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '0.4rem 0.65rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            boxShadow: 'var(--shadow-md)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          <div style={{ opacity: 0.75, fontSize: '0.7rem' }}>{hoveredPoint.label}</div>
          <div style={{ fontWeight: 700 }}>
            {valuePrefix}
            {hoveredPoint.value.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AreaChart;
