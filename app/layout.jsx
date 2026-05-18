import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Luz de Luna — a business coach in your pocket",
  description:
    "Luz de Luna turns what you already know into real income — with a coach who's seen it work, and tools to build a digital business without writing code.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="top">
            <Link href="/" className="brand">
              <span className="moon" aria-hidden="true" />
              <span>Luz de Luna</span>
            </Link>
            <div className="links">
              <Link href="/start">Start</Link>
              <Link href="/architect">Coach</Link>
              <Link href="/me">My page</Link>
              <Link href="/funding">Funding</Link>
            </div>
          </nav>
          {children}
          <footer>
            <div className="muted">
              Luz de Luna — a small, private business coach. Your answers stay in your browser
              unless you choose to share them.
            </div>
            <div style={{ marginTop: 8 }}>
              <span className="muted">&copy; Luz de Luna</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
