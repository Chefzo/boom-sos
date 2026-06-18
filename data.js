/*
 * Boom SOS — Highlands data
 * BoomBozz Pizza & Watch Bar — 1448 Bardstown Rd
 *
 * This file is the single place to edit store-specific content.
 * Anything wrapped in [ ] is a placeholder that still needs real Highlands data.
 */

const STORE = {
  name: "Highlands",
  brand: "BoomBozz Pizza & Watch Bar",
  address: "1448 Bardstown Rd",
};

/* ------------------------------------------------------------------ */
/* Contacts + escalation                                              */
/* ------------------------------------------------------------------ */

const CONTACTS = {
  gm:   { role: "GM",              name: "[Add GM name]",   phone: "[Add cell]" },
  john: { role: "John",            name: "John",            phone: "[Add cell]" },
  judy: { role: "Judy",            name: "Judy",            phone: "[Add cell]" },
  enzo: { role: "Enzo",            name: "Enzo",            phone: "[Add cell]" },
  emergencyVendor: {
    role: "Emergency vendor",
    name: "[Add 24/7 vendor]",
    phone: "[Add after-hours line]",
  },
};

const ESCALATION = {
  ladder: [
    { who: "GM",   when: "First call for anything operational." },
    { who: "John", when: "If unresolved, or any same-day operational risk." },
    { who: "Judy", when: "If it crosses stores or has serious operational impact." },
    { who: "Enzo", when: "Real red-level issues only." },
  ],
  redLevel: [
    "Sales materially disrupted",
    "Walk-in / freezer product loss risk",
    "Repeated unapproved voids",
    "Power outage",
    "Fire / gas / safety issue",
    "Major internet / POS outage during service",
  ],
};

/* ------------------------------------------------------------------ */
/* Emergency cards + tap flows                                        */
/* ------------------------------------------------------------------ */

