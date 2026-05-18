import Link from "next/link";

export default function Home() {
  return (
    <>
      <span className="pill">A coach in your pocket</span>
      <h1>Build something small. Start with what you already have.</h1>
      <p className="muted" style={{ fontSize: 17, maxWidth: 640 }}>
        Moonlight helps people turn skills, ideas, and lived experience into safer
        digital income opportunities — with a business coach and a builder by your side.
      </p>

      <div className="row">
        <Link href="/start" className="btn">Start a business-building session →</Link>
        <Link href="/funding" className="btn ghost">For partners &amp; funders</Link>
      </div>

      <div className="grid-2" style={{ marginTop: 22 }}>
        <div className="card">
          <h3>What Moonlight is</h3>
          <p className="muted">
            A guided journey from a vague idea to a small, real digital business —
            in your language, at your pace, with a coach who helps you imagine,
            decide, and act.
          </p>
        </div>
        <div className="card">
          <h3>Who it&apos;s for</h3>
          <p className="muted">
            People who are vulnerable to exploitation and want safer income options.
            Today: women and girls first. Tomorrow: anyone facing similar pressures.
          </p>
        </div>
        <div className="card">
          <h3>What it helps with</h3>
          <ul className="clean muted">
            <li>Imagining small businesses you could actually run</li>
            <li>Clarifying what you can offer right now</li>
            <li>Building a simple online presence — safely</li>
            <li>Learning to sell from day one, with no capital required</li>
            <li>Practical next steps you can do this week</li>
          </ul>
        </div>
        <div className="card">
          <h3>How it works</h3>
          <p className="muted">
            Two helpers work together: an <strong>architect</strong> who listens
            and plans with you, and a <strong>builder</strong> who turns the plan
            into real things — names, pages, messages, posts, and a website draft.
          </p>
        </div>
      </div>

      <div className="card warm" style={{ marginTop: 22 }}>
        <span className="pill">Internal MVP</span>
        <h3 style={{ marginTop: 8 }}>What this prototype is testing</h3>
        <p className="muted">
          Can a guided AI coach and a builder workflow help people identify
          realistic income opportunities and create their first digital business
          assets — safely, simply, and with partner support? This prototype is
          our first attempt to make that experience feel real.
        </p>
        <div className="row">
          <Link href="/start" className="btn">Try the journey</Link>
          <Link href="/preview" className="btn ghost">Skip ahead: see a generated site</Link>
        </div>
      </div>

      <div className="safety" style={{ marginTop: 18 }}>
        <strong>Safeguarding note.</strong> This is an internal exploratory prototype.
        It is <em>not</em> ready for real vulnerable users. Production versions would
        require safeguarding review, partner-led delivery, trauma-informed UX,
        privacy and anonymity controls, anti-abuse controls, careful handling of
        minors, and clear human escalation pathways.
      </div>
    </>
  );
}
