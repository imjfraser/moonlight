"use client";
import { useState } from "react";
import { useLang } from "../lib/i18n";
export default function AccountBar({ email }) {
  const es = useLang() === "es";
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState(false);
  async function logout() {
    setBusy(true);setError(false);
    try {
      const response=await fetch("/api/auth/logout",{method:"POST"});
      if(!response.ok)throw new Error("logout_failed");
      window.location.assign("/login");
    } catch {setError(true);setBusy(false);}
  }
  return <div className="card tight" style={{marginBottom:12}}>
    <div className="row" style={{justifyContent:"space-between",overflowWrap:"anywhere"}}>
      <a href="/account" aria-label={es?"Tu cuenta y memoria privada":"Your account and private memory"}>{email}</a><button type="button" className="btn ghost small" disabled={busy} onClick={logout}>{es?"Cerrar sesión":"Sign out"}</button>
    </div>
    {error&&<p role="alert">{es?"No se pudo cerrar la sesión. Inténtalo de nuevo.":"Could not sign out. Try again."}</p>}
  </div>;
}
