import test from "node:test";
import assert from "node:assert/strict";
import { buildCoachMessages } from "../app/lib/coach-context.mjs";
const offer = { name: "Old offer", tagline: "Old tagline", description: "Old description",
  priceUSD: 25, priceLocal: "USD 25", deliveryWindow: "Friday", firstCustomer: "Ana", scalingPath: "Old scaling" };
test("new journey kickoff does not reintroduce stale saved active-plan artifacts", () => {
  const memory = { coachState: "done", proposedOffer: offer, draftedMessage: "Old customer message", shopHandle: "old-shop" };
  const before = structuredClone(memory);
  const messages = buildCoachMessages({ intake: { name: "Test", skills: "New skill" }, messages: [], lang: "en" }, memory);
  assert.ok(messages[0].content.includes("New skill"));
  for (const old of ["Old offer", "Old customer message", "old-shop"]) assert.ok(!messages[0].content.includes(old));
  assert.deepEqual(memory, before);
});
test("continuing a saved conversation retains canonical active-plan memory", () => {
  const messages = buildCoachMessages({ intake: { name: "Test" }, messages: [{ role: "user", content: "Continue" }], lang: "en" }, { coachState: "done", proposedOffer: offer, shopHandle: "old-shop" });
  assert.ok(messages[0].content.includes("Old offer"));
  assert.ok(messages[0].content.includes("old-shop"));
});
