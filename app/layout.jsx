import "./globals.css";
import ShellNav from "./components/ShellNav";
import ShellFooter from "./components/ShellFooter";

export const metadata = {
  title: "Luz de Luna — un coach de negocios en tu bolsillo",
  description:
    "Luz de Luna helps people turn what they already know into real income — with a coach and tools that build a digital business without code.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <ShellNav />
          {children}
          <ShellFooter />
        </div>
      </body>
    </html>
  );
}
