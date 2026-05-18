// Deterministic, content-rich mock "agents" — no LLM call required.
// The architect generates plausible micro-business ideas based on intake.
// The operator generates a business kit + website preview from a chosen idea.
// All outputs are illustrative for prototype/demo purposes only.

const SKILL_TO_IDEAS = [
  {
    match: /(hair|braid|salon|nail|makeup|beauty|cosmet)/i,
    ideas: [
      {
        title: "At-home beauty service for neighbours",
        why: "You already do this for people. Charging a small fee for what you do well is a fast way to start.",
        firstSale: "Offer your next 3 appointments at a friendly intro price. Post one photo of your work in a WhatsApp status.",
        risk: "low",
      },
      {
        title: "Short tutorial videos (10–30 seconds)",
        why: "Quick demos build trust. People in your area can find you, message you, and book.",
        firstSale: "Film 3 short clips of one technique. Share to a status, ask viewers to message you to book.",
        risk: "low",
      },
    ],
  },
  {
    match: /(cook|bake|food|recipe|kitchen|meal)/i,
    ideas: [
      {
        title: "Pre-ordered home meals (one dish, fixed days)",
        why: "One dish keeps cost and stress low. Pre-orders mean you only cook what is paid for.",
        firstSale: "Pick one dish you cook well. Open orders for one day. Take 5 orders before you shop.",
        risk: "low",
      },
      {
        title: "Small celebration cakes / treats on order",
        why: "Birthdays and small celebrations happen every week. Word travels fast.",
        firstSale: "Make one example. Photograph it. Post to a WhatsApp status. Offer 3 orders this month.",
        risk: "medium",
      },
    ],
  },
  {
    match: /(sew|tailor|cloth|fabric|fashion|stitch)/i,
    ideas: [
      {
        title: "Alterations and small repairs from home",
        why: "Most people need clothing fixed and will pay quickly for a same-week turnaround.",
        firstSale: "Offer 5 free pickups to neighbours. Charge for the fix. Word-of-mouth builds from there.",
        risk: "low",
      },
      {
        title: "Made-to-order accessories (bags, headwraps)",
        why: "Small accessories are low-cost to make and easy to photograph and sell online.",
        firstSale: "Make 3 samples. Photograph them on a plain background. Post and ask for orders.",
        risk: "low",
      },
    ],
  },
  {
    match: /(teach|tutor|kid|child|student|school|english|math|read)/i,
    ideas: [
      {
        title: "Small after-school help group",
        why: "Parents will pay a little for trusted, calm help with homework or reading.",
        firstSale: "Offer one free trial group. Charge weekly for the next group of 4–6 students.",
        risk: "low",
      },
      {
        title: "Voice notes for adult learners (phone-friendly)",
        why: "Many adults want to learn but cannot attend a class. Voice notes are simple and respectful.",
        firstSale: "Offer 1 free voice lesson on WhatsApp. Ask interested adults to pay for a 4-week pack.",
        risk: "low",
      },
    ],
  },
  {
    match: /(garden|plant|farm|grow|seed|herb)/i,
    ideas: [
      {
        title: "Herb / seedling box for neighbours",
        why: "Starter boxes are easy to make, easy to deliver, and easy to repeat.",
        firstSale: "Grow 10 starter boxes. Offer them to neighbours at a small price. Take pre-orders for next batch.",
        risk: "low",
      },
    ],
  },
  {
    match: /(clean|wash|laundry|tidy|organi[sz]e)/i,
    ideas: [
      {
        title: "Weekly cleaning route (3–5 homes)",
        why: "Reliable weekly cleaning is one of the fastest small businesses to fill — and trust grows quickly.",
        firstSale: "Offer your first 3 clients a discounted first visit. Lock in a weekly slot.",
        risk: "low",
      },
    ],
  },
  {
    match: /(write|story|poem|word|edit|translat)/i,
    ideas: [
      {
        title: "Writing small things for local businesses",
        why: "Shops, stallholders, and church groups often need short captions, posts, and flyers and will pay a small fee.",
        firstSale: "Offer 3 free pieces. Show the work. Charge from the 4th piece onwards.",
        risk: "low",
      },
    ],
  },
];

