import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import api, { message } from "./api";
import { localFoodImage } from "./media";
import { motion } from "framer-motion";

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const iconPaths = {
  arrow: "M4 12h16m-6-6 6 6-6 6",
  down: "M12 4v16m-6-6 6 6 6-6",
  bag: "M5 7h14l1 14H4L5 7Zm3 0V6a4 4 0 0 1 8 0v1",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  menu: "M4 5h16M4 12h16M4 19h16",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  clock: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM12 7v5l3 2",
  team: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M15 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.87M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  check: "m5 12 4 4L19 6",
  flame: "M12 2c2 6 7 7 7 13a7 7 0 0 1-14 0c0-3 1-5 3-7 0 3 2 4 2 4s4-4 2-10Z",
  star: "m12 2 2.8 6.2L22 9l-5.3 4.8 1.6 7.2-6.3-3.7L5.7 21l1.6-7.2L2 9l7.2-.8L12 2Z",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  close: "m6 6 12 12M6 18 18 6",
  filter: "M4 7h16M7 12h10M10 17h4M8 4v6M16 9v6",
};

export function Icon({ name = "arrow", size = 20, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={iconPaths[name] || iconPaths.arrow} />
    </svg>
  );
}

export function FoodImage({
  src,
  alt = "",
  className = "",
  loading = "lazy",
  ...props
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  if (failed || !src)
    return (
      <span
        className={`image-fallback ${className}`}
        role="img"
        aria-label={alt || "Dish photograph unavailable"}
      >
        <Icon name="flame" size={40} />
        <span>made with care.</span>
      </span>
    );
  return (
    <img
      src={localFoodImage(src)}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
export const money = (paise = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paise / 100);
export const time = (date) =>
  date
    ? new Date(date).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "—";
export const statuses = [
  "Placed",
  "Accepted",
  "Preparing",
  "Ready",
  "Picked Up",
  "Delivered",
  "Cancelled",
  "Rejected",
];

export function useResource(path, enabled = true, interval = 0) {
  const [state, setState] = useState({
    data: null,
    loading: enabled,
    error: "",
  });
  const [revision, setRevision] = useState(0);
  const previousPath = useRef(null);
  useEffect(() => {
    if (!enabled) {
      previousPath.current = null;
      setState({ data: null, loading: false, error: "" });
      return;
    }
    let stopped = false;
    let timer;
    let controller;
    // Keep confirmed content on refresh so quantity and queue changes can
    // animate without replacing the whole view with a loading skeleton.
    const samePath = previousPath.current === path;
    previousPath.current = path;
    setState((current) =>
      samePath && current.data
        ? { ...current, error: "" }
        : { data: null, loading: true, error: "" },
    );
    async function load() {
      if (stopped) return;
      if (document.hidden && interval) {
        timer = window.setTimeout(load, interval);
        return;
      }
      controller = new AbortController();
      try {
        const response = await api.get(path, { signal: controller.signal });
        if (!stopped)
          setState({ data: response.data.data, loading: false, error: "" });
      } catch (error) {
        if (!stopped && !controller.signal.aborted)
          setState((s) => ({ ...s, loading: false, error: message(error) }));
      } finally {
        if (!stopped && interval) timer = window.setTimeout(load, interval);
      }
    }
    load();
    return () => {
      stopped = true;
      controller?.abort();
      window.clearTimeout(timer);
    };
  }, [path, enabled, interval, revision]);
  return { ...state, refresh: () => setRevision((n) => n + 1) };
}

export function Feedback({ resource, children, variant = "lines" }) {
  if (resource.loading && !resource.data)
    return (
      <div
        className={`skeleton-group skeleton-${variant}`}
        role="status"
        aria-label="Loading content"
        aria-busy="true"
      >
        {[0, 1, 2].map((item) => (
          <div className="skeleton-item" key={item}>
            <span />
            <span />
            <span />
          </div>
        ))}
        <span className="sr-only">Loading…</span>
      </div>
    );
  return (
    <>
      {resource.error && (
        <div className="error" role="alert">
          {resource.error} <button onClick={resource.refresh}>Try again</button>
        </div>
      )}
      {children}
    </>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="bag" size={32} />
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

export function Pager({ resource, page, setPage }) {
  const total = resource.data?.total || 0;
  const size = resource.data?.limit || 12;
  const pages = Math.max(1, Math.ceil(total / size));
  useEffect(() => {
    if (resource.data && !resource.loading && page > pages) setPage(pages);
  }, [resource.data, resource.loading, page, pages, setPage]);
  if (total <= size && page === 1) return null;
  return (
    <div className="pagination">
      <button
        className="btn secondary"
        disabled={page <= 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} of {pages}
      </span>
      <button
        className="btn secondary"
        disabled={page * size >= total}
        onClick={() => setPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}

export function Badge({ status }) {
  return (
    <motion.span
      key={status}
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      className={`badge status-${status.replaceAll(" ", "-").toLowerCase()}`}
    >
      {status}
    </motion.span>
  );
}

export function Modal({ title, children, onClose, className = "" }) {
  const ref = useRef(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    const cancel = (event) => {
      event.preventDefault();
      close.current();
    };
    dialog.addEventListener("cancel", cancel);
    return () => {
      dialog.removeEventListener("cancel", cancel);
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{title}</h2>
        <button
          aria-label="Close dialog"
          className="icon-btn"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>
      {children}
    </dialog>
  );
}

export function Totals({ value }) {
  return (
    <dl className="totals">
      <div>
        <dt>Items subtotal</dt>
        <dd>{money(value.subtotal)}</dd>
      </div>
      <div>
        <dt>Tax (5%)</dt>
        <dd>{money(value.tax)}</dd>
      </div>
      <div>
        <dt>Delivery</dt>
        <dd>{value.delivery_fee ? money(value.delivery_fee) : "Free"}</dd>
      </div>
      <div className="total">
        <dt>Total</dt>
        <dd>{money(value.total)}</dd>
      </div>
    </dl>
  );
}

export function OrderItems({ order }) {
  return (
    <div className="order-items">
      {order.items.map((item) => (
        <div key={item.item_id}>
          <span>
            {item.quantity} × {item.name}
          </span>
          <strong>{money(item.unit_price * item.quantity)}</strong>
        </div>
      ))}
    </div>
  );
}

export function OrderHistory({ order }) {
  return (
    <ol className="history">
      {order.history.map((entry, index) => (
        <li key={index}>
          <span className="history-dot" />
          <div>
            <strong>{entry.status}</strong>
            <small>
              {time(entry.at)} · {entry.role}
            </small>
            {entry.note && <p>{entry.note}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function PageTitle({ eyebrow, title, children }) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