const EMERGENCY_CARDS = [
  {
    id: "walkin",
    icon: "❄️",
    title: "Walk-In / Cooler Down",
    flow: {
      title: "Walk-In Cooler Issue",
      immediate: [
        "Move highest-risk product to backup cold storage now",
        "Keep the door shut",
        "Confirm the actual temp reading",
        "Check breaker / power / obvious door-seal issue",
        "Take a photo of the display temp",
      ],
      riskCheck: [
        "If temp is above safe threshold and rising, escalate now",
        "If product is at risk, log affected inventory immediately",
      ],
      callNow: [
        "Primary refrigeration vendor",
        "Backup vendor",
        "GM",
        "John if not resolved in 15 minutes",
      ],
      questions: [
        { id: "unit", label: "Which unit?", type: "text" },
        { id: "temp", label: "Current temp?", type: "text" },
        { id: "atRisk", label: "Is product at risk?", type: "yesno" },
        { id: "vendorCalled", label: "Has vendor been called?", type: "yesno" },
        { id: "eta", label: "ETA received?", type: "text" },
      ],
      vendorCategory: "Refrigeration",
    },
  },
  {
    id: "freezer",
    icon: "🧊",
    title: "Freezer Problem",
    flow: {
      title: "Freezer Issue",
      immediate: [
        "Keep the door shut — do not open to 'check'",
        "Confirm the actual temp reading",
        "Check breaker / power / door-seal",
        "Move highest-risk product to backup freezer if available",
        "Take a photo of the display temp",
      ],
      riskCheck: [
        "Frozen product thaws fast once it climbs — escalate early",
        "If product is at risk, log affected inventory immediately",
      ],
      callNow: ["Primary refrigeration vendor", "Backup vendor", "GM", "John if not resolved in 15 minutes"],
      questions: [
        { id: "unit", label: "Which unit?", type: "text" },
        { id: "temp", label: "Current temp?", type: "text" },
        { id: "atRisk", label: "Is product at risk?", type: "yesno" },
        { id: "vendorCalled", label: "Has vendor been called?", type: "yesno" },
        { id: "eta", label: "ETA received?", type: "text" },
      ],
      vendorCategory: "Refrigeration",
    },
  },
  {
    id: "power",
    icon: "⚡",
    title: "Power Outage",
    flow: {
      title: "Power Outage",
      immediate: [
        "Keep all cooler and freezer doors shut",
        "Check if it's the building or the block (look outside / ask neighbors)",
        "Check the breaker panel for a tripped breaker",
        "Note the time power went out",
        "Stop cooking on anything that needs ventilation",
      ],
      riskCheck: [
        "Extended outage = product loss risk — start the cold-hold clock now",
        "If outage during service, this is red-level — escalate",
      ],
      callNow: ["Electrician (if breaker)", "Utility company (if block-wide)", "GM", "John"],
      questions: [
        { id: "scope", label: "Building only or block-wide?", type: "text" },
        { id: "outAt", label: "Time power went out?", type: "text" },
        { id: "duringService", label: "During service?", type: "yesno" },
        { id: "utilityCalled", label: "Utility/electrician called?", type: "yesno" },
      ],
      vendorCategory: "Electrical",
    },
  },
  {
    id: "internet",
    icon: "📶",
    title: "Internet / Toast Down",
    flow: {
      title: "Internet / Toast Outage",
      immediate: [
        "Confirm: is it internet, or just Toast?",
        "Reboot the modem/router (unplug 30 sec, plug back in)",
        "Switch Toast terminals to offline mode if available",
        "Keep taking orders on paper — do not stop service",
        "Note what stopped working and when",
      ],
      riskCheck: [
        "Card payments down during service = red-level, escalate",
        "Log it even if it comes back — recurring outages matter",
      ],
      callNow: ["Internet provider", "Toast support", "GM", "John if down during service"],
      questions: [
        { id: "what", label: "Internet or Toast?", type: "text" },
        { id: "duringService", label: "During service?", type: "yesno" },
        { id: "rebooted", label: "Rebooted modem?", type: "yesno" },
        { id: "supportCalled", label: "Support called?", type: "yesno" },
      ],
      vendorCategory: "Internet/POS",
    },
  },
  {
    id: "plumbing",
    icon: "🚰",
    title: "Plumbing Backup",
    flow: {
      title: "Plumbing Backup",
      immediate: [
        "Stop using the affected drain/fixture immediately",
        "Contain any standing water — block off the area",
        "Locate the shutoff if it's a leak",
        "Take a photo of the issue",
        "If it affects food-prep sanitation, pause that station",
      ],
      riskCheck: [
        "Sewage backup near food prep = health risk, escalate",
        "If it could close the store, call John now",
      ],
      callNow: ["Plumber", "GM", "John if it threatens service"],
      questions: [
        { id: "where", label: "Where is the backup?", type: "text" },
        { id: "foodPrep", label: "Near food prep?", type: "yesno" },
        { id: "plumberCalled", label: "Plumber called?", type: "yesno" },
        { id: "eta", label: "ETA received?", type: "text" },
      ],
      vendorCategory: "Plumbing",
    },
  },
  {
    id: "dishwasher",
    icon: "🍽️",
    title: "Dishwasher Down",
    flow: {
      title: "Dishwasher Down",
      immediate: [
        "Switch to the 3-compartment sink for manual wash/sanitize",
        "Check for a tripped breaker or no hot water",
        "Confirm chemical levels aren't just empty",
        "Pull enough clean ware to get through the rush",
      ],
      riskCheck: [
        "No way to sanitize ware = service risk — escalate if it can't be covered manually",
      ],
      callNow: ["Dishwasher/service vendor", "GM"],
      questions: [
        { id: "symptom", label: "What's it doing?", type: "text" },
        { id: "chemicals", label: "Chemical levels OK?", type: "yesno" },
        { id: "vendorCalled", label: "Service called?", type: "yesno" },
        { id: "eta", label: "ETA received?", type: "text" },
      ],
      vendorCategory: "Dishwasher/service",
    },
  },
  {
    id: "ice",
    icon: "🧊",
    title: "Ice Machine Down",
    flow: {
      title: "Ice Machine Down",
      immediate: [
        "Check power and the water supply line",
        "Clear any obvious clog or full bin sensor",
        "Source bagged ice as a backup if low",
        "Note whether it's not making ice or leaking",
      ],
      riskCheck: [
        "Leaking ice machine can become a slip hazard — contain water",
      ],
      callNow: ["Ice machine vendor", "GM"],
      questions: [
        { id: "symptom", label: "Not making ice or leaking?", type: "text" },
        { id: "backupIce", label: "Backup ice sourced?", type: "yesno" },
        { id: "vendorCalled", label: "Vendor called?", type: "yesno" },
        { id: "eta", label: "ETA received?", type: "text" },
      ],
      vendorCategory: "Ice machine",
    },
  },
  {
    id: "hvac",
    icon: "🌡️",
    title: "HVAC Problem",
    flow: {
      title: "HVAC Problem",
      immediate: [
        "Check the thermostat and breaker first",
        "Note whether it's heat, cooling, or no air at all",
        "If dining room is unusable, plan seating around it",
      ],
      riskCheck: [
        "Extreme temps affect guests and product — escalate if service is impacted",
      ],
      callNow: ["HVAC vendor", "GM"],
      questions: [
        { id: "symptom", label: "Heat, cooling, or no air?", type: "text" },
        { id: "diningImpact", label: "Dining room impacted?", type: "yesno" },
        { id: "vendorCalled", label: "Vendor called?", type: "yesno" },
        { id: "eta", label: "ETA received?", type: "text" },
      ],
      vendorCategory: "HVAC",
    },
  },
  {
    id: "gasfire",
    icon: "🔥",
    title: "Gas / Fire / Safety Issue",
    flow: {
      title: "Gas / Fire / Safety Issue",
      immediate: [
        "Life safety first — evacuate if there's any fire or strong gas smell",
        "Call 911 if there is any doubt",
        "Shut off gas at the main if safe to do so",
        "Do not flip switches or create sparks if you smell gas",
        "Account for all staff and guests",
      ],
      riskCheck: [
        "This is always red-level. Escalate the moment people are safe.",
      ],
      callNow: ["911 if needed", "Fire suppression vendor", "GM", "John", "Enzo (red-level)"],
      questions: [
        { id: "type", label: "Gas, fire, or other?", type: "text" },
        { id: "evacuated", label: "Building evacuated?", type: "yesno" },
        { id: "911called", label: "911 called?", type: "yesno" },
      ],
      vendorCategory: "Fire suppression",
    },
  },
  {
    id: "noshow",
    icon: "🧍",
    title: "Staff No-Show",
    flow: {
      title: "Staff No-Show",
      immediate: [
        "Confirm they're actually not coming (call/text them)",
        "Check the schedule for who else is available today",
        "Cover the most critical station first",
        "Decide if you need to call someone in",
      ],
      riskCheck: [
        "If you can't cover a critical station, escalate to GM before service suffers",
      ],
      callNow: ["Available staff", "GM"],
      questions: [
        { id: "who", label: "Who didn't show?", type: "text" },
        { id: "station", label: "Which station is short?", type: "text" },
        { id: "covered", label: "Coverage found?", type: "yesno" },
      ],
      vendorCategory: null,
    },
  },
  {
    id: "guest",
    icon: "🙋",
    title: "Guest Incident",
    flow: {
      title: "Guest Incident",
      immediate: [
        "Stay calm and listen — get the guest out of the dining flow",
        "Address the immediate need (safety, comfort, food)",
        "Do not admit fault or promise compensation you can't approve",
        "Get names and details while it's fresh",
        "Photograph anything relevant (spill, product, area)",
      ],
      riskCheck: [
        "Any injury or illness claim = escalate to GM/John and document fully",
      ],
      callNow: ["GM", "John if injury or serious complaint"],
      questions: [
        { id: "what", label: "What happened?", type: "text" },
        { id: "injury", label: "Any injury/illness?", type: "yesno" },
        { id: "guestInfo", label: "Guest name/contact?", type: "text" },
      ],
      vendorCategory: null,
    },
  },
];

