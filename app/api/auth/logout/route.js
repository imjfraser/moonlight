import { authHandlers } from "../../../lib/auth-handlers.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = authHandlers("user").logout;
