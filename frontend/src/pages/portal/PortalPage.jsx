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

export default function PortalPage() {
  const { data, loading, error } = useLoad(
    "/portal/invoices?per_page=100&sort=issue_date&order=desc",
  );
  return (
    <>
      <PageHeading
        eyebrow="CLIENT SPACE"
        title="Your invoices"
        description="Review the work, understand the balance, and keep payments moving."
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
                  <th>INVOICE</th>
                  <th>FROM</th>
                  <th>ISSUED</th>
                  <th>STATUS</th>
                  <th>AMOUNT</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((invoice) => {
                  const balance =
                    Number(invoice.total || 0) -
                    Number(invoice.amount_paid || 0);
                  return (
                    <tr key={invoice.id}>
                      <td>
                        <strong>{invoice.number}</strong>
                      </td>
                      <td>{invoice.freelancer_email}</td>
                      <td>{invoice.issue_date}</td>
                      <td>
                        <StatusChip tone={balance <= 0 ? "green" : "amber"}>
                          {invoice.status?.replace("_", " ")}
                        </StatusChip>
                      </td>
                      <td>
                        <strong>{money(invoice.total)}</strong>
                        <small className="subline">{money(balance)} due</small>
                      </td>
                      <td>
                        <Link
                          className="table-link"
                          to={`/portal/invoices/${invoice.id}`}
                        >
                          {balance > 0 ? "Review & pay" : "View"}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No invoices to review"
            text="Invoices sent to this client account will appear here."
          />
        )}
      </Panel>
    </>
  );
}
