import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Moonlight — a coach in your pocket",
  description:
    "Moonlight helps people turn skills, ideas, and lived experience into safer digital income opportunities — with a business coach and builder by their side.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="top">
            <Link href="/" className="brand">
              <span className="moon" aria-hidden="true" />
              <span>Moonlight</span>
              <span className="pill muted" style={{ marginLeft: 8 }}>Internal prototype</span>
            </Link>
            <div className="links">
              <Link href="/start">Start a session</Link>
              <Link href="/architect">Architect</Link>
              <Link href="/brief">Brief</Link>
              <Link href="/kit">Business kit</Link>
              <Link href="/preview">Site preview</Link>
              <Link href="/funding">Funding</Link>
            </div>
          </nav>
          {children}
          <footer>
            <div>
              Moonlight is an internal exploratory prototype. Not for live participant use.
              Production versions require safeguarding review, partner-led implementation,
              trauma-informed UX, privacy controls, and human escalation pathways.
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="pill warn">Prototype only</span>{" "}
              <span className="muted">&copy; Moonlight project — Bucket 3</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
