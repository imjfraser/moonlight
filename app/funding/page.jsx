export default function Funding() {
  return (
    <>
      <span className="pill">Internal — for funders &amp; partners</span>
      <h1>Moonlight: a protective digital opportunity system.</h1>
      <p className="muted" style={{ fontSize: 17 }}>
        Moonlight helps people who are vulnerable to sexual, economic, and trafficking
        exploitation build safer digital income pathways — with an AI business coach
        and a builder agent that turns intent into real assets.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>The problem</h2>
        <p>
          People most vulnerable to exploitation often lack safe economic alternatives.
          Job markets are scarce. Capital is out of reach. Traditional business training
          is too long, too abstract, and too expensive. Online platforms expose participants
          to new risks without offering protection.
        </p>
        <p className="muted">
          The result: many participants either remain in exploitative situations,
          or take on risky online work without safeguards.
        </p>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Our proposed solution</h2>
        <p>
          Moonlight pairs <strong>zero-capital entrepreneurship coaching</strong> with an
          <strong> AI architect / builder workflow</strong>. A participant talks to a simple
          coach in their pocket. The coach helps them imagine and choose a small, realistic
          business. A builder agent then generates the first assets: a name, a description,
          a price, a customer message, a simple website draft, and a 5-step action plan.
        </p>
        <p>
          The methodology is inspired by action-first programs such as Rebel Business School:
          start with what you already have, sell before building, mindset and behaviour over
          theory and capital.
        </p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>The MVP demonstrates</h3>
          <ul className="clean">
            <li>An intake flow that respects a low-experience user</li>
            <li>An architect agent that listens, reflects, and suggests</li>
            <li>An operator brief — the architect/operator handoff made visible</li>
            <li>A generated business kit (names, copy, pricing, posts)</li>
            <li>A simple generated website preview with privacy controls</li>
          </ul>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Target users</h3>
          <ul className="clean">
            <li>Women and girls vulnerable to sexual or economic exploitation</li>
            <li>People in unsafe job markets or extractive industries</li>
            <li>Survivors rebuilding after exploitation</li>
            <li>Eventually: men and boys facing analogous vulnerabilities</li>
          </ul>
          <p className="muted" style={{ fontSize: 13 }}>
            Deployment would be partner-led, not direct-to-participant.
          </p>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Partner model</h3>
        <p>
          Moonlight works <strong>with</strong> partners on the ground — survivor-led
          organisations, training partners, NGOs, and entrepreneurship programs.
          Partners hold the participant relationship; Moonlight provides the AI coach,
          builder workflow, and digital business toolkit. Methodology partners (e.g.
          Rebel Business School–style programs) inform the coaching content.
        </p>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Safeguarding considerations</h3>
        <ul className="clean">
          <li>Trauma-informed UX, written and reviewed with survivors</li>
          <li>Privacy and anonymity controls — public/private toggles, no real-name default</li>
          <li>Safe contact patterns (WhatsApp/messages, no public address/phone)</li>
          <li>Human escalation pathways inside partner organisations</li>
          <li>Anti-abuse and content controls on user-generated material</li>
          <li>Special-care handling for minors; clear age-gating</li>
          <li>Consent and data minimisation by default</li>
          <li>Market-safety review before listing certain offer types</li>
        </ul>
        <p className="muted" style={{ fontSize: 13 }}>
          The current prototype is internal only. None of the above is yet in place.
        </p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>What a pilot would learn</h3>
          <ul className="clean">
            <li>Can a guided AI coach help participants identify realistic income options?</li>
            <li>Does the architect → operator pattern hold for low-experience users?</li>
            <li>What safeguarding controls are most important in practice?</li>
            <li>Which partner workflows make integration realistic at scale?</li>
            <li>What conversion rate from intake → first sale is achievable?</li>
          </ul>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>What funding would support</h3>
          <ul className="clean">
            <li>Partner-led pilots in 2–3 contexts</li>
            <li>Trauma-informed UX and safeguarding research</li>
            <li>Real AI agent integration (real coach, real builder)</li>
            <li>Methodology partnership and content licensing</li>
            <li>Privacy and safety engineering</li>
            <li>Localisation and low-bandwidth performance</li>
          </ul>
        </div>
      </div>

      <div className="card warm">
        <h3 style={{ marginTop: 0 }}>One-liner</h3>
        <p style={{ marginBottom: 0 }}>
          Moonlight helps vulnerable people build safer digital income pathways with an AI
          business coach and simple online tools — partner-led, trauma-informed, and
          designed for action over theory.
        </p>
      </div>

      <div className="safety" style={{ marginTop: 18 }}>
        This page is internal. Do not share externally without review. Numbers and case
        studies referenced as illustrative are inspired by published material (e.g. Rebel
        Business School public reports) and must be properly attributed in any external
        document.
      </div>
    </>
  );
}
