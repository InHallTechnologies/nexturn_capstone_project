import { Link } from "react-router-dom";
import { useLoad } from "../../hooks/useLoad";
import { money, paymentMethodLabel } from "../../lib/format";
import {
  EmptyState,
  LoadingState,
  PageHeading,
  Panel,
} from "../../components/common/Primitives";

export default function PaymentsPage({ portal = false }) {
  const { data, loading, error } = useLoad(
    portal
      ? "/portal/payments?per_page=100"
      : "/payments?per_page=100&sort=paid_on&order=desc",
  );
  return (
    <>
      <PageHeading
        eyebrow={portal ? "CLIENT LEDGER" : "CASH FLOW"}
        title="Payments"
        description={
          portal
            ? "A transparent record of every payment you have made."
            : "Track every payment and keep your books current."
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
                  <th>DATE</th>
                  <th>INVOICE</th>
                  <th>METHOD</th>
                  <th>REFERENCE</th>
                  <th className="align-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.paid_on}</td>
                    <td>
                      <Link
                        className="table-link"
                        to={`${portal ? "/portal" : ""}/invoices/${payment.invoice_id}`}
                      >
                        Invoice #{payment.invoice_id}
                      </Link>
                    </td>
                    <td>{paymentMethodLabel(payment.method)}</td>
                    <td>{payment.reference || "—"}</td>
                    <td className="align-right">
                      <strong>{money(payment.amount)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No payments recorded"
            text="Payments will appear here as invoices are settled."
          />
        )}
      </Panel>
    </>
  );
}
