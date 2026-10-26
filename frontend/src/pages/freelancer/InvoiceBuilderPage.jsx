import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiError } from "../../app/api";
import { useLoad } from "../../hooks/useLoad";
import { money } from "../../lib/format";
import {
  EmptyState,
  LoadingState,
  PageHeading,
  Panel,
} from "../../components/common/Primitives";
import "../../styles/workflows.css";

export default function InvoiceBuilderPage() {
  const navigate = useNavigate();
  const clients = useLoad("/clients?per_page=100");
  const projects = useLoad("/projects?per_page=100");
  const entries = useLoad("/time-entries?billed=false&per_page=100");
  const [clientId, setClientId] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [tax, setTax] = useState("0");
  const [error, setError] = useState("");
  const availableEntries = (entries.data?.items || []).filter(
    (entry) =>
      !clientId ||
      (projects.data?.items || []).some(
        (project) =>
          project.id === entry.project_id &&
          String(project.client_id) === String(clientId),
      ),
  );
  const selected = availableEntries.filter((entry) =>
    selectedIds.includes(entry.id),
  );
  const subtotal = selected.reduce(
    (total, entry) => total + Number(entry.hours) * Number(entry.rate_applied),
    0,
  );
  async function createInvoice() {
    setError("");
    try {
      const { data } = await api.post("/invoices", {
        client_id: clientId,
        time_entry_ids: selectedIds,
        tax_rate: Number(tax),
      });
      navigate(`/invoices/${data.id}`);
    } catch (requestError) {
      setError(apiError(requestError, "Could not create invoice."));
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="BILLING WORKFLOW"
        title="Build an invoice"
        description="Turn approved time into a clear, professional invoice."
        action={
          <button
            className="button button-light"
            onClick={() => navigate("/invoices")}
          >
            Cancel
          </button>
        }
      />
      {error && <div className="toast error">{error}</div>}
      <div className="builder-layout">
        <Panel>
          <div className="step">
            <span>01</span>
            <div>
              <span className="kicker">BILL TO</span>
              <h2>Choose a client</h2>
            </div>
          </div>
          <select
            value={clientId}
            onChange={(event) => {
              setClientId(event.target.value);
              setSelectedIds([]);
            }}
          >
            <option value="">Select a client</option>
            {(clients.data?.items || []).map((client) => (
              <option value={client.id} key={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <div className="builder-divider" />
          <div className="step">
            <span>02</span>
            <div>
              <span className="kicker">LINE ITEMS</span>
              <h2>Select unbilled work</h2>
            </div>
            <em>{selected.length} selected</em>
          </div>
          {entries.loading ? (
            <LoadingState />
          ) : availableEntries.length ? (
            <div className="work-list">
              {availableEntries.map((entry) => (
                <label className="work-row" key={entry.id}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(entry.id)}
                    onChange={(event) =>
                      setSelectedIds(
                        event.target.checked
                          ? [...selectedIds, entry.id]
                          : selectedIds.filter((id) => id !== entry.id),
                      )
                    }
                  />
                  <span>
                    <strong>{entry.description}</strong>
                    <small>
                      {entry.entry_date} · {entry.hours} hours ·{" "}
                      {money(entry.rate_applied)}/hr
                    </small>
                  </span>
                  <b>
                    {money(Number(entry.hours) * Number(entry.rate_applied))}
                  </b>
                </label>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No unbilled work"
              text="Log time before building an invoice."
            />
          )}
        </Panel>
        <Panel className="invoice-summary">
          <span className="kicker">SUMMARY</span>
          <h2>Ready to send.</h2>
          <p>
            Amounts are calculated and locked by the server when you create the
            invoice.
          </p>
          <div className="summary-row">
            <span>Selected hours</span>
            <b>
              {selected.reduce(
                (total, entry) => total + Number(entry.hours),
                0,
              )}{" "}
              hrs
            </b>
          </div>
          <div className="summary-row">
            <span>Subtotal</span>
            <b>{money(subtotal)}</b>
          </div>
          <label>
            Tax (%)
            <input
              type="number"
              min="0"
              max="100"
              value={tax}
              onChange={(event) => setTax(event.target.value)}
            />
          </label>
          <div className="summary-total">
            <span>Estimated total</span>
            <strong>{money(subtotal + (subtotal * Number(tax)) / 100)}</strong>
          </div>
          <button
            className="button button-dark"
            disabled={!clientId || !selectedIds.length}
            onClick={createInvoice}
          >
            Create invoice →
          </button>
        </Panel>
      </div>
    </>
  );
}
