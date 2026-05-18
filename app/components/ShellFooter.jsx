"use client";

import { useT } from "../lib/i18n";

export default function ShellFooter() {
  const t = useT();
  return (
    <footer>
      <div className="muted">{t("footer.body")}</div>
      <div style={{ marginTop: 8 }}>
        <span className="muted">{t("footer.copyright")}</span>
      </div>
    </footer>
  );
}
