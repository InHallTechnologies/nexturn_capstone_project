import { Link } from "react-router-dom";
import { useLoad } from "../../hooks/useLoad";
import { money } from "../../lib/format";
import {
  EmptyState,
  LoadingState,
  PageHeading,
  Panel,
  StatusChip,
} from "../../components/common/Primitives";

export default function InvoicesPage() {
  const { data, loading, error } = useLoad(
    "/invoices?per_page=100&sort=issue_date&order=desc",
  );
  return (
    <>
      <PageHeading
        eyebrow="BILLING"
        title="Invoices"
        description="A clear view of what has been sent, paid, and still needs attention."
        action={
          <Link className="button button-dark" to="/invoices/new">
            + New invoice
          </Link>
        }
      />
      <Panel className="table-panel">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <div className="toast error">{error}</div>
        ) : data?.items?.length ? (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>NUMBER</th>
                  <th>CLIENT</th>
                  <th>ISSUED</th>
                  <th>STATUS</th>
                  <th>AMOUNT</th>
                  <th>OPEN</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.number}</strong>
                    </td>
                    <td>
                      {invoice.client_name || `Client #${invoice.client_id}`}
                    </td>
                    <td>{invoice.issue_date}</td>
                    <td>
                      <StatusChip
                        tone={
                          invoice.status === "paid"
                            ? "green"
                            : invoice.status === "overdue"
                              ? "red"
                              : "amber"
                        }
                      >
                        {invoice.status?.replace("_", " ")}
                      </StatusChip>
                    </td>
                    <td>
                      <strong>{money(invoice.total)}</strong>
                      <small className="subline">
                        {money(invoice.amount_paid)} paid
                      </small>
                    </td>
                    <td>
                      <Link
                        className="table-link"
                        to={`/invoices/${invoice.id}`}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No invoices yet"
            text="Create an invoice from your unbilled time entries."
            action={
              <Link className="button button-dark" to="/invoices/new">
                Build an invoice
              </Link>
            }
          />
        )}
      </Panel>
    </>
  );
}
