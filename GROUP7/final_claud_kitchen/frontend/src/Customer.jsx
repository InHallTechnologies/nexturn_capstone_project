import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Landing, { ClosingStory } from "./Landing";
import FoodCard from "./FoodCard";
import MenuRefinements from "./MenuRefinements";
import { cartChanged } from "./media";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import api from "./api";
import {
  Badge,
  Empty,
  Feedback,
  FoodImage,
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

function Reviews({ food, close }) {
  const [page, setPage] = useState(1);
  const resource = useResource(`/menu/${food._id}/reviews?page=${page}`);
  return (
    <Modal title={`Reviews · ${food.name}`} onClose={close}>
      <Feedback resource={resource}>
        {resource.data?.items.length ? (
          <div className="review-list">
            {resource.data.items.map((review, i) => (
              <article key={i}>
                <div>
                  <strong>
                    {"★".repeat(review.score)}
                    {"☆".repeat(5 - review.score)}
                  </strong>
                  <small>{time(review.created_at)}</small>
                </div>
                <p>{review.review}</p>
                <span className="muted">{review.customer_name}</span>
              </article>
            ))}
          </div>
        ) : (
          <Empty title="Be the first to share a review">
            Reviews are from customers with delivered orders.
          </Empty>
        )}
        <Pager resource={resource} page={page} setPage={setPage} />
      </Feedback>
    </Modal>
  );
}

export function Menu() {
  const { user, run, busy, notify } = useApp();
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    q: "",
    category: "",
    veg: "",
    sort: "name",
    max: "",
  });
  const [page, setPage] = useState(1);
  const [review, setReview] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const params = new URLSearchParams({
    q: filters.q,
    category: filters.category,
    veg: filters.veg,
    sort: filters.sort,
    page,
  });
  if (filters.max)
    params.set("max_price", Math.round(Number(filters.max) * 100));
  const resource = useResource(`/menu?${params}`);
  const categories = useResource("/categories");
  const cart = useResource("/cart", user?.role === "customer");
  function filter(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }
  async function add(food) {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "customer") {
      notify("Use a customer account to place orders.", true);
      return;
    }
    if (!cart.data) return;
    const existing = cart.data.items.find((item) => item.item_id === food._id);
    if (existing?.quantity >= 20) {
      notify("You can add up to 20 of each item.", true);
      return;
    }
    const items = cart.data.items.map((item) => ({
      item_id: item.item_id,
      quantity: item.quantity + (item.item_id === food._id ? 1 : 0),
    }));
    if (!existing) items.push({ item_id: food._id, quantity: 1 });
    await run(async () => {
      await api.put("/cart", { items, version: cart.data.version });
      cartChanged();
      cart.refresh();
    }, `${food.name} added to your cart`);
  }
  const count =
    cart.data?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  return (
    <>
      <Landing
        onDiscover={(food) => {
          setFilters({
            q: food.name,
            category: "",
            veg: "",
            sort: "name",
            max: "",
          });
          setPage(1);
          document.getElementById("food-menu")?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
          });
        }}
      />
      <div className="menu-layout" id="food-menu">
        <section>
          <PageTitle
            eyebrow="FIND YOUR NEXT FAVOURITE"
            title="Good taste. Your way."
          >
            <span className="muted">
              {resource.data
                ? `${resource.data.total} dishes`
                : resource.loading
                  ? "Finding your favourites…"
                  : "Menu unavailable"}
            </span>
          </PageTitle>
          <div className="menu-filters">
            <label className="search-field">
              <span>
                <Icon name="search" size={20} />
              </span>
              <input
                aria-label="Search dishes"
                placeholder="What are you craving?"
                value={filters.q}
                onChange={(e) => filter("q", e.target.value)}
                maxLength={100}
              />
            </label>
            <button
              className="mobile-filter-toggle btn secondary"
              aria-expanded={filtersOpen}
              aria-haspopup="dialog"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Icon name="filter" size={17} /> Refine your menu{" "}
              <span>{filtersOpen ? "−" : "+"}</span>
            </button>
            <div className="filter-row">
              <MenuRefinements
                filters={filters}
                onFilter={filter}
                prefix="desktop"
              />
            </div>
            <div className="category-tabs" aria-label="Food categories">
              <button
                className={!filters.category ? "selected" : ""}
                aria-pressed={!filters.category}
                onClick={() => filter("category", "")}
              >
                All dishes
              </button>
              {categories.data?.map((category) => (
                <button
                  key={category}
                  className={filters.category === category ? "selected" : ""}
                  aria-pressed={filters.category === category}
                  onClick={() => filter("category", category)}
                >
                  {category}
                </button>
              ))}
            </div>
            {categories.error && (
              <p className="category-error" role="alert">
                Categories couldn’t load.{" "}
                <button onClick={categories.refresh}>Try again</button>
              </p>
            )}
            {(filters.q || filters.category || filters.veg || filters.max) && (
              <button
                className="text-link reset-filters"
                onClick={() => {
                  setFilters({
                    q: "",
                    category: "",
                    veg: "",
                    sort: "name",
                    max: "",
                  });
                  setPage(1);
                }}
              >
                <Icon name="close" size={13} /> Clear filters
              </button>
            )}
          </div>
          <Feedback resource={resource} variant="cards">
            <div className="food-grid">
              {resource.data?.items.map((food, index) => (
                <FoodCard
                  key={food._id}
                  food={food}
                  index={index}
                  quantity={
                    cart.data?.items.find((item) => item.item_id === food._id)
                      ?.quantity || 0
                  }
                  disabled={busy || (user?.role === "customer" && !cart.data)}
                  onAdd={() => add(food)}
                  onReview={() => setReview(food)}
                />
              ))}
            </div>
            {resource.data?.items.length === 0 && (
              <Empty title="No dishes found">
                Try another search or a different filter.
              </Empty>
            )}
            <Pager resource={resource} page={page} setPage={setPage} />
          </Feedback>
        </section>
        <aside className="cart-preview panel">
          <p className="eyebrow">A LITTLE SOMETHING FOR YOU</p>
          <div className="aside-heading">
            <h2>Your table.</h2>
            <span>{user?.role === "customer" && !cart.data ? "—" : count}</span>
          </div>
          {cart.data?.items.length ? (
            <>
              <AnimatePresence initial={false}>
                {cart.data.items.map((item) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mini-cart-item"
                    key={item.item_id}
                  >
                    <span>
                      {item.quantity} × {item.name}
                    </span>
                    <strong>{money(item.unit_price * item.quantity)}</strong>
                  </motion.div>
                ))}
              </AnimatePresence>
              <Totals value={cart.data} />
              <Link className="btn full" to="/customer/cart">
                Review your order →
              </Link>
            </>
          ) : cart.loading ? (
            <div className="cart-loading" role="status">
              <span className="spinner" /> Bringing your table together…
            </div>
          ) : cart.error ? null : (
            <div className="cart-empty">
              <span>
                <Icon name="bag" size={40} />
              </span>
              <h3>A good meal starts here.</h3>
              <p>Add a few favourites and we'll take care of the rest.</p>
            </div>
          )}
          {cart.error && (
            <div className="error">
              {cart.error}
              <button onClick={cart.refresh}>Retry cart</button>
            </div>
          )}
          <p className="delivery-note">
            <Icon name="check" size={14} /> Pay on delivery. Your meal, your
            moment.
          </p>
        </aside>
      </div>
      <ClosingStory />
      {filtersOpen && (
        <Modal
          className="filter-drawer"
          title="A meal, your way."
          onClose={() => setFiltersOpen(false)}
        >
          <p className="muted">
            A few thoughtful choices. Find exactly what you’re craving.
          </p>
          <div className="mobile-filter-fields">
            <MenuRefinements
              filters={filters}
              onFilter={filter}
              prefix="mobile"
            />
          </div>
          <button className="btn full" onClick={() => setFiltersOpen(false)}>
            Explore dishes <Icon name="arrow" size={18} />
          </button>
        </Modal>
      )}
      {user?.role === "customer" && count > 0 && (
        <Link className="mobile-cart" to="/customer/cart">
          <span>
            <Icon name="bag" size={18} />
            {count} {count === 1 ? "item" : "items"} · {money(cart.data.total)}
          </span>
          <strong>
            View cart <Icon name="arrow" size={17} />
          </strong>
        </Link>
      )}
      {review && <Reviews food={review} close={() => setReview(null)} />}
    </>
  );
}

