import { Link } from "react-router-dom";
import "../../styles/auth-simple.css";

function BillYourTimeMark() {
  return <span className="auth-reference-mark">BYT</span>;
}

function AuthBrand({ className = "" }) {
  return (
    <Link
      to="/"
      className={`auth-reference-brand ${className}`.trim()}
      aria-label="Go to BillYourTime home"
    >
      <BillYourTimeMark />
      <span>BillYourTime</span>
    </Link>
  );
}

function ShowcasePanel() {
  return (
    <section className="auth-reference-showcase" aria-label="BillYourTime introduction">
      <AuthBrand className="auth-reference-showcase-brand" />

      <div className="auth-reference-showcase-copy">
        <span className="auth-reference-kicker">BILLYOURTIME STUDIO</span>
        <h2>
          Run the work.
          <br />
          Keep the receipts.
        </h2>
        <p>
          A straightforward workspace for briefs, hours, invoices, and the
          people behind the work.
        </p>
      </div>

      <div className="auth-reference-showcase-footer">
        <span>BUILT FOR SMALL, SERIOUS TEAMS</span>
        <span>© 2026 BILLYOURTIME</span>
      </div>
    </section>
  );
}

export default function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}) {
  return (
    <main className="auth-reference">
      <ShowcasePanel />

      <section className="auth-reference-panel">
        <div className="auth-reference-panel-inner">
          <div className="auth-reference-heading">
            <span className="auth-reference-eyebrow">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          {children}

          <div className="auth-reference-footer">{footer}</div>
        </div>
      </section>
    </main>
  );
}
