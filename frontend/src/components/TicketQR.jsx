import { QRCodeSVG } from 'qrcode.react';

export default function TicketQR({ code }) {
  return (
    <div className="ticket-qr">
      <QRCodeSVG value={code} size={156} level="M" title="Ticket check-in QR code" />
      <span>Show this QR at check-in</span>
    </div>
  );
}