const FALLBACK_IDEAS = [
  {
    title: "Helper-for-hire (errands, queueing, light tasks)",
    why: "If you have time and energy, neighbours will pay for small tasks: queueing, shopping, deliveries.",
    firstSale: "Offer 3 free hours to one trusted neighbour. Then a small price after that.",
    risk: "low",
  },
  {
    title: "WhatsApp reseller (one product, repeat customers)",
    why: "Pick one thing you can buy a few of cheaply and resell at a small markup. Sell only what is paid for.",
    firstSale: "Take 5 pre-orders by WhatsApp before buying any stock.",
    risk: "low",
  },
  {
    title: "Mini event/celebration helper",
    why: "Families need someone reliable to help with small parties: setup, cleanup, hosting.",
    firstSale: "Offer help at one event for free. Ask for a review. Charge from the next event.",
    risk: "medium",
  },
];

export function generateIdeas(intake) {
  const text = `${intake.skills || ""} ${intake.askedFor || ""}`.toLowerCase();
  const picked = [];
  for (const bucket of SKILL_TO_IDEAS) {
    if (bucket.match.test(text)) picked.push(...bucket.ideas);
  }
  if (picked.length < 2) {
    picked.push(...FALLBACK_IDEAS);
  }
  // De-dup and cap at 4
  const seen = new Set();
  const out = [];
  for (const i of picked) {
    if (seen.has(i.title)) continue;
    seen.add(i.title);
    out.push(i);
    if (out.length >= 4) break;
  }
  // Architect's recommended pick — first low-risk idea
  const recommended = out.find((i) => i.risk === "low") || out[0];
  return { ideas: out, recommended };
}

export function generateBrief(intake, idea) {
  const targetCustomer = guessTargetCustomer(idea.title, intake);
  return {
    businessIdea: idea.title,
    why: idea.why,
    targetCustomer,
    offer: idea.title,
    firstProductOrService:
      idea.firstSale || "Offer a small first version of the service to 3 trusted people.",
    tone: "warm, clear, confident, no jargon",
    privacyConstraints: intake.showRealName
      ? "Real name allowed — still keep address private."
      : "Hide real name. Use first name only. Hide address. Hide phone unless customer asks.",
    websiteSections: [
      "Hero (business name + what you do in one line)",
      "About (1 short paragraph)",
      "Services / products (3 items max)",
      "How to order (WhatsApp / message)",
      "Privacy note (what is and isn't shared)",
    ],
    assetsToGenerate: [
      "3 business name ideas",
      "Business description (1 paragraph)",
      "Offer description",
      "Starter pricing suggestion",
      "First customer message",
      "WhatsApp / social post",
      "Landing page copy",
      "Checklist of next 5 actions",
    ],
    nextFiveActions: [
      "Choose your business name (out of 3 suggestions).",
      "Send the first customer message to 5 people you trust.",
      "Take 3 small photos that show your work.",
      "Post your first WhatsApp status or social post.",
      "Take your first 3 orders before you spend any money.",
    ],
  };
}

function guessTargetCustomer(title, intake) {
  const t = title.toLowerCase();
  if (t.includes("neighbour") || t.includes("home")) return "Neighbours within walking or short-trip distance who want a trusted, friendly service.";
  if (t.includes("after-school") || t.includes("learner")) return "Parents and adult learners in your area who want calm, kind help and quick results.";
  if (t.includes("whatsapp reseller")) return "Friends, family and contacts who already buy this kind of product but want a more reliable seller.";
  if (t.includes("event") || t.includes("celebration")) return "Families and small groups who plan small events and need a kind, dependable helper.";
  return "People close to you who already trust you and need this kind of help.";
}

