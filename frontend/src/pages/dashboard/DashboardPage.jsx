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

function Stat({ label, value, note, accent }) {
  return (
    <div className={`stat-card ${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}

function RevenueBars({ collected, outstanding }) {
  const bars = [
    { label: "Collected", value: collected, color: "violet" },
    { label: "Outstanding", value: outstanding, color: "coral" },
  ];
  const largestValue = Math.max(collected, outstanding, 1);

  return (
    <div className="revenue-chart">
      <div className="chart-grid-lines">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="chart-bars">
        {bars.map((bar) => {
          const height = Math.max(12, (bar.value / largestValue) * 100);

          return (
            <div className="chart-bar-group" key={bar.label}>
              <div
                className={`chart-bar ${bar.color}`}
                style={{ height: `${height}%` }}
              >
                <span>{money(bar.value)}</span>
              </div>
              <small>{bar.label}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning.";
  }

  if (hour < 17) {
    return "Good afternoon.";
  }

  return "Good evening.";
}

export default function DashboardPage() {
  const overview = useLoad("/dashboard");
  const invoices = useLoad("/invoices?per_page=5&sort=issue_date&order=desc");
  const greeting = getGreeting();

  if (overview.loading) {
    return (
      <>
        <PageHeading
          eyebrow="OVERVIEW"
          title={greeting}
          description="Your business, at a glance."
        />
        <LoadingState />
      </>
    );
  }

  if (overview.error) {
    return (
      <>
        <PageHeading eyebrow="OVERVIEW" title={greeting} />
        <div className="toast error">{overview.error}</div>
      </>
    );
  }

  const data = overview.data;

  return (
    <>
      <PageHeading
        eyebrow="OVERVIEW"
        title={greeting}
        description="A clear view of the work that keeps your business moving."
        action={
          <Link className="button button-dark" to="/time">
            Log time ↗
          </Link>
        }
      />

      <div className="stats-grid">
        <Stat
          label="Collected this month"
          value={money(data.monthly_earnings)}
          note="Revenue received"
          accent="green"
        />
        <Stat
          label="Outstanding"
          value={money(data.outstanding)}
          note="Still to collect"
          accent="gold"
        />
        <Stat
          label="Overdue invoices"
          value={data.overdue_count}
          note="Needs your attention"
          accent="red"
        />
        <Stat
          label="Active relationships"
          value={data.top_clients?.length || 0}
          note="Top clients this month"
          accent="blue"
        />
      </div>

      <div className="dashboard-columns">
        <Panel className="chart-panel">
          <div className="panel-top">
            <div>
              <span className="kicker">CASH POSITION</span>
              <h2>Revenue at a glance</h2>
            </div>
            <span className="muted-label">This month</span>
          </div>
          <RevenueBars
            collected={data.monthly_earnings}
            outstanding={data.outstanding}
          />
        </Panel>

        <Panel>
          <div className="panel-top">
            <div>
              <span className="kicker">CLIENT MOMENTUM</span>
              <h2>Top clients</h2>
            </div>
          </div>
          {data.top_clients?.length ? (
            <div className="client-list">
              {data.top_clients.map((client, index) => (
                <div className="client-row" key={client.client_id}>
                  <span>0{index + 1}</span>
                  <strong>{client.name}</strong>
                  <b>{money(client.earnings)}</b>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No payment data yet"
              text="Client activity will appear here."
            />
          )}
        </Panel>
      </div>

      <Panel className="table-panel">
        <div className="panel-top">
          <div>
            <span className="kicker">LATEST ACTIVITY</span>
            <h2>Recent invoices</h2>
          </div>
          <Link className="table-link" to="/invoices">
            View all ↗
          </Link>
        </div>
        {invoices.loading ? (
          <LoadingState />
        ) : invoices.data?.items?.length ? (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>INVOICE</th>
                  <th>CLIENT</th>
                  <th>DATE</th>
                  <th>STATUS</th>
                  <th>AMOUNT</th>
                </tr>
              </thead>
              <tbody>
                {invoices.data.items.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.number}</strong>
                    </td>
                    <td>{invoice.client_name || "Client"}</td>
                    <td>{invoice.issue_date}</td>
                    <td>
                      <StatusChip
                        tone={invoice.status === "paid" ? "green" : "amber"}
                      >
                        {invoice.status?.replace("_", " ")}
                      </StatusChip>
                    </td>
                    <td>
                      <strong>{money(invoice.total)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Your invoice feed is empty"
            text="Create your first invoice from the timesheet."
          />
        )}
      </Panel>
    </>
  );
}
