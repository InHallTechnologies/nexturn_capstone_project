import { useState } from "react";
import { api, apiError } from "../../app/api";
import { useLoad } from "../../hooks/useLoad";
import {
  EmptyState,
  LoadingState,
  PageHeading,
  Panel,
} from "../../components/common/Primitives";

function ClientDialog({ client, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      name: form.name,
      email: form.email,
      billing_address: form.billing_address,
    };

    try {
      await api.put(`/clients/${client.id}`, payload);
      onSaved("Client updated.");
      onClose();
    } catch (error) {
      setMessage(apiError(error, "Could not save this client."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <div className="dialog-head">
          <div>
            <span className="kicker">RELATIONSHIP</span>
            <h2>Edit client</h2>
          </div>
          <button className="close-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
        {message && <div className="toast error">{message}</div>}
        <form className="stack-form" onSubmit={save}>
          <label>
            Name
            <input
              name="name"
              required
              defaultValue={client?.name || ""}
              placeholder="Acme Studio"
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              defaultValue={client?.email || ""}
              placeholder="hello@acme.com"
            />
          </label>
          <label>
            Billing address
            <textarea
              name="billing_address"
              defaultValue={client?.billing_address || ""}
              placeholder="Street, city, country"
            />
          </label>
          <button className="button button-dark" disabled={saving}>
            {saving ? "Saving…" : "Save client"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const clients = useLoad("/clients?per_page=100");
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function remove(client) {
    if (!window.confirm(`Delete ${client.name}?`)) return;

    try {
      await api.delete(`/clients/${client.id}`);
      setMessage("Client deleted.");
      clients.refresh();
    } catch (error) {
      setMessage(
        apiError(error, "Delete the client's projects and invoices first."),
      );
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="RELATIONSHIPS"
        title="Clients"
        description="Clients are added automatically when you claim a project code."
      />
      {message && <div className="toast success">{message}</div>}
      <Panel className="table-panel">
        <div className="panel-top">
          <div>
            <span className="kicker">CLIENT DIRECTORY</span>
            <h2>All clients</h2>
          </div>
          <span className="muted-label">
            {clients.data?.total || 0} records
          </span>
        </div>
        {clients.loading ? (
          <LoadingState />
        ) : clients.error ? (
          <div className="toast error">{clients.error}</div>
        ) : clients.data?.items?.length ? (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>EMAIL</th>
                  <th>ADDRESS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {clients.data.items.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <strong>{client.name}</strong>
                    </td>
                    <td>{client.email}</td>
                    <td>{client.billing_address || "—"}</td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="text-button"
                          onClick={() => {
                            setEditing(client);
                            setOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="text-button danger"
                          onClick={() => remove(client)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Your directory is empty"
            text="Claim a client project from the Project board to add them to your directory."
          />
        )}
      </Panel>
      {open && (
        <ClientDialog
          client={editing}
          onClose={() => setOpen(false)}
          onSaved={(nextMessage) => {
            setMessage(nextMessage);
            clients.refresh();
          }}
        />
      )}
    </>
  );
}
