export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <span className="kicker">{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}

export function Panel({ children, className = "" }) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function StatusChip({ children, tone = "neutral" }) {
  return <span className={`status-chip ${tone}`}>{children}</span>;
}
export function EmptyState({ title, text, action }) {
  return (
    <div className="empty-state">
      <span className="empty-mark">+</span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  );
}
export function LoadingState() {
  return (
    <div className="loading-state">
      <span className="loader" />
      Loading data…
    </div>
  );
}
