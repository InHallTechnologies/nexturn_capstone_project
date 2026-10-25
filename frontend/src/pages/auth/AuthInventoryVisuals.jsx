import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ScanLine,
  Boxes,
  MapPin,
  ClipboardCheck,
  Zap,
} from 'lucide-react';

/**
 * Realistic 1D Barcode SVG with human-readable caption
 */
export const BarcodeSvg = ({ code = 'SKU-8942-X2', width = 160, height = 34 }) => {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 160 34"
      fill="currentColor"
      className="barcode-graphic"
      aria-label={`Barcode ${code}`}
    >
      {/* Precision 1D Barcode Pattern */}
      <rect x="0" y="0" width="3" height="24" />
      <rect x="5" y="0" width="1" height="24" />
      <rect x="8" y="0" width="2" height="24" />
      <rect x="13" y="0" width="4" height="24" />
      <rect x="19" y="0" width="1" height="24" />
      <rect x="22" y="0" width="3" height="24" />
      <rect x="27" y="0" width="2" height="24" />
      <rect x="31" y="0" width="5" height="24" />
      <rect x="38" y="0" width="1" height="24" />
      <rect x="41" y="0" width="2" height="24" />
      <rect x="45" y="0" width="4" height="24" />
      <rect x="51" y="0" width="1" height="24" />
      <rect x="54" y="0" width="3" height="24" />
      <rect x="59" y="0" width="2" height="24" />
      <rect x="63" y="0" width="1" height="24" />
      <rect x="66" y="0" width="4" height="24" />
      <rect x="72" y="0" width="2" height="24" />
      <rect x="76" y="0" width="1" height="24" />
      <rect x="79" y="0" width="3" height="24" />
      <rect x="84" y="0" width="5" height="24" />
      <rect x="91" y="0" width="1" height="24" />
      <rect x="94" y="0" width="3" height="24" />
      <rect x="99" y="0" width="2" height="24" />
      <rect x="103" y="0" width="4" height="24" />
      <rect x="109" y="0" width="1" height="24" />
      <rect x="112" y="0" width="3" height="24" />
      <rect x="117" y="0" width="2" height="24" />
      <rect x="121" y="0" width="4" height="24" />
      <rect x="127" y="0" width="1" height="24" />
      <rect x="130" y="0" width="3" height="24" />
      <rect x="135" y="0" width="2" height="24" />
      <rect x="139" y="0" width="5" height="24" />
      <rect x="146" y="0" width="2" height="24" />
      <rect x="150" y="0" width="1" height="24" />
      <rect x="153" y="0" width="3" height="24" />
      <rect x="158" y="0" width="2" height="24" />
      <text
        x="80"
        y="32"
        fontSize="8"
        fontFamily="'JetBrains Mono', 'Courier New', monospace"
        fontWeight="600"
        letterSpacing="1.5"
        textAnchor="middle"
        fill="currentColor"
      >
        {code}
      </text>
    </svg>
  );
};

/**
 * Visual Panel for LOGIN:
 * Active Warehouse Aisle, High-Velocity Shelving Rack, Scanned Product Carton, and Handheld Scanner HUD
 */
