import { Link } from "react-router-dom";
import "../styles/home.css";

function HomeBrand() {
  return (
    <Link to="/" className="home-brand" aria-label="Go to BillYourTime home">
      <span className="home-brand-mark">BYT</span>
      <span className="home-brand-name">
        BillYourTime
        <small>FREELANCE OS</small>
      </span>
    </Link>
  );
}

const steps = [
  {
    number: "01",
    title: "Set the brief",
    text: "Share the need, context, and rate before work begins.",
  },
  {
    number: "02",
    title: "Move the work",
    text: "Track time, review submissions, and keep the project current.",
  },
  {
    number: "03",
    title: "Close the loop",
    text: "Send the invoice, record payment, and keep the history together.",
  },
];

const previewRows = [
  { color: "violet", title: "Brand refresh", status: "In review", progress: "82%" },
  { color: "gold", title: "Launch campaign", status: "In progress", progress: "56%" },
  { color: "blue", title: "Website copy", status: "Paid", progress: "100%" },
];

function WorkflowPreview() {
  return (
    <div className="home-preview" aria-label="BillYourTime workflow preview">
      <div className="home-preview-header">
        <div>
          <span className="home-preview-label">WORKSPACE OVERVIEW</span>
          <strong>This week</strong>
        </div>
        <span className="home-preview-status">ON TRACK</span>
      </div>

      <div className="home-preview-summary">
        <span>ACTIVE PROJECTS</span>
        <strong>04</strong>
        <p>Everything you need for the next handoff, in one place.</p>
      </div>

      <div className="home-preview-list">
        {previewRows.map((row) => (
          <div className="home-preview-row" key={row.title}>
            <span className={`home-preview-dot home-preview-dot-${row.color}`} />
            <div>
              <strong>{row.title}</strong>
              <span>{row.status}</span>
            </div>
            <b>{row.progress}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="home-page">
      <header className="home-nav">
        <HomeBrand />

        <nav aria-label="Account navigation">
          <Link to="/login" className="home-signin">
            Sign in
          </Link>
          <Link to="/register" className="home-nav-cta">
            Register
          </Link>
        </nav>
      </header>

      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-eyebrow">BILLYOURTIME / FREELANCE OPERATIONS</span>
          <h1>
            Good work.
            <br />
            <i>Clear records.</i>
          </h1>
          <p>
            BillYourTime brings briefs, projects, time, reviews, invoices, and
            payments into one easy-to-follow workspace.
          </p>
        </div>

        <WorkflowPreview />
      </section>

      <section className="home-strip" aria-label="BillYourTime workflow">
        <span>ONE SHARED VIEW</span>
        <strong>Brief → work → review → payment</strong>
        <span>INR READY</span>
      </section>

      <section className="home-steps">
        <div className="steps-heading">
          <span className="home-eyebrow">HOW BILLYOURTIME FITS</span>
          <h2>
            Less searching.
            <br />
            <i>More finishing.</i>
          </h2>
        </div>

        <div className="steps-list">
          {steps.map((step) => (
            <article key={step.number}>
              <span className="step-number">{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
              <span className="step-arrow" aria-hidden="true">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="home-quote">
        <span className="home-eyebrow">MADE FOR THE DETAILS THAT MATTER</span>
        <blockquote>
          “The work is easier to trust when every next step is visible.”
        </blockquote>
        <div>
          <span>CLIENTS</span>
          <span>FREELANCERS</span>
          <span>SMALL TEAMS</span>
        </div>
      </section>

    </main>
  );
}
