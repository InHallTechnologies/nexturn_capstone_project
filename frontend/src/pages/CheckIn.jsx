import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { post } from '../api';
import Notice from '../components/Notice';

export default function CheckIn() {
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);
  const scannedRef = useRef(false);

  async function checkTicket(ticketCode) {
    setBusy(true); setMessage(''); setError('');
    try {
      const result = await post('/organizer/check-in', { ticket_code: ticketCode.trim() });
      setMessage(result.data.message);
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function stopScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // The scanner may already have stopped after reading a code.
    }
    scannerRef.current = null;
    setScanning(false);
  }

  async function startScanner() {
    setCameraError('');
    setError('');
    scannedRef.current = false;
    const scanner = new Html5Qrcode('ticket-qr-reader');
    scannerRef.current = scanner;
    setScanning(true);

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 230, height: 230 } },
        async (ticketCode) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          await stopScanner();
          setCode(ticketCode);
          await checkTicket(ticketCode);
        },
        () => {},
      );
    } catch (err) {
      setCameraError(err.message || 'Could not start the camera. Check camera permission and try again.');
      await stopScanner();
    }
  }

  useEffect(() => () => {
    const scanner = scannerRef.current;
    if (scanner) scanner.stop().then(() => scanner.clear()).catch(() => {});
  }, []);

  function submit(event) {
    event.preventDefault();
    checkTicket(code);
  }

  return (
    <section className="form-panel checkin-panel">
      <p className="eyebrow">Organizer workspace</p><h1>Check in a guest</h1>
      <p className="muted">Scan a ticket QR code or enter its code. A used ticket cannot be checked in again.</p>
      <Notice>{message}</Notice><Notice type="error">{error}</Notice><Notice type="error">{cameraError}</Notice>
      <div className="scanner-box">
        <div id="ticket-qr-reader" className={scanning ? 'scanner-visible' : 'scanner-hidden'} />
        {!scanning ? <button className="button button-light" onClick={startScanner}>Open camera scanner</button> : <button className="button button-light" onClick={stopScanner}>Stop camera</button>}
        <small>Camera access needs browser permission and a secure page (localhost or HTTPS). Manual entry is always available.</small>
      </div>
      <form className="stack-form" onSubmit={submit}>
        <label>Ticket code<input value={code} onChange={(e) => setCode(e.target.value)} autoFocus required /></label>
        <button className="button button-primary" disabled={busy}>{busy ? 'Checking…' : 'Check in'}</button>
      </form>
    </section>
  );
}
