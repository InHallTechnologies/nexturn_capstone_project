export default function Notice({ children, type = 'info' }) {
  if (!children) return null;
  return <p className={`notice notice-${type}`}>{children}</p>;
}