/* ------------------------------------------------------------------ */
/* Vendor directory                                                   */
/* ------------------------------------------------------------------ */

const VENDOR_CATEGORIES = [
  "Refrigeration",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Fire suppression",
  "Pest control",
  "Ice machine",
  "Dishwasher/service",
  "Internet/POS",
  "Beverage/CO2",
  "Trash/grease",
  "Security/alarm",
  "Linen/uniform",
];

// One entry per category. Fill in real Highlands vendors.
const VENDORS = VENDOR_CATEGORIES.map((category) => ({
  category,
  approved: null, // true | false | null (unknown)
  primary: {
    name: "[Add primary vendor]",
    phone: "(xxx) xxx-xxxx",
    afterHours: "(xxx) xxx-xxxx",
    notes:
      category === "Refrigeration"
        ? "Mention Highlands walk-in. Ask for same-day ETA."
        : "[Add notes — what to mention, account #, etc.]",
  },
  backup: {
    name: "[Add backup vendor]",
    phone: "(xxx) xxx-xxxx",
  },
}));

/* ------------------------------------------------------------------ */
/* Manager playbooks                                                  */
/* ------------------------------------------------------------------ */

const PLAYBOOKS = [
  {
    id: "comp",
    title: "Guest comp / remake",
    firstMove: "Acknowledge the issue, apologize once, and fix the food fast.",
    doNot: "Don't argue, don't over-comp, don't comp the whole check out of habit.",
    approves: "[Add comp limits] — above that, GM approval required.",
    escalate: "Escalate to GM if the guest is still unhappy after a remake + reasonable comp.",
    log: "Log the comp/remake with the order #, amount, and reason.",
  },
  {
    id: "86",
    title: "Product 86 in Toast",
    firstMove: "86 the item in Toast immediately so it stops selling on all channels.",
    doNot: "Don't just tell servers verbally — it'll keep selling online.",
    approves: "MOD can 86; restocking/par decisions go to GM.",
    escalate: "Escalate if a core item will be 86'd through a full service.",
    log: "Log what was 86'd, why, and when it's expected back.",
  },
  {
    id: "callout",
    title: "Same-day staff callout",
    firstMove: "Confirm the callout, then check the schedule for coverage.",
    doNot: "Don't leave a critical station uncovered hoping it works out.",
    approves: "MOD can rearrange today's floor; overtime/calling-in goes to GM.",
    escalate: "Escalate to GM if you can't cover a critical station.",
    log: "Log who called out, the reason given, and how it was covered.",
  },
  {
    id: "mod",
    title: "Manager-on-duty escalation rules",
    firstMove: "You own the floor. Solve what you can at your level first.",
    doNot: "Don't sit on a same-day operational risk waiting to 'handle it yourself.'",
    approves: "See the Escalation tab for who approves what.",
    escalate: "GM first → John if unresolved/same-day risk → Judy if cross-store → Enzo for red-level.",
    log: "Log any incident you escalated and the outcome.",
  },
  {
    id: "refund",
    title: "Refund issue",
    firstMove: "Verify the original transaction before issuing anything.",
    doNot: "Don't issue cash refunds for card orders; don't refund without a record.",
    approves: "[Add refund limit] — above that needs GM approval.",
    escalate: "Escalate repeat refund requests or anything that smells like fraud.",
    log: "Log the refund with order #, amount, method, and reason.",
  },
  {
    id: "maint",
    title: "Maintenance approval rules",
    firstMove: "For emergencies, stabilize first (see the matching emergency card).",
    doNot: "Don't approve non-emergency spend over your limit without sign-off.",
    approves: "[Add emergency spend limit] for MOD; above that, GM/John approves.",
    escalate: "Escalate any repair likely to exceed the limit before authorizing it.",
    log: "Log the vendor, the issue, the quote, and who approved the spend.",
  },
  {
    id: "injury",
    title: "Minor injury response",
    firstMove: "Care for the person first. First-aid kit is [add location].",
    doNot: "Don't move someone who's seriously hurt; don't downplay it.",
    approves: "MOD handles minor first-aid; GM/John for anything beyond that.",
    escalate: "Call 911 for anything serious. Escalate all injuries to GM same day.",
    log: "Log who, what happened, what was done, and any witnesses.",
  },
  {
    id: "delivery",
    title: "Delivery app issue",
    firstMove: "Identify which app and whether it's orders-in or driver-side.",
    doNot: "Don't keep accepting orders you can't fulfill — pause the app if needed.",
    approves: "MOD can pause an app temporarily; GM for ongoing decisions.",
    escalate: "Escalate if an outage is costing real sales during peak.",
    log: "Log the app, the issue, the time window, and any refunds.",
  },
  {
    id: "catering",
    title: "Catering complaint",
    firstMove: "Get the full order details and what went wrong.",
    doNot: "Don't promise a redo or refund before checking with the GM.",
    approves: "Catering make-goods go to GM.",
    escalate: "Escalate any catering complaint to GM same day.",
    log: "Log the order, the complaint, and the resolution.",
  },
  {
    id: "opening",
    title: "Opening delay",
    firstMove: "Figure out what's blocking open and the realistic time you can.",
    doNot: "Don't open without the essentials (POS, safety, key stations) ready.",
    approves: "MOD manages the delay; notify GM if open will be materially late.",
    escalate: "Escalate if you can't open within a reasonable window.",
    log: "Log the cause of the delay and the actual open time.",
  },
  {
    id: "closing",
    title: "Closing issue",
    firstMove: "Secure cash, lock up, and make sure equipment is safe/off.",
    doNot: "Don't leave a known safety or security issue for the morning crew unflagged.",
    approves: "MOD handles standard close; cash discrepancies go to GM.",
    escalate: "Escalate any security issue or significant cash discrepancy.",
    log: "Log the issue, cash counts if relevant, and any follow-up needed.",
  },
];

