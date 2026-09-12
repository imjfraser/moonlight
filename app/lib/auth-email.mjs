export function emailReady(env = process.env) { return !!env.RESEND_API_KEY; }
export async function sendLoginEmail({email,token,audience,lang="en",origin}, {env=process.env,fetchImpl=fetch}={}) {
  if (!emailReady(env)) throw new Error("email_unavailable");
  const from = env.MOONLIGHT_AUTH_FROM || "Luz de Luna <moonlight@pegasuscompanion.com>";
  if (/[\r\n]/.test(from)) throw new Error("email_unavailable");
  const url = origin + (audience === "admin" ? "/admin/login" : "/login") + "#token=" + encodeURIComponent(token);
  const es = lang === "es";
  const heading = es ? "Tu enlace para entrar a Luz de Luna" : "Your Luz de Luna sign-in link";
  const text = es
    ? "Este enlace caduca en 15 minutos y solo se puede usar una vez. Si no lo pediste, ignora este correo."
    : "This link expires in 15 minutes and can only be used once. If you did not request it, ignore this email.";
  const response = await fetchImpl("https://api.resend.com/emails",{
    method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({from,to:[email],subject:heading,html:`<h1>${heading}</h1><p><a href="${url}">${es?"Entrar":"Sign in"}</a></p><p>${text}</p>`,text:heading+"\n\n"+url+"\n\n"+text}),
    signal:AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("email_unavailable");
}