export function generateKit(intake, idea, brief) {
  const first = (intake.publicName || intake.name || "You").trim();
  const safeName = intake.showRealName ? first : (first.split(" ")[0] || "Moonlight");

  const baseNames = nameIdeasFor(idea.title, safeName);
  return {
    nameIdeas: baseNames,
    suggestedName: baseNames[0],
    description: `${baseNames[0]} is a small, local ${ideaCategory(idea.title)} from ${safeName}. We focus on doing one thing well — with care, kindness, and quick replies. Orders are taken by WhatsApp and we only make or do what is asked for.`,
    offer: brief.offer,
    pricing: {
      startingPrice: "Starter price: low and easy to say yes to. Pick a small price you would not mind charging a friend.",
      examples: priceExamplesFor(idea.title),
      note: "Raise prices after your first 5 paying customers — never before.",
    },
    firstCustomerMessage:
      `Hi! It's ${safeName}. I'm starting something small — ${idea.title.toLowerCase()}. ` +
      `Would you like to be one of my first customers? It would mean a lot. ` +
      `Reply here and I'll send you the details. 🌙`,
    socialPost:
      `New from ${baseNames[0]} 🌙\n\n${idea.title} — small, careful, and right here in our area.\n\n` +
      `Send me a message to be one of my first customers. Slots are small so I can do a good job for each person.`,
    landingCopy: {
      heroTitle: baseNames[0],
      heroSubtitle: `${idea.title} — made with care.`,
      aboutShort: `I'm ${safeName}. I'm starting something small. I take one order at a time and reply quickly. Message me to ask anything.`,
      services: serviceItemsFor(idea.title),
      ctaText: "Message on WhatsApp",
    },
    nextFiveActions: brief.nextFiveActions,
  };
}

function ideaCategory(title) {
  const t = title.toLowerCase();
  if (t.includes("beauty") || t.includes("hair")) return "beauty service";
  if (t.includes("meal") || t.includes("cake")) return "home kitchen";
  if (t.includes("seedling") || t.includes("herb")) return "garden project";
  if (t.includes("alteration") || t.includes("accessor")) return "sewing studio";
  if (t.includes("after-school") || t.includes("voice notes")) return "learning circle";
  if (t.includes("clean")) return "home cleaning round";
  if (t.includes("event")) return "event helper";
  if (t.includes("reseller")) return "WhatsApp shop";
  if (t.includes("writing")) return "writing service";
  return "small business";
}

function nameIdeasFor(title, person) {
  const cat = ideaCategory(title);
  const first = person.split(" ")[0] || "Moonlight";
  return [
    `${first}'s ${capitalise(cat)}`,
    `Little Moon ${capitalise(cat)}`,
    `The Kind ${capitalise(cat)}`,
  ];
}

function capitalise(s) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function priceExamplesFor(title) {
  const t = title.toLowerCase();
  if (t.includes("meal")) return ["Small dish — friend price", "Family portion — 2× small price", "Add-on side — half of small price"];
  if (t.includes("clean")) return ["First visit — half price", "Weekly slot — standard", "Deep clean — 2× weekly"];
  if (t.includes("beauty") || t.includes("hair")) return ["Touch-up — small price", "Full service — 2× touch-up", "Bridal / event — by quote"];
  if (t.includes("reseller")) return ["Single item — small markup over cost", "Bundle of 3 — small discount", "Bulk by request — by quote"];
  if (t.includes("tutor") || t.includes("voice")) return ["1 session — small price", "4-pack — pay for 3", "Group of 4 — split the cost"];
  return ["First customers — friendly intro price", "Regulars — standard price", "Special requests — by quote"];
}

function serviceItemsFor(title) {
  const t = title.toLowerCase();
  if (t.includes("meal")) return ["Dish of the week (pre-order)", "Family pack", "Special request — by message"];
  if (t.includes("clean")) return ["Weekly visit (most popular)", "One-off help before guests", "Deep clean — by request"];
  if (t.includes("beauty") || t.includes("hair")) return ["Touch-up appointment", "Full service", "Bridal / event service"];
  if (t.includes("reseller")) return ["Today's product (in stock)", "Order ahead (pre-pay)", "Custom request"];
  if (t.includes("seedling")) return ["Starter herb box", "Mini garden bundle", "Custom plant choice"];
  if (t.includes("tutor") || t.includes("voice")) return ["1:1 session", "4-week pack", "Small group (4 students)"];
  if (t.includes("event")) return ["Setup help", "Hosting help", "Cleanup help"];
  return ["Most popular service", "Quick option", "Custom request"];
}