export const LoginStockroomVisual = () => {
  return (
    <div className="warehouse-environment-showcase" aria-label="Warehouse Stockroom Environment">
      {/* Industrial Rack Shelving Frame */}
      <div className="rack-shelving-frame">
        {/* Steel Upright Column Left */}
        <div className="rack-upright-beam left" aria-hidden="true">
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
        </div>

        {/* Shelf Content Core */}
        <div className="rack-shelf-content">
          {/* Location Placard / Warehouse Coordinates */}
          <div className="rack-location-header">
            <div className="rack-location-badge">
              <MapPin size={12} className="loc-icon" />
              <span className="loc-text">ZONE A · AISLE 04 · RACK B-02</span>
            </div>
            <div className="rack-telemetry-status">
              <span className="rack-pulse-emerald" />
              <span>SHELVING MONITORED</span>
            </div>
          </div>

          {/* Primary Carton with Active Laser Scanner Beam */}
          <div className="physical-carton-card primary-carton">
            <div className="carton-seam-tape">
              <span>STOCKPILOT VERIFIED PACKAGING</span>
              <span className="tape-sku">#INV-8942</span>
            </div>

            <div className="carton-body">
              {/* White Matte Barcode Label Sticker */}
              <div className="matte-barcode-sticker">
                <div className="sticker-header">
                  <span className="sticker-brand">STOCKPILOT RETAIL LOGISTICS</span>
                  <span className="sticker-stamp">QC PASSED</span>
                </div>

                <div className="barcode-render-box">
                  <BarcodeSvg code="SKU-8942-X2" width={175} height={36} />
                  {/* Active Laser Scanning Beam */}
                  <div className="laser-scanner-overlay" aria-hidden="true">
                    <div className="laser-beam-line" />
                    <div className="scanner-crosshair top-left" />
                    <div className="scanner-crosshair top-right" />
                    <div className="scanner-crosshair btm-left" />
                    <div className="scanner-crosshair btm-right" />
                  </div>
                </div>

                <div className="sticker-meta-grid">
                  <div className="sticker-meta-col">
                    <span className="meta-lbl">ITEM DESCRIPTION</span>
                    <span className="meta-val">Apex Wireless POS Terminal</span>
                  </div>
                  <div className="sticker-meta-col right">
                    <span className="meta-lbl">BIN ALLOCATION</span>
                    <span className="meta-val highlight">BAY 04-B / SHELF 02</span>
                  </div>
                </div>
              </div>

              {/* Handheld Terminal Scanner Readout Card */}
              <div className="scanner-hud-terminal">
                <div className="scanner-hud-header">
                  <div className="scanner-device-name">
                    <ScanLine size={13} className="scanner-hud-icon" />
                    <span>TERMINAL SCANNER #01 [ONLINE]</span>
                  </div>
                  <span className="scanner-battery-tag">BATTERY 98%</span>
                </div>

                <div className="scanner-hud-grid">
                  <div className="hud-metric-box">
                    <span className="hud-lbl">ON-SHELF COUNT</span>
                    <span className="hud-val">480 / 500</span>
                  </div>
                  <div className="hud-metric-box">
                    <span className="hud-lbl">STOCK STATUS</span>
                    <span className="hud-val optimal">96% OPTIMAL</span>
                  </div>
                  <div className="hud-metric-box">
                    <span className="hud-lbl">DISPATCH</span>
                    <span className="hud-val dispatch">POS REG #1</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Industrial Shelf Support Rail Bottom */}
            <div className="industrial-shelf-beam">
              <span className="shelf-safety-stripe" />
              <span className="shelf-label">LOAD CAPACITY: 750 KG · SECTION B-02</span>
            </div>
          </div>

          {/* Secondary Carton: Automated Reorder Triggered */}
          <div className="physical-carton-card secondary-carton">
            <div className="secondary-carton-inner">
              <div className="carton-item-details">
                <div className="carton-badge-warning">
                  <AlertTriangle size={12} />
                  <span>REORDER TRIGGERED</span>
                </div>
                <div className="secondary-item-name">
                  Thermal Roll 80mm Media · SKU-2315
                </div>
                <div className="secondary-item-meta">
                  Location: <strong>BAY 04-B / SHELF 03</strong> · Threshold: 30 Units
                </div>
              </div>
              <div className="secondary-stock-pill">
                <span className="stock-count-alert">28 / 100</span>
                <span className="auto-po-label">PO-2026-092 GENERATED (+200)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Steel Upright Column Right */}
        <div className="rack-upright-beam right" aria-hidden="true">
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
        </div>
      </div>
    </div>
  );
};

/**
 * Visual Panel for REGISTRATION:
 * Receiving Staging Dock, Inbound Logistics Pallet Carton, PO Manifest Clipboard, and Bin Router
 */
