import React, { useState } from 'react';
import { TrendingUp } from 'lucide-react';

/**
 * 1. Stacked Bar Chart matching the Inventra Reference Image:
 * Features 8 monthly bars with dual-color segments (#8CB843 lime-moss & #7E8CE0 periwinkle)
 * and an interactive floating tooltip card.
 */
export const StackedBarChart = () => {
  const [activeMonthIndex, setActiveMonthIndex] = useState(4); // Default to September (index 4)

  const months = [
    { name: 'May', sales: 26, units: 14, salesVal: '$3.8k', unitsVal: '320' },
    { name: 'Jun', sales: 32, units: 18, salesVal: '$4.2k', unitsVal: '380' },
    { name: 'Jul', sales: 42, units: 24, salesVal: '$5.6k', unitsVal: '460' },
    { name: 'Aug', sales: 30, units: 16, salesVal: '$4.0k', unitsVal: '340' },
    { name: 'Sep', sales: 36, units: 20, salesVal: '$4.5k', unitsVal: '400' }, // September 2025
    { name: 'Oct', sales: 22, units: 12, salesVal: '$3.1k', unitsVal: '280' },
    { name: 'Nov', sales: 44, units: 22, salesVal: '$5.8k', unitsVal: '480' },
    { name: 'Dec', sales: 38, units: 20, salesVal: '$5.2k', unitsVal: '420' },
  ];

  const svgWidth = 620;
  const svgHeight = 220;
  const chartBottom = 190;
  const chartTop = 25;
  const chartHeight = chartBottom - chartTop;
  const barWidth = 36;
  const startX = 65;
  const spacing = (svgWidth - startX - 70) / (months.length - 1);

  const activeItem = months[activeMonthIndex] || months[4];
  const activeBarX = startX + activeMonthIndex * spacing;

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Horizontal Dashed Gridlines & Y-Axis Labels */}
        {[0, 10, 20, 30, 40, 50].map((val, i) => {
          const y = chartBottom - (val / 50) * chartHeight;
          const unitsVal = val * 20; // 0 to 1000
          return (
            <g key={i}>
              <line
                x1={startX - 15}
                y1={y}
                x2={svgWidth - 45}
                y2={y}
                stroke="#D4D5CC"
                strokeDasharray="4 4"
                strokeWidth="1"
                opacity="0.8"
              />
              {/* Left Y-axis: Sales (0k - 50k) */}
              <text
                x={startX - 22}
                y={y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#70736A"
                fontFamily="'Inter', sans-serif"
                fontWeight="500"
              >
                {val}k
              </text>
              {/* Right Y-axis: Units (0 - 1000) */}
              <text
                x={svgWidth - 36}
                y={y + 4}
                textAnchor="start"
                fontSize="11"
                fill="#70736A"
                fontFamily="'Inter', sans-serif"
                fontWeight="500"
              >
                {unitsVal}
              </text>
            </g>
          );
        })}

        {/* Stacked Bars for each Month */}
        {months.map((m, idx) => {
          const x = startX + idx * spacing - barWidth / 2;
          const totalUnitsHeight = (m.units / 50) * chartHeight;
          const totalSalesHeight = (m.sales / 50) * chartHeight;

          // Bottom Bar: Units (#8CB843 Lime-Moss)
          const bottomY = chartBottom - totalUnitsHeight;

          // Top Bar: Sales (#7E8CE0 Periwinkle Lavender)
          const topY = chartBottom - (totalUnitsHeight + totalSalesHeight);

          const isHovered = activeMonthIndex === idx;

          return (
            <g
              key={m.name}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setActiveMonthIndex(idx)}
            >
              {/* Top Segment: Sales (Periwinkle Lavender) */}
              <rect
                x={x}
                y={topY}
                width={barWidth}
                height={totalSalesHeight}
                rx={7}
                fill="#7E8CE0"
                opacity={isHovered ? 1 : 0.9}
                style={{ transition: 'opacity 150ms ease' }}
              />

              {/* Bottom Segment: Units (Lime-Moss) */}
              <rect
                x={x}
                y={bottomY}
                width={barWidth}
                height={totalUnitsHeight}
                rx={7}
                fill="#8CB843"
                opacity={isHovered ? 1 : 0.9}
                style={{ transition: 'opacity 150ms ease' }}
              />

              {/* Month Label below bar */}
              <text
                x={x + barWidth / 2}
                y={chartBottom + 18}
                textAnchor="middle"
                fontSize="11.5"
                fill={isHovered ? '#1B1B1B' : '#70736A'}
                fontWeight={isHovered ? '700' : '500'}
                fontFamily="'Inter', sans-serif"
              >
                {m.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip Card (positioned dynamically over active bar) */}
      <div
        className="chart-tooltip-popup"
        style={{
          left: `${(activeBarX / svgWidth) * 100}%`,
          top: '22%',
          transform: 'translate(-50%, -50%)',
          minWidth: '135px',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1B1B1B', marginBottom: '0.35rem' }}>
          {activeItem.name === 'Sep' ? 'September 2025' : `${activeItem.name} 2025`}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.72rem', color: '#70736A' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#7E8CE0' }} />
            Total Sales
          </span>
          <strong style={{ color: '#1B1B1B' }}>{activeItem.salesVal}</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', fontSize: '0.72rem', color: '#70736A', marginTop: '0.2rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#8CB843' }} />
            Total Units
          </span>
          <strong style={{ color: '#1B1B1B' }}>{activeItem.unitsVal}</strong>
        </div>
      </div>
    </div>
  );
};

/**
 * 2. Overlapping Bubble Chart matching the "Top Categories" card in Inventra
 */
export const CategoryBubbles = ({ categories = [] }) => {
  // Use backend categories if available, fallback to beautiful reference items
  const cat1 = categories[0]?.name || 'Hardware';
  const cat2 = categories[1]?.name || 'Supplies';
  const cat3 = categories[2]?.name || 'Apparel';

  return (
    <div className="categories-bubbles-container" aria-label="Category Distribution Bubbles">
      {/* Top Bubble: Lavender / Periwinkle */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          width: '128px',
          height: '128px',
          borderRadius: '50%',
          backgroundColor: '#7E8CE0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          textAlign: 'center',
          boxShadow: '0 8px 20px rgba(126, 140, 224, 0.35)',
          zIndex: 3,
        }}
      >
        <span style={{ fontSize: '0.875rem', fontWeight: 800 }}>$400.00</span>
        <span style={{ fontSize: '0.72rem', opacity: 0.9, marginTop: '2px' }}>{cat1}</span>
      </div>

      {/* Left Bubble: Lime-Moss */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '18%',
          width: '98px',
          height: '98px',
          borderRadius: '50%',
          backgroundColor: '#8CB843',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          textAlign: 'center',
          boxShadow: '0 8px 18px rgba(140, 184, 67, 0.35)',
          zIndex: 2,
        }}
      >
        <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>$400</span>
        <span style={{ fontSize: '0.68rem', opacity: 0.9, marginTop: '2px' }}>{cat2}</span>
      </div>

      {/* Right Bubble: Soft Grey / Sage */}
      <div
        style={{
          position: 'absolute',
          bottom: '18px',
          right: '18%',
          width: '85px',
          height: '85px',
          borderRadius: '50%',
          backgroundColor: '#E4E4DE',
          border: '1.5px solid #D4D5CC',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1B1B1B',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(27, 27, 27, 0.05)',
          zIndex: 1,
        }}
      >
        <span style={{ fontSize: '0.78rem', fontWeight: 800 }}>$400</span>
        <span style={{ fontSize: '0.65rem', color: '#70736A', marginTop: '2px' }}>{cat3}</span>
      </div>
    </div>
  );
};

/**
 * 3. Semi-Circular Radial Gauge matching "User Growth" / "Fulfillment Rate"
 */
export const FulfillmentGauge = ({ value = 9500, trend = 4.8 }) => {
  return (
    <div className="radial-gauge-container">
      <div style={{ position: 'relative', width: '220px', height: '120px' }}>
        <svg viewBox="0 0 220 120" style={{ width: '100%', height: '100%' }}>
          {/* Background Dashed Track */}
          <path
            d="M 25 110 A 85 85 0 0 1 195 110"
            fill="none"
            stroke="#EAEAEA"
            strokeWidth="18"
            strokeDasharray="6 4"
            strokeLinecap="round"
          />

          {/* Active Lime-Moss Progress Arc */}
          <path
            d="M 25 110 A 85 85 0 0 1 145 35"
            fill="none"
            stroke="#8CB843"
            strokeWidth="18"
            strokeLinecap="round"
          />
        </svg>

        {/* Center Big Number */}
        <div
          style={{
            position: 'absolute',
            bottom: '5px',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
          }}
        >
          <div className="gauge-center-val">{value.toLocaleString()}</div>
          <div style={{ marginTop: '4px' }}>
            <span className="kpi-trend-pill positive">
              <TrendingUp size={11} />
              <span>{trend}%</span>
            </span>
          </div>
        </div>
      </div>

      {/* Split Comparison Cards below gauge */}
      <div className="gauge-sub-row">
        <div className="gauge-sub-box">
          <span className="gauge-sub-lbl">This Year</span>
          <div className="gauge-sub-val">
            <span>4.5k</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--status-green-text)', fontWeight: 700 }}>
              30.8% ↗
            </span>
          </div>
        </div>

        <div className="gauge-sub-box">
          <span className="gauge-sub-lbl">Last Year</span>
          <div className="gauge-sub-val">
            <span>2.2k</span>
            <span style={{ fontSize: '0.68rem', color: 'var(--status-red-text)', fontWeight: 700 }}>
              10.8% ↘
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 4. Inventory Valuation Status Card matching the bottom right widget
 */
export const ValuationBreakdown = ({ inStockCount = 142, lowStockCount = 8, outOfStockCount = 2 }) => {
  return (
    <div className="valuation-legend-grid">
      <div className="valuation-item">
        <div className="valuation-item-left">
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8CB843' }} />
          <span>In Stock</span>
        </div>
        <strong style={{ color: '#1B1B1B' }}>{inStockCount}</strong>
      </div>

      <div className="valuation-item">
        <div className="valuation-item-left">
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#EAB308' }} />
          <span>Low Stock</span>
        </div>
        <strong style={{ color: '#1B1B1B' }}>{lowStockCount}</strong>
      </div>

      <div className="valuation-item">
        <div className="valuation-item-left">
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#7E8CE0' }} />
          <span>Out of Stock</span>
        </div>
        <strong style={{ color: '#1B1B1B' }}>{outOfStockCount}</strong>
      </div>

      <div className="valuation-item">
        <div className="valuation-item-left">
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#1B1B1B' }} />
          <span>Pending PO</span>
        </div>
        <strong style={{ color: '#1B1B1B' }}>5</strong>
      </div>
    </div>
  );
};
