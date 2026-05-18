import Link from "next/link";

export default function Home() {
  return (
    <>
      <span className="pill">A coach in your pocket</span>
      <h1>Turn what you already know into real income — with a coach who&apos;s seen it work.</h1>
      <p className="muted" style={{ fontSize: 17, maxWidth: 640 }}>
        Moonlight is a business coach in your pocket. You bring your skill,
        your time, and what you already know. Sol helps you turn it into a real
        business that pays — using the new tools that let one person do what used
        to take a team.
      </p>

      <div className="row">
        <Link href="/start" className="btn">Start a session →</Link>
        <Link href="/funding" className="btn ghost">For partners &amp; funders</Link>
      </div>

      <div className="grid-2" style={{ marginTop: 22 }}>
        <div className="card">
          <h3>How it works</h3>
          <p className="muted">
            Sol — your coach — asks you a few simple questions, listens, and
            helps you choose your first move this week. You walk away with one
            specific customer to message, a price, and a page you can share.
          </p>
        </div>
        <div className="card">
          <h3>What you can build</h3>
          <p className="muted">
            A small business with online customers. A digital product you build
            once and sell many times. A platform that connects others. Whatever
            fits — the tools are here now, and you don&apos;t need to code.
          </p>
        </div>
        <div className="card">
          <h3>You decide what&apos;s shared</h3>
          <p className="muted">
            Your real name, your address, your photo — none of it is shared
            unless you say so. You control what your customers see.
          </p>
        </div>
        <div className="card">
          <h3>Aimed high, on purpose</h3>
          <p className="muted">
            The goal isn&apos;t a side hustle that buys groceries. It&apos;s a
            real income — the kind that pays the rent and then some. Sol plans
            with that target in mind from the first conversation.
          </p>
        </div>
      </div>

      <div className="card warm" style={{ marginTop: 22 }}>
        <span className="pill">First step</span>
        <h3 style={{ marginTop: 8 }}>Spend 10 minutes with Sol</h3>
        <p className="muted">
          By the end of one short conversation you&apos;ll have a specific person
          to message today, an offer with a price, and a page to share. No
          jargon. No business plan. Just a first move.
        </p>
        <div className="row">
          <Link href="/start" className="btn">Start →</Link>
          <Link href="/preview" className="btn ghost">See a sample page</Link>
        </div>
      </div>
    </>
  );
}