function Cart() {
  const resource = useResource("/cart");
  const addresses = useResource("/addresses");
  const { run, busy } = useApp();
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const requestKey = useRef(null);
  const navigate = useNavigate();
  async function quantity(item, amount) {
    const items = resource.data.items
      .map((row) => ({
        item_id: row.item_id,
        quantity: row.item_id === item.item_id ? amount : row.quantity,
      }))
      .filter((row) => row.quantity > 0);
    await run(async () => {
      await api.put("/cart", { version: resource.data.version, items });
      cartChanged();
      resource.refresh();
    });
  }
  async function checkout(event) {
    event.preventDefault();
    const data = {
      address_id: address || addresses.data?.[0]?._id,
      cart_version: resource.data.version,
      note,
    };
    const signature = JSON.stringify(data);
    if (requestKey.current?.signature !== signature)
      requestKey.current = { signature, key: crypto.randomUUID() };
    await run(async () => {
      const response = await api.post("/orders", data, {
        headers: { "Idempotency-Key": requestKey.current.key },
      });
      cartChanged();
      navigate(`/customer/orders/${response.data.data._id}`);
    }, "Your order is on its way to the kitchen!");
  }
  return (
    <>
      <PageTitle eyebrow="A MEAL WORTH LOOKING FORWARD TO" title="Your cart">
        <Link className="text-link" to="/customer/menu">
          ← Keep exploring
        </Link>
      </PageTitle>
      <Feedback resource={resource}>
        {resource.data?.items.length ? (
          <div className="checkout-layout">
            <section className="panel">
              <h2>Your favourites</h2>
              <AnimatePresence initial={false}>
                {resource.data.items.map((item) => (
                  <motion.article
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    className="cart-line"
                    key={item.item_id}
                  >
                    <div className="cart-thumb">
                      <FoodImage src={item.image} alt={item.name} />
                    </div>
                    <div className="cart-line-title">
                      <h3>{item.name}</h3>
                      <p className="muted">{money(item.unit_price)} each</p>
                      {!item.available && (
                        <p className="text-error">
                          Unavailable — remove to continue
                        </p>
                      )}
                      <button
                        className="text-link"
                        disabled={busy}
                        onClick={() => quantity(item, 0)}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="quantity">
                      <button
                        aria-label={`Remove one ${item.name}`}
                        disabled={busy}
                        onClick={() => quantity(item, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        aria-label={`Add one ${item.name}`}
                        disabled={
                          busy || item.quantity >= 20 || !item.available
                        }
                        onClick={() => quantity(item, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                    <strong>{money(item.quantity * item.unit_price)}</strong>
                  </motion.article>
                ))}
              </AnimatePresence>
              <button
                className="text-link"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Remove everything from your cart?"))
                    run(async () => {
                      await api.put("/cart", {
                        version: resource.data.version,
                        items: [],
                      });
                      cartChanged();
                      resource.refresh();
                    });
                }}
              >
                Clear cart
              </button>
            </section>
            <form className="panel form-stack" onSubmit={checkout}>
              <div className="checkout-heading">
                <span className="eyebrow">THE FINAL TOUCHES</span>
                <h2>Let’s make it a meal.</h2>
              </div>
              <Feedback resource={addresses}>
                <label>
                  Deliver to
                  <select
                    required
                    value={address || addresses.data?.[0]?._id || ""}
                    onChange={(e) => setAddress(e.target.value)}
                  >
                    <option value="" disabled>
                      Choose a delivery address
                    </option>
                    {addresses.data?.map((row) => (
                      <option key={row._id} value={row._id}>
                        {row.label} · {row.line}
                      </option>
                    ))}
                  </select>
                </label>
              </Feedback>
              <Link to="/customer/addresses" className="text-link">
                Manage delivery addresses →
              </Link>
              <label>
                Kitchen note <span className="muted">(optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  placeholder="Any preparation preferences?"
                />
              </label>
              <Totals value={resource.data} />
              <p className="muted small-text">
                Pay on delivery. Final prices are recalculated by the kitchen
                when your order is placed.
              </p>
              <button
                className="btn full"
                disabled={
                  busy ||
                  !addresses.data?.length ||
                  resource.data.items.some((item) => !item.available)
                }
              >
                {busy
                  ? "Placing your order…"
                  : `Place order · ${money(resource.data.total)}`}
              </button>
            </form>
          </div>
        ) : (
          resource.data && (
            <Empty title="Your cart is waiting">
              <Link to="/customer/menu" className="text-link">
                Find something delicious →
              </Link>
            </Empty>
          )
        )}
      </Feedback>
    </>
  );
}

function AddressForm({ address, close, refresh }) {
  const { run, busy } = useApp();
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await run(async () => {
      if (address?._id) await api.put(`/addresses/${address._id}`, data);
      else await api.post("/addresses", data);
      refresh();
      close();
    }, "Address saved");
  }
  return (
    <Modal
      title={address?._id ? "Edit delivery address" : "Add delivery address"}
      onClose={close}
    >
      <form className="form-stack" onSubmit={submit}>
        <label>
          Label
          <input
            name="label"
            defaultValue={address?.label}
            placeholder="Home, work…"
            maxLength={40}
            required
          />
        </label>
        <label>
          Complete delivery address
          <textarea
            name="line"
            defaultValue={address?.line}
            placeholder="Flat, building, street, city and PIN code"
            minLength={8}
            maxLength={400}
            required
          />
        </label>
        <label>
          Contact phone
          <input
            name="phone"
            type="tel"
            defaultValue={address?.phone}
            minLength={7}
            maxLength={20}
            required
          />
        </label>
        <button className="btn" disabled={busy}>
          Save address
        </button>
      </form>
    </Modal>
  );
}

function Addresses() {
  const resource = useResource("/addresses");
  const [editing, setEditing] = useState(null);
  const { run, busy } = useApp();
  return (
    <>
      <PageTitle eyebrow="MAKE YOURSELF AT HOME" title="Delivery addresses">
        <button className="btn" onClick={() => setEditing({})}>
          + Add address
        </button>
      </PageTitle>
      <Feedback resource={resource}>
        <div className="address-grid">
          {resource.data?.map((row) => (
            <article className="panel address-card" key={row._id}>
              <span className="eyebrow">DELIVER TO</span>
              <h2>{row.label}</h2>
              <p>{row.line}</p>
              <p className="muted">{row.phone}</p>
              <div className="button-row">
                <button
                  className="btn secondary"
                  onClick={() => setEditing(row)}
                >
                  Edit
                </button>
                <button
                  className="text-link danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm("Delete this delivery address?"))
                      run(async () => {
                        await api.delete(`/addresses/${row._id}`);
                        resource.refresh();
                      }, "Address deleted");
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
        {resource.data?.length === 0 && (
          <Empty title="Where should we bring your meal?">
            Add an address to start ordering.
          </Empty>
        )}
      </Feedback>
      {editing && (
        <AddressForm
          address={editing}
          refresh={resource.refresh}
          close={() => setEditing(null)}
        />
      )}
    </>
  );
}

function Orders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const resource = useResource(
    `/orders?page=${page}&status=${encodeURIComponent(status)}`,
    true,
    7000,
  );
  return (
    <>
      <PageTitle eyebrow="FROM OUR KITCHEN TO YOUR DOOR" title="Your orders">
        <label className="inline-label">
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All orders</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </PageTitle>
      <Feedback resource={resource}>
        <div className="orders-list">
          {resource.data?.items.map((order) => (
            <Link
              to={`/customer/orders/${order._id}`}
              className="panel order-summary"
              key={order._id}
            >
              <div>
                <span className="eyebrow">
                  ORDER #{order._id.slice(-6).toUpperCase()}
                </span>
                <h3>
                  {order.items
                    .map((item) => `${item.quantity} × ${item.name}`)
                    .join(", ")}
                </h3>
                <p className="muted">{time(order.created_at)}</p>
              </div>
              <div className="summary-right">
                <Badge status={order.status} />
                <strong>{money(order.total)}</strong>
                <span className="text-link">View order →</span>
              </div>
            </Link>
          ))}
        </div>
        {resource.data?.items.length === 0 && (
          <Empty title="No orders here yet">
            Your next favourite meal is on the menu.
          </Empty>
        )}
        <Pager resource={resource} page={page} setPage={setPage} />
      </Feedback>
    </>
  );
}

function OrderDetail() {
  const { orderId } = useParams();
  const resource = useResource(`/orders/${orderId}`, true, 5000);
  const { run, busy } = useApp();
  const navigate = useNavigate();
  const [rating, setRating] = useState(false);
  const order = resource.data;
  async function reorder() {
    if (
      !window.confirm(
        "Replace your current cart with this order? Current prices and availability will apply.",
      )
    )
      return;
    await run(async () => {
      const cart = await api.get("/cart");
      await api.post(`/orders/${orderId}/reorder`, {
        cart_version: cart.data.data.version,
      });
      cartChanged();
      navigate("/customer/cart");
    }, "Your favourites are back in the cart");
  }
  async function review(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await run(async () => {
      await api.post(`/orders/${orderId}/rating`, {
        ...data,
        score: Number(data.score),
      });
      setRating(false);
      resource.refresh();
    }, "Thank you for sharing your review");
  }
  return (
    <>
      <PageTitle
        eyebrow="YOUR MEAL'S JOURNEY"
        title={
          order ? `Order #${order._id.slice(-6).toUpperCase()}` : "Your order"
        }
      >
        <Link className="text-link" to="/customer/orders">
          ← All orders
        </Link>
      </PageTitle>
      <Feedback resource={resource}>
        {order && (
          <>
            <div className="panel tracking-panel">
              <div className="tracking-heading">
                <h2>
                  {order.status === "Delivered"
                    ? "Enjoy every bite."
                    : order.status === "Cancelled" ||
                        order.status === "Rejected"
                      ? "This order has ended."
                      : "A good meal is in the making."}
                </h2>
                <Badge status={order.status} />
              </div>
              <ol className="tracking-steps">
                {statuses.slice(0, 6).map((step, i) => (
                  <li
                    className={
                      statuses.indexOf(order.status) < 6 &&
                      i <= statuses.indexOf(order.status)
                        ? "done"
                        : ""
                    }
                    aria-current={order.status === step ? "step" : undefined}
                    key={step}
                  >
                    <span>{i + 1}</span>
                    <p>{step}</p>
                    {order.history.find((entry) => entry.status === step)
                      ?.at && (
                      <small>
                        {new Date(
                          order.history.find((entry) => entry.status === step)
                            .at,
                        ).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        })}
                      </small>
                    )}
                  </li>
                ))}
              </ol>
              {order.delivery_otp && (
                <div className="otp-box">
                  <div>
                    <strong>Your delivery code</strong>
                    <p>
                      Share with your delivery agent after receiving your meal.
                    </p>
                  </div>
                  <b>{order.delivery_otp}</b>
                </div>
              )}
            </div>
            <div className="checkout-layout">
              <section className="panel">
                <h2>Made just for you</h2>
                <OrderItems order={order} />
                <Totals value={order} />
                <div className="detail-address">
                  <h3>Delivery to {order.address.label}</h3>
                  <p>{order.address.line}</p>
                  <p className="muted">{order.address.phone}</p>
                  {order.agent_name && (
                    <p>Delivery agent: {order.agent_name}</p>
                  )}
                  {order.note && <p>Kitchen note: {order.note}</p>}
                </div>
                <div className="button-row">
                  <button
                    className="btn secondary"
                    disabled={busy}
                    onClick={reorder}
                  >
                    Order again
                  </button>
                  {["Placed", "Accepted"].includes(order.status) && (
                    <button
                      className="text-link danger"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm("Cancel this order?"))
                          run(async () => {
                            await api.post(`/orders/${orderId}/transition`, {
                              status: "Cancelled",
                            });
                            resource.refresh();
                          }, "Order cancelled");
                      }}
                    >
                      Cancel order
                    </button>
                  )}
                  {order.status === "Delivered" && !order.rating && (
                    <button className="btn" onClick={() => setRating(true)}>
                      Leave a review
                    </button>
                  )}
                </div>
                {order.rating && (
                  <div className="saved-review">
                    <strong>
                      {"★".repeat(order.rating.score)} Your review
                    </strong>
                    <p>{order.rating.review}</p>
                  </div>
                )}
              </section>
              <section className="panel">
                <h2>Order activity</h2>
                <OrderHistory order={order} />
              </section>
            </div>
          </>
        )}
      </Feedback>
      {rating && (
        <Modal title="How was your meal?" onClose={() => setRating(false)}>
          <form onSubmit={review} className="form-stack">
            <label>
              Your rating
              <select name="score" defaultValue="5">
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "star" : "stars"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your review
              <textarea name="review" minLength={1} maxLength={1000} required />
            </label>
            <button className="btn" disabled={busy}>
              Submit review
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}

export default function Customer() {
  return (
    <Routes>
      <Route index element={<Navigate to="menu" replace />} />
      <Route path="menu" element={<Menu />} />
      <Route path="cart" element={<Cart />} />
      <Route path="addresses" element={<Addresses />} />
      <Route path="orders" element={<Orders />} />
      <Route path="orders/:orderId" element={<OrderDetail />} />
      <Route path="*" element={<Navigate to="menu" replace />} />
    </Routes>
  );
}
