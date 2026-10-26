import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "./api";
import { AnimatePresence, motion } from "framer-motion";
import {
  Badge,
  Empty,
  Feedback,
  Icon,
  Modal,
  OrderHistory,
  OrderItems,
  PageTitle,
  Pager,
  Totals,
  money,
  statuses,
  time,
  useApp,
  useResource,
} from "./shared";

function elapsed(date) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(date).getTime()) / 60000),
  );
  return minutes < 60
    ? `${minutes} min`
    : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export function OrderActions({ order, refresh, agents }) {
  const { user, run, busy } = useApp();
  const [agent, setAgent] = useState("");
  const [otp, setOtp] = useState("");
  async function transition(status, extra = {}) {
    await run(async () => {
      await api.post(`/orders/${order._id}/transition`, { status, ...extra });
      refresh();
    }, `Order marked ${status.toLowerCase()}`);
  }
  const manager = ["kitchen", "admin"].includes(user.role);
  return (
    <div className="order-actions">
      {manager && (
        <>
          {order.status === "Placed" && (
            <div className="button-row">
              <button
                className="btn small"
                disabled={busy}
                onClick={() => transition("Accepted")}
              >
                Accept order
              </button>
              <button
                className="btn secondary small danger"
                disabled={busy}
                onClick={() => {
                  const reason = window.prompt(
                    "Reject this order? Enter a reason for the customer.",
                  );
                  if (reason !== null) transition("Rejected", { reason });
                }}
              >
                Reject
              </button>
            </div>
          )}
          {order.status === "Accepted" && (
            <button
              className="btn small full"
              disabled={busy}
              onClick={() => transition("Preparing")}
            >
              Start preparing →
            </button>
          )}
          {order.status === "Preparing" && (
            <button
              className="btn small full"
              disabled={busy}
              onClick={() => transition("Ready")}
            >
              Mark ready for pickup ✓
            </button>
          )}
          {order.status === "Ready" && !order.agent_id && (
            <form
              className="assign-form"
              onSubmit={(event) => {
                event.preventDefault();
                run(async () => {
                  await api.post(`/orders/${order._id}/assign`, {
                    agent_id: agent,
                  });
                  refresh();
                  agents?.refresh();
                }, "Delivery agent assigned");
              }}
            >
              <label>
                Assign a delivery agent
                <select
                  required
                  value={agent}
                  onChange={(e) => setAgent(e.target.value)}
                >
                  <option value="">Select available agent</option>
                  {agents?.data?.map((row) => (
                    <option value={row._id} key={row._id}>
                      {row.name}
                    </option>
                  ))}
                </select>
              </label>
              {agents?.data?.length === 0 && (
                <p className="muted small-text">
                  No agents available. The list refreshes automatically.
                </p>
              )}
              {agents?.error && <p className="text-error">{agents.error}</p>}
              <button className="btn small full" disabled={busy || !agent}>
                Assign agent →
              </button>
            </form>
          )}
          {order.agent_id && (
            <p className="assignment-label">
              ↗ {order.agent_name} ·{" "}
              {order.assignment?.accepted_at
                ? "Assignment accepted"
                : "Awaiting acceptance"}
            </p>
          )}
          {["Ready", "Picked Up"].includes(order.status) && (
            <button
              className="text-link small-text"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Replace the delivery code? The customer will receive a new code in their order screen.",
                  )
                )
                  run(async () => {
                    await api.post(`/orders/${order._id}/otp-reset`, {});
                    refresh();
                  }, "Delivery code reissued");
              }}
            >
              Reissue delivery code
            </button>
          )}
          {user.role === "admin" &&
            ["Placed", "Accepted"].includes(order.status) && (
              <button
                className="text-link danger"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Cancel this order?"))
                    transition("Cancelled", {
                      reason: "Cancelled by operations",
                    });
                }}
              >
                Cancel order
              </button>
            )}
        </>
      )}
      {user.role === "delivery" && (
        <>
          {order.status === "Ready" && !order.assignment?.accepted_at && (
            <button
              className="btn full"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api.post(`/orders/${order._id}/accept-assignment`, {});
                  refresh();
                }, "Assignment accepted")
              }
            >
              Accept assignment →
            </button>
          )}
          {order.status === "Ready" && order.assignment?.accepted_at && (
            <button
              className="btn full"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "Confirm you have picked up this order from the kitchen?",
                  )
                )
                  transition("Picked Up");
              }}
            >
              Confirm pickup →
            </button>
          )}
          {order.status === "Picked Up" && (
            <form
              className="form-stack otp-form"
              onSubmit={(e) => {
                e.preventDefault();
                transition("Delivered", { otp });
              }}
            >
              <label>
                Customer's delivery code
                <input
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  pattern="[0-9]{6}"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="6-digit code"
                />
              </label>
              <p className="muted small-text">
                Ask the customer for the code after handing over their meal.
              </p>
              <button className="btn full" disabled={busy}>
                Verify & complete delivery ✓
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}

export function OrderInspector({ orderId, onClose, onUpdate }) {
  const resource = useResource(`/orders/${orderId}`, true, 6000);
  const { user } = useApp();
  const agents = useResource(
    "/agents/available",
    ["kitchen", "admin"].includes(user.role),
    10000,
  );
  const order = resource.data;
  function refresh() {
    resource.refresh();
    onUpdate?.();
  }
  return (
    <Modal
      title={`Order #${orderId.slice(-6).toUpperCase()}`}
      onClose={onClose}
    >
      <Feedback resource={resource}>
        {order && (
          <>
            <div className="inspector-meta">
              <Badge status={order.status} />
              <p className="muted">{time(order.created_at)}</p>
            </div>
            <h3>{order.customer_name}</h3>
            <p>{order.address.line}</p>
            <p className="muted">{order.address.phone}</p>
            {order.note && (
              <div className="kitchen-note">Kitchen note: {order.note}</div>
            )}
            <OrderItems order={order} />
            <Totals value={order} />
            <OrderActions order={order} agents={agents} refresh={refresh} />
            <h3 className="section-subtitle">Assignment timestamps</h3>
            <dl className="timestamp-list">
              {[
                ["assigned_at", "Assigned"],
                ["accepted_at", "Accepted"],
                ["picked_up_at", "Picked up"],
                ["delivered_at", "Delivered"],
              ].map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{time(order.assignment?.[key])}</dd>
                </div>
              ))}
            </dl>
            <h3 className="section-subtitle">Activity history</h3>
            <OrderHistory order={order} />
          </>
        )}
      </Feedback>
    </Modal>
  );
}

