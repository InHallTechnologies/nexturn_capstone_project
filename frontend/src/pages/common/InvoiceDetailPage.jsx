import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiError } from "../../app/api";
import { useLoad } from "../../hooks/useLoad";
import { money, paymentMethodLabel } from "../../lib/format";
import {
  EmptyState,
  LoadingState,
  PageHeading,
  Panel,
  StatusChip,
} from "../../components/common/Primitives";
import "../../styles/invoice.css";

function InvoiceEditor({ invoice, onClose, onSaved }) {
  const [lines, setLines] = useState(
    invoice.line_items.map((item) => ({
      description: item.description,
      quantity: String(item.quantity),
      unit_rate: String(item.unit_rate),
    })),
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = Object.fromEntries(new FormData(event.currentTarget));

    try {
      await api.put(`/invoices/${invoice.id}`, {
        due_date: form.due_date,
        tax: Number(form.tax),
        line_items: lines.map((line) => ({
          ...line,
          quantity: Number(line.quantity),
          unit_rate: Number(line.unit_rate),
        })),
      });
      onSaved("Invoice changes saved.");
      onClose();
    } catch (error) {
      setMessage(apiError(error, "Could not save invoice changes."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog invoice-editor-dialog">
        <div className="dialog-head">
          <div>
            <span className="kicker">INVOICE EDITOR</span>
            <h2>Update {invoice.number}</h2>
          </div>
          <button className="close-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
        {message && <div className="toast error">{message}</div>}
        <form className="stack-form" onSubmit={save}>
          <label>
            Due date
            <input
              name="due_date"
              type="date"
              required
              defaultValue={invoice.due_date}
            />
          </label>
          <div className="invoice-lines-edit">
            <strong>Invoice lines</strong>
            {lines.map((line, index) => (
              <div className="invoice-line-edit" key={index}>
                <label>
                  Description
                  <input
                    required
                    value={line.description}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, description: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Quantity
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={line.quantity}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, quantity: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Rate
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={line.unit_rate}
                    onChange={(event) =>
                      setLines((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, unit_rate: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className="text-button danger"
                  type="button"
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className="button button-light"
              type="button"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  { description: "", quantity: "1", unit_rate: "0" },
                ])
              }
            >
              + Add line
            </button>
          </div>
          <label>
            Tax amount
            <input
              name="tax"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={invoice.tax}
            />
          </label>
          <button className="button button-dark" disabled={saving}>
            {saving ? "Saving…" : "Save invoice changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function PaymentDialog({ invoice, onClose, onSaved }) {
  const [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));

    try {
      await api.post(`/invoices/${invoice.id}/payments`, {
        ...form,
        amount: Number(form.amount),
      });
      onSaved("Payment recorded.");
      onClose();
    } catch (error) {
      setMessage(apiError(error, "Could not record this payment."));
    }
  }

  const balance = Number(invoice.total) - Number(invoice.amount_paid);

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <div className="dialog-head">
          <div>
            <span className="kicker">CASH FLOW</span>
            <h2>Record a payment</h2>
          </div>
          <button className="close-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <p className="dialog-copy">
          Remaining balance: <strong>{money(balance)}</strong>
        </p>
        {message && <div className="toast error">{message}</div>}
        <form className="stack-form" onSubmit={save}>
          <label>
            Amount
            <input
              name="amount"
              type="number"
              min="0.01"
              max={balance}
              step="0.01"
              required
            />
          </label>
          <label>
            Date received
            <input
              name="paid_on"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label>
            Method
            <select name="method">
              <option>Bank transfer</option>
              <option>Card</option>
              <option>Cash</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Reference
            <input name="reference" placeholder="Transaction ID (optional)" />
          </label>
          <button className="button button-dark">Save payment</button>
        </form>
      </div>
    </div>
  );
}

export default function InvoiceDetailPage({ portal = false }) {
  const { id } = useParams();
  const invoice = useLoad(`${portal ? "/portal" : ""}/invoices/${id}`);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paying, setPaying] = useState(false);

  if (invoice.loading) return <LoadingState />;
  if (invoice.error || !invoice.data)
    return (
      <div className="toast error">{invoice.error || "Invoice not found."}</div>
    );

  const data = invoice.data;
  const balance = Math.max(
    0,
    Number(data.total || 0) - Number(data.amount_paid || 0),
  );

  async function pay(event) {
    event.preventDefault();
    setPaying(true);
    const form = Object.fromEntries(new FormData(event.currentTarget));

    try {
      await api.post(`/portal/invoices/${id}/pay`, {
        amount: Number(form.amount),
        payment_method: form.payment_method,
        transaction_reference: form.transaction_reference,
      });
      setMessage("Payment recorded successfully.");
      invoice.refresh();
      setPaymentOpen(false);
    } catch (error) {
      setMessage(apiError(error, "Payment could not be recorded."));
    } finally {
      setPaying(false);
    }
  }

  async function sendInvoice() {
    try {
      await api.post(`/invoices/${id}/send`);
      setMessage("Invoice sent to the client portal.");
      invoice.refresh();
    } catch (error) {
      setMessage(apiError(error, "Could not send this invoice."));
    }
  }

  return (
    <>
      <PageHeading
        eyebrow={portal ? "CLIENT BILLING" : "INVOICE"}
        title={data.number}
        description={`Issued ${data.issue_date} · Due ${data.due_date}`}
        action={
          <div className="heading-actions">
            <Link
              className="button button-light"
              to={portal ? "/portal" : "/invoices"}
            >
              ← Back
            </Link>
            <button
              className="button button-light"
              onClick={() => window.print()}
            >
              Print
            </button>
            {!portal && Number(data.amount_paid) === 0 && (
              <button
                className="button button-light"
                onClick={() => setEditing(true)}
              >
                Edit invoice
              </button>
            )}
            {!portal && data.status === "draft" && (
              <button className="button button-dark" onClick={sendInvoice}>
                Send invoice
              </button>
            )}
            {!portal && balance > 0 && data.status !== "draft" && (
              <button
                className="button button-dark"
                onClick={() => setPaymentOpen(true)}
              >
                Record payment
              </button>
            )}
          </div>
        }
      />
      {message && <div className="toast success">{message}</div>}
      <div className="invoice-layout">
        <Panel className="invoice-card">
          <div className="invoice-intro">
            <div>
              <span className="kicker">BILLYOURTIME</span>
              <h2>{data.number}</h2>
            </div>
            <StatusChip tone={balance <= 0 ? "green" : "amber"}>
              {data.status?.replace("_", " ")}
            </StatusChip>
          </div>
          <div className="invoice-amount">
            <span>Amount due</span>
            <strong>{money(balance)}</strong>
          </div>
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>DESCRIPTION</th>
                  <th>QTY</th>
                  <th>RATE</th>
                  <th>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {data.line_items?.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td>{item.quantity}</td>
                    <td>{money(item.unit_rate)}</td>
                    <td>{money(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="invoice-total">
            <span>Subtotal</span>
            <b>{money(data.subtotal)}</b>
            <span>Tax</span>
            <b>{money(data.tax)}</b>
            <strong>Total</strong>
            <strong>{money(data.total)}</strong>
            <span>Paid to date</span>
            <b>{money(data.amount_paid)}</b>
          </div>
        </Panel>
        {portal && balance > 0 && (
          <Panel className="pay-panel">
            <span className="kicker">SETTLE BALANCE</span>
            <h2>Pay this invoice</h2>
            <p>Payments update the ledger but do not charge a card.</p>
            <form className="stack-form" onSubmit={pay}>
              <label>
                Amount
                <input
                  name="amount"
                  type="number"
                  min="0.01"
                  max={balance}
                  step="0.01"
                  defaultValue={balance.toFixed(2)}
                  required
                />
              </label>
              <label>
                Payment method
                <select name="payment_method" defaultValue="cash">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                </select>
              </label>
              <label>
                Reference
                <input
                  name="transaction_reference"
                  placeholder="Optional receipt reference"
                />
              </label>
              <button className="button button-dark" disabled={paying}>
                {paying ? "Recording…" : "Pay"}
              </button>
            </form>
          </Panel>
        )}
      </div>
      <Panel className="table-panel invoice-history">
        <div className="panel-top">
          <div>
            <span className="kicker">LEDGER</span>
            <h2>Payment history</h2>
          </div>
        </div>
        {data.payments?.length ? (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>METHOD</th>
                  <th>REFERENCE</th>
                  <th>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.paid_on}</td>
                    <td>{paymentMethodLabel(payment.method)}</td>
                    <td>{payment.reference || "—"}</td>
                    <td>{money(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No payments yet"
            text="Payments recorded by you or the client will appear here."
          />
        )}
      </Panel>
      {editing && (
        <InvoiceEditor
          invoice={data}
          onClose={() => setEditing(false)}
          onSaved={(nextMessage) => {
            setMessage(nextMessage);
            invoice.refresh();
          }}
        />
      )}
      {paymentOpen && !portal && (
        <PaymentDialog
          invoice={data}
          onClose={() => setPaymentOpen(false)}
          onSaved={(nextMessage) => {
            setMessage(nextMessage);
            invoice.refresh();
          }}
        />
      )}
    </>
  );
}