export const RegisterStockroomVisual = () => {
  return (
    <div className="warehouse-environment-showcase" aria-label="Warehouse Receiving & Ingestion Dock">
      {/* Industrial Rack Shelving Frame */}
      <div className="rack-shelving-frame">
        {/* Steel Upright Column Left */}
        <div className="rack-upright-beam left" aria-hidden="true">
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
        </div>

        {/* Receiving Content Core */}
        <div className="rack-shelf-content">
          {/* Location Placard / Warehouse Dock Coordinates */}
          <div className="rack-location-header">
            <div className="rack-location-badge receiving">
              <MapPin size={12} className="loc-icon" />
              <span className="loc-text">INBOUND DOCK 01 · STAGING BAY A</span>
            </div>
            <div className="rack-telemetry-status intake">
              <span className="rack-pulse-cyan" />
              <span>INTAKE &amp; CATALOGUE ONBOARDING</span>
            </div>
          </div>

          {/* Inbound Shipping Carton */}
          <div className="physical-carton-card primary-carton inbound-carton">
            <div className="carton-seam-tape hazard">
              <span>INBOUND FREIGHT SHIPMENT · VERIFIED BILL OF LADING</span>
              <span className="tape-sku">#BOL-8841-A</span>
            </div>

            <div className="carton-body">
              {/* White Matte Inbound Barcode Label Sticker */}
              <div className="matte-barcode-sticker">
                <div className="sticker-header">
                  <span className="sticker-brand">STOCKPILOT INBOUND MANIFEST</span>
                  <span className="sticker-stamp approved">APPROVED</span>
                </div>

                <div className="barcode-render-box">
                  <BarcodeSvg code="PO-2026-104-INGEST" width={185} height={36} />
                </div>

                <div className="sticker-meta-grid">
                  <div className="sticker-meta-col">
                    <span className="meta-lbl">SUPPLIER PARTNER</span>
                    <span className="meta-val">Nordic Industrial Logistics</span>
                  </div>
                  <div className="sticker-meta-col right">
                    <span className="meta-lbl">RECEIVED QUANTITY</span>
                    <span className="meta-val highlight">350 / 350 CARTONS</span>
                  </div>
                </div>
              </div>

              {/* Physical PO Manifest Clipboard Card */}
              <div className="po-clipboard-card">
                <div className="clipboard-header">
                  <div className="clipboard-title">
                    <ClipboardCheck size={14} className="clipboard-icon" />
                    <span>PURCHASE ORDER AUDIT #PO-2026-104</span>
                  </div>
                  <span className="clipboard-status-pill">ACCEPTED &amp; COUNTED</span>
                </div>

                <div className="clipboard-checklist">
                  <div className="checklist-row">
                    <CheckCircle2 size={13} className="chk-icon done" />
                    <span>Freight Bill of Lading &amp; Customs Pack Cleared</span>
                  </div>
                  <div className="checklist-row">
                    <CheckCircle2 size={13} className="chk-icon done" />
                    <span>350 Units Scanned &amp; Matched to SKU Catalogue</span>
                  </div>
                  <div className="checklist-row">
                    <Zap size={13} className="chk-icon active" />
                    <span>Automatic Bin Routing: DOCK 01 ──&gt; AISLE 04-B-02</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Industrial Shelf Support Rail Bottom */}
            <div className="industrial-shelf-beam">
              <span className="shelf-safety-stripe" />
              <span className="shelf-label">PALLET STAGING WEIGHT: 1,200 KG · DOCK SECURE</span>
            </div>
          </div>

          {/* Warehouse Bin Routing Flow Card */}
          <div className="physical-carton-card secondary-carton routing-card">
            <div className="routing-header">
              <span className="routing-title">
                <Boxes size={13} style={{ color: '#38bdf8' }} />
                <span>Automated Stockroom Bin Routing Pipeline</span>
              </span>
              <span className="routing-speed">Throughput: Real-Time</span>
            </div>

            <div className="routing-stepper">
              <div className="route-step completed">
                <span className="route-node">1</span>
                <span className="route-name">Unloaded</span>
                <span className="route-sub">Dock 01</span>
              </div>
              <div className="route-connector completed" />
              <div className="route-step completed">
                <span className="route-node">2</span>
                <span className="route-name">Barcodes Scanned</span>
                <span className="route-sub">Handheld #01</span>
              </div>
              <div className="route-connector completed" />
              <div className="route-step in-progress">
                <span className="route-node pulse">3</span>
                <span className="route-name">Bin Shelved</span>
                <span className="route-sub">Aisle 04-B</span>
              </div>
              <div className="route-connector" />
              <div className="route-step">
                <span className="route-node">4</span>
                <span className="route-name">POS Ready</span>
                <span className="route-sub">Live Stock</span>
              </div>
            </div>
          </div>
        </div>

        {/* Steel Upright Column Right */}
        <div className="rack-upright-beam right" aria-hidden="true">
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
          <span className="rack-slot" />
        </div>
      </div>
    </div>
  );
};