export default function Operations({ role }) {
  const location = useLocation();
  const history = location.pathname.endsWith("/history");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    setPage(1);
    setFilter("");
  }, [history, role]);
  const resource = useResource(
    `/orders?scope=${history ? "history" : "active"}&page=${page}&limit=20&sort=oldest&status=${encodeURIComponent(filter)}`,
    true,
    6000,
  );
  const agents = useResource(
    "/agents/available",
    role === "kitchen" && !history,
    10000,
  );
  function refresh() {
    resource.refresh();
    agents.refresh();
  }
  const rows = resource.data?.items || [];
  const allowed = history
    ? ["Delivered", "Cancelled", "Rejected"]
    : role === "delivery"
      ? ["Ready", "Picked Up"]
      : statuses.slice(0, 5);
  return (
    <>
      <PageTitle
        eyebrow={
          role === "kitchen" ? "KITCHEN OPERATIONS" : "DELIVERY OPERATIONS"
        }
        title={
          history
            ? "A record of good work."
            : role === "kitchen"
              ? "The kitchen, in sync."
              : "Your next stop."
        }
      >
        <div className="button-row">
          <span className="live-indicator">Refreshes every 6 seconds</span>
          <button className="btn secondary small" onClick={refresh}>
            Refresh
          </button>
        </div>
      </PageTitle>
      {!history && (
        <>
          <div className="queue-overview">
            {[
              ["bag", resource.data?.total, "Matching active orders"],
              [
                "flame",
                rows.filter(
                  (order) =>
                    order.status ===
                    (role === "kitchen" ? "Preparing" : "Ready"),
                ).length,
                role === "kitchen"
                  ? "Preparing on this page"
                  : "Awaiting pickup on this page",
              ],
              [
                "check",
                rows.filter(
                  (order) =>
                    order.status ===
                    (role === "kitchen" ? "Ready" : "Picked Up"),
                ).length,
                role === "kitchen"
                  ? "Ready on this page"
                  : "On the road on this page",
              ],
            ].map(([icon, value, label]) => (
              <div className="queue-metric" key={label}>
                <Icon name={icon} size={23} />
                <div>
                  <strong>{resource.data ? value : "—"}</strong>
                  <p>{label}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="queue-overview-note">
            Counts follow your current filters. Preparation and delivery counts
            reflect the orders shown below.
          </p>
        </>
      )}
      <div className="operation-toolbar">
        <p className="muted">
          {resource.data?.total ?? "—"}{" "}
          {history ? "past orders" : "active orders"} ·{" "}
          {role === "delivery"
            ? "Assignments reserved for you"
            : "Oldest orders first"}
        </p>
        <div
          className="operation-filter-tabs"
          aria-label="Filter orders by status"
        >
          <button
            className={!filter ? "selected" : ""}
            aria-pressed={!filter}
            onClick={() => {
              setFilter("");
              setPage(1);
            }}
          >
            All {history ? "past" : "active"}
          </button>
          {allowed.map((status) => (
            <button
              key={status}
              className={filter === status ? "selected" : ""}
              aria-pressed={filter === status}
              onClick={() => {
                setFilter(status);
                setPage(1);
              }}
            >
              {status}
            </button>
          ))}
        </div>
        <label className="inline-label operation-mobile-filter">
          Status
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All {history ? "past" : "active"}</option>
            {allowed.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
      </div>
      <Feedback resource={resource}>
        {rows.length ? (
          <div
            className={`operations-grid ${role === "delivery" ? "delivery-grid" : ""}`}
          >
            <AnimatePresence initial={false}>
              {rows.map((order) => (
                <motion.article
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="panel operation-card"
                  key={order._id}
                  data-status={order.status}
                >
                  <div className="operation-card-head">
                    <span className="eyebrow">
                      #{order._id.slice(-6).toUpperCase()}
                    </span>
                    <Badge status={order.status} />
                  </div>
                  <h2>{order.customer_name}</h2>
                  <p className="order-age">
                    Ordered {elapsed(order.created_at)} ago ·{" "}
                    {time(order.created_at)}
                  </p>
                  {order.status === "Preparing" && (
                    <p className="prep-time">
                      Preparing for {elapsed(order.preparing_at)}
                    </p>
                  )}
                  <OrderItems order={order} />
                  {order.note && (
                    <div className="kitchen-note">{order.note}</div>
                  )}
                  {role === "delivery" && (
                    <div className="delivery-address">
                      <span className="eyebrow">DELIVER TO</span>
                      <h3>{order.address.label}</h3>
                      <p>{order.address.line}</p>
                      <a
                        href={`tel:${order.address.phone}`}
                        className="text-link"
                      >
                        {order.address.phone}
                      </a>
                    </div>
                  )}
                  <div className="order-card-total">
                    <span>
                      {order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0,
                      )}{" "}
                      items
                    </span>
                    <strong>{money(order.total)}</strong>
                  </div>
                  <OrderActions
                    order={order}
                    agents={agents}
                    refresh={refresh}
                  />
                  <button
                    className="text-link activity-link"
                    onClick={() => setSelected(order._id)}
                  >
                    Details & activity →
                  </button>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          !resource.loading &&
          !resource.error && (
            <Empty
              title={
                history
                  ? "No past orders yet"
                  : role === "kitchen"
                    ? "A moment to catch your breath."
                    : "You’re all caught up."
              }
            >
              {role === "kitchen"
                ? "New customer orders appear here automatically."
                : "Your kitchen manager will assign your next delivery here."}
            </Empty>
          )
        )}
        <Pager resource={resource} page={page} setPage={setPage} />
      </Feedback>
      {selected && (
        <OrderInspector
          orderId={selected}
          onClose={() => setSelected(null)}
          onUpdate={refresh}
        />
      )}
    </>
  );
}
