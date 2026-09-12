import { redirect } from "next/navigation";
import { requireUser, AuthError } from "../lib/auth.mjs";
import AccountBar from "./AccountBar";
export default async function PrivateLayout({ children }) {
  let account;
  try { account = await requireUser(); }
  catch (error) { if (error instanceof AuthError) redirect("/login"); throw error; }
  return <><AccountBar email={account.email} />{children}</>;
}