/* ------------------------------------------------------------------ */
/* Ask Boom — rule-based concierge                                    */
/* Each entry returns the same tight 5-part shape.                    */
/* ------------------------------------------------------------------ */

const ASK_BOOM = [
  {
    keywords: ["walk-in", "walk in", "walkin", "cooler", "warm", "fridge"],
    prompt: "Walk-in is warm",
    answer: {
      now: [
        "Move highest-risk product to backup cold storage",
        "Keep the door shut and confirm the actual temp",
        "Check breaker, power, and door seal; photo the temp",
      ],
      call: ["Refrigeration vendor (primary, then backup)", "GM"],
      escalate: "John if not resolved in 15 minutes, or if temp is rising past safe.",
      log: "Walk-In card → unit, temp, product-at-risk, vendor + ETA.",
      playbook: "Maintenance approval rules",
    },
  },
  {
    keywords: ["plumb", "drain", "backup", "sewage", "toilet", "leak"],
    prompt: "Who handles plumbing?",
    answer: {
      now: [
        "Stop using the affected fixture/drain",
        "Contain standing water and block off the area",
        "Photo the issue; find the shutoff if it's a leak",
      ],
      call: ["Plumber (Plumbing in the vendor directory)", "GM"],
      escalate: "John if it's near food prep or threatens service.",
      log: "Plumbing Backup card → where, near food prep?, plumber + ETA.",
      playbook: "Maintenance approval rules",
    },
  },
  {
    keywords: ["comp", "remake", "refund order", "discount"],
    prompt: "Can I comp this order?",
    answer: {
      now: [
        "Apologize once and fix the food fast",
        "Stay within your comp limit",
      ],
      call: ["GM if it's above your limit or the guest is still upset"],
      escalate: "GM for anything beyond a standard remake + reasonable comp.",
      log: "Log the comp/remake: order #, amount, reason.",
      playbook: "Guest comp / remake",
    },
  },
  {
    keywords: ["internet", "wifi", "wi-fi", "toast", "pos", "down", "offline"],
    prompt: "Internet is out",
    answer: {
      now: [
        "Confirm internet vs. just Toast",
        "Reboot the modem (unplug 30 sec)",
        "Go to Toast offline mode / paper tickets — keep serving",
      ],
      call: ["Internet provider and/or Toast support", "GM"],
      escalate: "John if card payments are down during service (red-level).",
      log: "Internet/Toast card → what, during service?, support + ETA.",
      playbook: "Delivery app issue",
    },
  },
  {
    keywords: ["dishwasher", "dish", "ware", "sanitize"],
    prompt: "Dishwasher stopped mid-rush",
    answer: {
      now: [
        "Switch to the 3-compartment sink to wash/sanitize",
        "Check breaker, hot water, and chemical levels",
        "Pull clean ware to cover the rush",
      ],
      call: ["Dishwasher/service vendor", "GM"],
      escalate: "GM if ware can't be covered manually through service.",
      log: "Dishwasher card → symptom, chemicals OK?, vendor + ETA.",
      playbook: "Maintenance approval rules",
    },
  },
  {
    keywords: ["no-show", "no show", "noshow", "callout", "called out", "short staff", "staffing"],
    prompt: "Staff no-show, now what?",
    answer: {
      now: [
        "Confirm they're not coming",
        "Check the schedule for available coverage",
        "Cover the most critical station first",
      ],
      call: ["Available staff", "GM if you can't cover a critical station"],
      escalate: "GM before service suffers.",
      log: "Staff No-Show card → who, station short, coverage found?",
      playbook: "Same-day staff callout",
    },
  },
  {
    keywords: ["ice", "ice machine"],
    prompt: "Ice machine leaking",
    answer: {
      now: [
        "Contain the water — it's a slip hazard",
        "Check power and the water line",
        "Source bagged ice as backup",
      ],
      call: ["Ice machine vendor", "GM"],
      escalate: "GM if it can't be contained or you'll run out of ice.",
      log: "Ice Machine card → symptom, backup ice?, vendor + ETA.",
      playbook: "Maintenance approval rules",
    },
  },
];

// Generic fallback when nothing matches.
const ASK_BOOM_FALLBACK = {
  now: [
    "Stabilize the situation and keep people safe",
    "Check the matching emergency card above for step-by-step actions",
  ],
  call: ["GM"],
  escalate: "John if it's a same-day operational risk you can't resolve.",
  log: "Open the incident log and record what happened.",
  playbook: "Manager-on-duty escalation rules",
};
