"use client";

// Runs once on app load: pulls the participant's durable state and shops from
// the server into the local cache so a returning participant resumes where she
// left off. Renders nothing.

import { useEffect } from "react";
import { hydrateSession } from "../lib/session";
import { hydrateShops } from "../lib/shop-store";

export default function Boot() {
  useEffect(() => {
    hydrateSession();
    hydrateShops();
  }, []);
  return null;
}
