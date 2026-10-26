import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import api from "./api";
import { motion } from "framer-motion";
import { OrderInspector } from "./Operations";
import {
  Badge,
  Empty,
  Feedback,
  FoodImage,
  Icon,
  Modal,
  PageTitle,
  Pager,
  money,
  statuses,
  time,
  useApp,
  useResource,
} from "./shared";

function DailyChart({ rows, metric }) {
  const max = Math.max(...rows.map((row) => row[metric]), 1);
  const width = 740 / Math.max(rows.length, 1);
  const format = (value) => (metric === "revenue" ? money(value) : value);
  return (
    <svg
      viewBox="0 0 800 260"
      role="img"
      aria-label={`Daily ${metric} chart; exact figures are in the table below`}
      className="daily-chart"
    >
      {[37, 81, 125, 169, 212].map((y) => (
        <line className="chart-grid" key={y} x1="45" y1={y} x2="790" y2={y} />
      ))}
      <text x="5" y="25">
        {format(max)}
      </text>
      <text x="20" y="215">
        0
      </text>
      {rows.map((row, index) => {
        const height = (row[metric] / max) * 175;
        return (
          <g key={`${metric}-${row.date}`}>
            <title>
              {row.date}: {format(row[metric])}
            </title>
            <rect
              x={48 + index * width}
              y={212 - height}
              width={Math.max(2, width - 7)}
              height={height}
              rx="3"
              className="chart-bar"
              style={{ animationDelay: `${Math.min(index, 14) * 18}ms` }}
            />
            {(rows.length <= 14 ||
              index % Math.ceil(rows.length / 9) === 0) && (
              <text
                x={48 + index * width + width / 2}
                y="240"
                textAnchor="middle"
              >
                {row.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
      {!rows.some((row) => row[metric] > 0) && (
        <text x="420" y="120" textAnchor="middle">
          {metric === "orders"
            ? "Your next order starts the story."
            : "Revenue appears after your first delivery."}
        </text>
      )}
    </svg>
  );
}

function Overview() {
  const [days, setDays] = useState(14);
  const [metric, setMetric] = useState("orders");
  const resource = useResource(`/admin/analytics?days=${days}`, true, 20000);
  const report = resource.data;
  return (
    <>
      <PageTitle eyebrow="OPERATIONS, AT A GLANCE" title="The bigger picture.">
        <label className="inline-label">
          Reporting range
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            {[7, 14, 30, 90].map((n) => (
              <option value={n} key={n}>
                Last {n} days
              </option>
            ))}
          </select>
        </label>
      </PageTitle>
      <Feedback resource={resource}>
        {report && (
          <>
            <div className="stats-grid">
              {[
                [
                  "Orders today",
                  report.summary.orders_today,
                  "Placed since midnight",
                ],
                [
                  "Revenue today",
                  money(report.summary.revenue_today),
                  "Successfully delivered orders",
                ],
                [
                  "Average preparation",
                  `${report.summary.average_preparation_minutes} min`,
                  `Ready orders · last ${days} days`,
                ],
                [
                  "Period revenue",
                  money(report.summary.revenue),
                  `${report.summary.orders} orders placed in this period`,
                ],
              ].map(([label, value, hint], index) => (
                <motion.article
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="panel stat-card"
                  key={label}
                >
                  <Icon
                    name={["bag", "grid", "clock", "check"][index]}
                    size={18}
                  />
                  <p>{label}</p>
                  <strong>{value}</strong>
                  <span>{hint}</span>
                </motion.article>
              ))}
            </div>
            <div className="analytics-grid">
              <section className="panel chart-panel">
                <div className="section-heading">
                  <div>
                    <h2>The daily picture</h2>
                    <p className="muted">
                      Real order activity · {report.timezone}
                    </p>
                  </div>
                  <label className="sr-only" htmlFor="chart-metric">
                    Chart metric
                  </label>
                  <select
                    id="chart-metric"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                  >
                    <option value="orders">Orders placed</option>
                    <option value="revenue">Delivered revenue</option>
                  </select>
                </div>
                <DailyChart rows={report.daily} metric={metric} />
                <details>
                  <summary>View exact daily figures</summary>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Orders placed</th>
                          <th>Delivered</th>
                          <th>Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.daily.map((row) => (
                          <tr key={row.date}>
                            <td>{row.date}</td>
                            <td>{row.orders}</td>
                            <td>{row.delivered}</td>
                            <td>{money(row.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </section>
              <section className="panel status-panel">
                <h2>Where orders stand</h2>
                <p className="muted">Orders placed in this reporting period</p>
                {report.statuses.length ? (
                  report.statuses.map((row) => (
                    <div className="status-distribution" key={row._id}>
                      <div>
                        <Badge status={row._id} />
                        <strong>{row.count}</strong>
                      </div>
                      <div className="meter">
                        <span
                          style={{
                            width: `${(row.count / Math.max(report.summary.orders, 1)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <Empty title="No orders in this period">
                    Reports update as customers start ordering.
                  </Empty>
                )}
              </section>
            </div>
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>The team behind the delivery</h2>
                  <p className="muted">
                    Completed deliveries in this period. Transit time starts at
                    pickup.
                  </p>
                </div>
              </div>
              {report.agents.length ? (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Delivery agent</th>
                        <th>Deliveries</th>
                        <th>Average transit time</th>
                        <th>Delivered revenue</th>
                      </tr>   
                    </thead>
                    <tbody>
                      {report.agents.map((row) => (
                        <tr key={row._id}>
                          <td>
                            <strong>{row.name}</strong>
                          </td>
                          <td>{row.deliveries}</td>
                          <td>
                            {Number(row.average_minutes || 0).toFixed(1)} min
                          </td>
                          <td>{money(row.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Empty title="The first delivery is still ahead">
                  Agent performance appears after orders are delivered.
                </Empty>
              )}
            </section>
          </>
        )}
      </Feedback>
    </>
  );
}

function MenuForm({ food, close, refresh }) {
  const { run, busy } = useApp();
  async function submit(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    const data = {
      ...fields,
      price: Math.round(Number(fields.price) * 100),
      veg: fields.veg === "true",
      available: fields.available === "true",
    };
    await run(async () => {
      if (food._id) await api.put(`/admin/menu/${food._id}`, data);
      else await api.post("/admin/menu", data);
      refresh();
      close();
    }, "Menu item saved");
  }
  return (
    <Modal title={food._id ? "Edit dish" : "Add a new dish"} onClose={close}>
      <form onSubmit={submit} className="form-stack">
        <label>
          Dish name
          <input
            name="name"
            defaultValue={food.name}
            minLength={2}
            maxLength={100}
            required
          />
        </label>
        <div className="form-row">
          <label>
            Category
            <input
              name="category"
              defaultValue={food.category}
              minLength={2}
              maxLength={60}
              required
            />
          </label>
          <label>
            Price in rupees
            <input
              name="price"
              type="number"
              min="0.01"
              max="10000"
              step="0.01"
              defaultValue={food.price ? food.price / 100 : ""}
              required
            />
          </label>
        </div>
        <label>
          Description
          <textarea
            name="description"
            defaultValue={food.description}
            minLength={5}
            maxLength={600}
            required
          />
        </label>
        <label>
          Image URL (HTTPS)
          <input
            name="image"
            type="url"
            pattern="https://.*"
            defaultValue={food.image}
            maxLength={1000}
            required
          />
        </label>
        <div className="form-row">
          <label>
            Diet
            <select name="veg" defaultValue={String(food.veg ?? true)}>
              <option value="true">Vegetarian</option>
              <option value="false">Non-vegetarian</option>
            </select>
          </label>
          <label>
            Availability
            <select
              name="available"
              defaultValue={String(food.available ?? true)}
            >
              <option value="true">Available</option>
              <option value="false">Unavailable</option>
            </select>
          </label>
        </div>
        <button className="btn" disabled={busy}>
          Save dish
        </button>
      </form>
    </Modal>
  );
}

function MenuManagement() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const resource = useResource(
    `/menu?q=${encodeURIComponent(query)}&page=${page}&limit=10`,
  );
  const { run, busy } = useApp();
  return (
    <>
      <PageTitle eyebrow="CURATED BY YOUR KITCHEN" title="Make the menu yours.">
        <button className="btn" onClick={() => setEditing({})}>
          + Add dish
        </button>
      </PageTitle>
      <div className="panel">
        <div className="section-heading">
          <h2>The menu</h2>
          <input
            className="table-search"
            aria-label="Search menu items"
            placeholder="Search dishes…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Feedback resource={resource}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Dish</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Availability</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {resource.data?.items.map((food) => (
                  <tr key={food._id}>
                    <td>
                      <div className="table-dish">
                        <FoodImage src={food.image} alt={food.name} />
                        <div>
                          <strong>{food.name}</strong>
                          <small>
                            {food.veg ? "Vegetarian" : "Non-vegetarian"}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>{food.category}</td>
                    <td>{money(food.price)}</td>
                    <td>
                      <button
                        className={`availability ${food.available ? "available" : ""}`}
                        disabled={busy}
                        aria-label={`Mark ${food.name} ${food.available ? "unavailable" : "available"}`}
                        onClick={() =>
                          run(async () => {
                            await api.put(`/admin/menu/${food._id}`, {
                              ...food,
                              available: !food.available,
                            });
                            resource.refresh();
                          }, "Availability updated")
                        }
                      >
                        {food.available ? "● Available" : "● Unavailable"}
                      </button>
                    </td>
                    <td>
                      <div className="button-row">
                        <button
                          className="text-link"
                          onClick={() => setEditing(food)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-link danger"
                          disabled={busy}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Archive ${food.name}? It will be removed from the menu. Historical orders are preserved.`,
                              )
                            )
                              run(async () => {
                                await api.delete(`/admin/menu/${food._id}`);
                                resource.refresh();
                              }, "Dish archived");
                          }}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resource.data?.items.length === 0 && (
            <Empty title="No dishes found" />
          )}
          <Pager resource={resource} page={page} setPage={setPage} />
        </Feedback>
      </div>
      {editing && (
        <MenuForm
          food={editing}
          close={() => setEditing(null)}
          refresh={resource.refresh}
        />
      )}
    </>
  );
}

function Agents() {
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const resource = useResource(`/admin/agents?page=${page}`, true, 15000);
  const { run, busy } = useApp();
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await run(async () => {
      await api.post("/admin/agents", data);
      setAdding(false);
      resource.refresh();
    }, "Delivery agent created");
  }
  return (
    <>
      <PageTitle
        eyebrow="THE PEOPLE WHO GO THE EXTRA MILE"
        title="Your delivery team."
      >
        <button className="btn" onClick={() => setAdding(true)}>
          + Add agent
        </button>
      </PageTitle>
      <section className="panel">
        <Feedback resource={resource}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Email</th>
                  <th>Account status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {resource.data?.items.map((agent) => (
                  <tr key={agent._id}>
                    <td>
                      <strong>{agent.name}</strong>
                    </td>
                    <td>{agent.email}</td>
                    <td>
                      <span
                        className={`availability ${agent.active ? "available" : ""}`}
                      >
                        {agent.active ? "● Active" : "● Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn secondary small"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `${agent.active ? "Deactivate" : "Activate"} ${agent.name}?`,
                            )
                          )
                            run(async () => {
                              await api.patch(`/admin/agents/${agent._id}`, {
                                active: !agent.active,
                              });
                              resource.refresh();
                            }, "Agent account updated");
                        }}
                      >
                        {agent.active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resource.data?.items.length === 0 && (
            <Empty title="Build your delivery team">
              Add your first delivery agent to start assigning orders.
            </Empty>
          )}
          <Pager resource={resource} page={page} setPage={setPage} />
        </Feedback>
      </section>
      {adding && (
        <Modal title="Add delivery agent" onClose={() => setAdding(false)}>
          <form className="form-stack" onSubmit={submit}>
            <label>
              Full name
              <input
                name="name"
                minLength={2}
                maxLength={80}
                autoComplete="name"
                required
              />
            </label>
            <label>
              Email
              <input name="email" type="email" autoComplete="email" required />
            </label>
            <label>
              Initial password
              <input
                name="password"
                type="password"
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
            <button className="btn" disabled={busy}>
              Create agent account
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

function AllOrders() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ status: "", q: "", date: "" });
  const [selected, setSelected] = useState(null);
  const resource = useResource(
    `/orders?${new URLSearchParams({ ...filter, page })}`,
    true,
    10000,
  );
  function change(key, value) {
    setFilter((f) => ({ ...f, [key]: value }));
    setPage(1);
  }
  return (
    <>
      <PageTitle
        eyebrow="EVERY ORDER, EVERY STEP"
        title="The whole kitchen story."
      >
        <button className="btn secondary small" onClick={resource.refresh}>
          Refresh
        </button>
      </PageTitle>
      <section className="panel">
        <div className="orders-filters">
          <label>
            Search
            <input
              value={filter.q}
              onChange={(e) => change("q", e.target.value)}
              placeholder="Customer name or full order ID"
              maxLength={100}
            />
          </label>
          <label>
            Status
            <select
              value={filter.status}
              onChange={(e) => change("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
          <label>
            Order date (India)
            <input
              type="date"
              value={filter.date}
              onChange={(e) => change("date", e.target.value)}
            />
          </label>
          <button
            className="text-link"
            onClick={() => {
              setFilter({ status: "", q: "", date: "" });
              setPage(1);
            }}
          >
            Clear filters
          </button>
        </div>
        <Feedback resource={resource}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Status</th>
                  <th>Agent</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {resource.data?.items.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => setSelected(order._id)}
                      >
                        #{order._id.slice(-6).toUpperCase()}
                      </button>
                    </td>
                    <td>{order.customer_name}</td>
                    <td>{time(order.created_at)}</td>
                    <td>
                      <Badge status={order.status} />
                    </td>
                    <td>{order.agent_name || "Unassigned"}</td>
                    <td>{money(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {resource.data?.items.length === 0 && (
            <Empty title="No orders match your filters" />
          )}
          <Pager resource={resource} page={page} setPage={setPage} />
        </Feedback>
      </section>
      {selected && (
        <OrderInspector
          orderId={selected}
          onClose={() => setSelected(null)}
          onUpdate={resource.refresh}
        />
      )}
    </>
  );
}

export default function Admin() {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="menu" element={<MenuManagement />} />
      <Route path="agents" element={<Agents />} />
      <Route path="orders" element={<AllOrders />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
