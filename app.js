/* Boom SOS - Highlands  | app logic */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const el = (tag, cls, html) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  const esc = (s) =>
    String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  // A phone is "real" only if it has digits and isn't a placeholder.
  const realPhone = (p) => p && /\d/.test(p) && !/x{3}|\[/.test(p);
  const telHref = (p) => "tel:" + String(p).replace(/[^\d+]/g, "");

  /* ---------------- Header ---------------- */
  $("#storeTag").textContent = STORE.name;
  $("#headerSub").textContent = `${STORE.brand} · ${STORE.address}`;

  function callOrCopy(label, phone) {
    if (realPhone(phone)) {
      window.location.href = telHref(phone);
    } else {
      toast(`${label}: number not set yet - add it in data.js`);
    }
  }
  function smsOrCopy(label, phone, body) {
    if (realPhone(phone)) {
      window.location.href = `sms:${String(phone).replace(/[^\d+]/g, "")}${body ? "?&body=" + encodeURIComponent(body) : ""}`;
    } else {
      toast(`${label}: number not set yet - add it in data.js`);
    }
  }

  const qc = $("#quickContacts");
  [CONTACTS.gm, CONTACTS.john, CONTACTS.judy, CONTACTS.emergencyVendor].forEach((c) => {
    const b = el("button", "qc-btn", `📞 ${esc(c.role)}`);
    b.addEventListener("click", () => callOrCopy(c.role, c.phone));
    qc.appendChild(b);
  });
  const logBtn = el("button", "qc-btn log", "📋 Incident log");
  logBtn.addEventListener("click", () => switchTab("log"));
  qc.appendChild(logBtn);

  // Auth chip (sign in / who's signed in). Only meaningful with a backend.
  const authChip = el("button", "qc-btn auth");
  authChip.addEventListener("click", () => {
    if (BoomAuth.isAuthed()) {
      if (confirm("Sign out of Boom SOS?")) BoomAuth.signOut();
    } else {
      switchTab("log");
    }
  });
  function renderAuthChip() {
    if (!BoomAuth.configured) { authChip.hidden = true; return; }
    authChip.hidden = false;
    if (BoomAuth.isManager()) authChip.innerHTML = `👤 ${esc(BoomAuth.displayName())}`;
    else if (BoomAuth.isAuthed()) authChip.innerHTML = `⚠️ Not authorized`;
    else authChip.innerHTML = `🔓 Sign in`;
  }
  qc.appendChild(authChip);

  // Blocks logging actions for anyone who isn't a signed-in manager.
  function requireLogAuth() {
    if (BoomAuth.configured && !BoomAuth.isManager()) {
      toast(BoomAuth.isAuthed()
        ? "Your email isn't on the manager list yet"
        : "Sign in on the Log tab to record incidents");
      switchTab("log");
      return false;
    }
    return true;
  }
  const currentManagerName = () =>
    (BoomAuth.configured && BoomAuth.displayName()) || "[MOD]";

  /* ---------------- Tabs ---------------- */
  function switchTab(name) {
    $$(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
    $$(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + name));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (name === "log") refreshLog();
  }
  $$(".tab").forEach((t) => t.addEventListener("click", () => switchTab(t.dataset.tab)));

  /* ---------------- Emergency cards ---------------- */
  const grid = $("#cardGrid");
  EMERGENCY_CARDS.forEach((card) => {
    const b = el("button", "ecard",
      `<span class="ico">${card.icon}</span><span class="label">${esc(card.title)}</span>`);
    b.addEventListener("click", () => openFlow(card));
    grid.appendChild(b);
  });

  /* ---------------- Modal helpers ---------------- */
  const modal = $("#modal");
  const modalCard = $("#modalCard");
  function openModal(node) {
    modalCard.innerHTML = "";
    modalCard.appendChild(node);
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = "";
  }
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

  function modalHead(title) {
    const head = el("div", "modal-head", `<h2>${esc(title)}</h2>`);
    const x = el("button", "modal-close", "✕");
    x.addEventListener("click", closeModal);
    head.appendChild(x);
    return head;
  }

  /* ---------------- Emergency flow ---------------- */
  function openFlow(card) {
    const f = card.flow;
    const wrap = el("div");
    wrap.appendChild(modalHead(f.title));

    const list = (items) => "<ul>" + items.map((i) => `<li>${esc(i)}</li>`).join("") + "</ul>";

    wrap.appendChild(el("div", "flow-block", `<h3>Do this now</h3>${list(f.immediate)}`));
    wrap.appendChild(el("div", "flow-block risk", `<h3>Risk check</h3>${list(f.riskCheck)}`));
    wrap.appendChild(el("div", "flow-block", `<h3>Call now</h3>${list(f.callNow)}`));

    // One-tap actions
    const ot = el("div", "flow-block", `<h3>One-tap actions</h3>`);
    const grid2 = el("div", "onetap");
    const vendor = card.flow.vendorCategory ? VENDORS.find((v) => v.category === card.flow.vendorCategory) : null;

    const mkBtn = (label, cls, fn) => { const b = el("button", "btn " + cls, label); b.addEventListener("click", fn); return b; };
    if (vendor) {
      grid2.appendChild(mkBtn("📞 Call vendor", "primary",
        () => callOrCopy(vendor.category + " vendor", vendor.primary.phone)));
    }
    grid2.appendChild(mkBtn("💬 Text GM", "dark",
      () => smsOrCopy("GM", CONTACTS.gm.phone, `Boom SOS - ${STORE.name}: ${f.title}. `)));
    grid2.appendChild(mkBtn("⬆️ Escalate to John", "dark",
      () => callOrCopy("John", CONTACTS.john.phone)));
    grid2.appendChild(mkBtn("📋 Log incident", "ghost",
      () => openIncidentForm(card)));
    ot.appendChild(grid2);
    wrap.appendChild(ot);

    // Quick log from questions
    const qBlock = el("div", "flow-block", `<h3>Log this now</h3>`);
    const form = el("div");
    const answers = {};
    f.questions.forEach((q) => form.appendChild(buildField(q, answers)));
    qBlock.appendChild(form);
    const saveBtn = el("button", "btn primary full", "Save to incident log");
    saveBtn.addEventListener("click", () => {
      if (!requireLogAuth()) { closeModal(); return; }
      saveIncident(buildIncidentFromFlow(card, answers));
      toast("Logged ✓");
      closeModal();
      switchTab("log");
    });
    qBlock.appendChild(saveBtn);
    wrap.appendChild(qBlock);

    openModal(wrap);
  }

  function buildField(q, answers) {
    const wrap = el("div", "field");
    wrap.appendChild(el("label", null, esc(q.label)));
    if (q.type === "yesno") {
      const yn = el("div", "yesno");
      ["Yes", "No"].forEach((opt) => {
        const b = el("button", null, opt);
        b.addEventListener("click", () => {
          answers[q.id] = opt;
          $$("button", yn).forEach((x) => x.classList.remove("on"));
          b.classList.add("on");
        });
        yn.appendChild(b);
      });
      wrap.appendChild(yn);
    } else {
      const inp = el("input");
      inp.type = "text";
      inp.addEventListener("input", () => { answers[q.id] = inp.value; });
      wrap.appendChild(inp);
    }
    return wrap;
  }

  function buildIncidentFromFlow(card, answers) {
    const f = card.flow;
    const labelFor = (id) => (f.questions.find((q) => q.id === id) || {}).label || id;
    const details = Object.keys(answers)
      .filter((k) => answers[k] !== "" && answers[k] != null)
      .map((k) => `${labelFor(k)} ${answers[k]}`)
      .join(" · ");
    const atRisk = (answers.atRisk || "").toLowerCase() === "yes";
    return {
      issue: card.title,
      type: card.title,
      category: categoryForCard(card.id),
      details,
      mod: currentManagerName(),
      tempReported: answers.temp || "",
      vendorContacted: (answers.vendorCalled || "").toLowerCase() === "yes",
      eta: answers.eta || "",
      productAtRisk: atRisk,
      escalated: false,
      status: "open",
    };
  }

  function categoryForCard(id) {
    if (["walkin", "freezer", "dishwasher", "ice", "hvac"].includes(id)) return "Equipment";
    if (["power", "internet", "plumbing", "gasfire"].includes(id)) return "Utilities";
    if (id === "noshow") return "Staffing";
    if (id === "guest") return "Guest";
    return "Equipment";
  }

  /* ---------------- Vendors ---------------- */
  const vendorList = $("#vendorList");
  function renderVendors(filter) {
    vendorList.innerHTML = "";
    const q = (filter || "").trim().toLowerCase();
    const matches = VENDORS.filter((v) => {
      if (!q) return true;
      return (
        v.category.toLowerCase().includes(q) ||
        (v.primary.name || "").toLowerCase().includes(q) ||
        (v.primary.notes || "").toLowerCase().includes(q)
      );
    });
    if (!matches.length) {
      vendorList.appendChild(el("div", "empty", "No vendors match."));
      return;
    }
    matches.forEach((v) => vendorList.appendChild(vendorCard(v)));
  }

  function phoneRow(label, phone) {
    if (realPhone(phone)) {
      return `<div class="vc-row"><span class="lab">${label}</span><a href="${telHref(phone)}">${esc(phone)}</a></div>`;
    }
    return `<div class="vc-row"><span class="lab">${label}</span><span>${esc(phone)}</span></div>`;
  }

  function vendorCard(v) {
    const needsInfo = /^\s*\[/.test(v.primary.name || "") || !realPhone(v.primary.phone);
    const badge = needsInfo
      ? `<span class="badge no">Needs info</span>`
      : v.approved === true ? `<span class="badge ok">Approved</span>`
      : v.approved === false ? `<span class="badge no">Not approved</span>`
      : `<span class="badge unk">Unconfirmed</span>`;
    const card = el("div", "vendor-card",
      `<div class="vc-head"><span class="vc-cat">${esc(v.category)}</span>${badge}</div>
       <div class="vc-row"><span class="lab">Primary</span><strong>${esc(v.primary.name)}</strong></div>
       ${phoneRow("Call", v.primary.phone)}
       ${phoneRow("After hours", v.primary.afterHours)}
       <p class="vc-notes">${esc(v.primary.notes)}</p>
       <div class="vc-backup"><span class="lab">Backup:</span> ${esc(v.backup.name)} ·
         ${realPhone(v.backup.phone) ? `<a href="${telHref(v.backup.phone)}">${esc(v.backup.phone)}</a>` : esc(v.backup.phone)}</div>`);
    return card;
  }
  $("#vendorSearch").addEventListener("input", (e) => renderVendors(e.target.value));
  renderVendors("");

  /* ---------------- Playbooks ---------------- */
  const pbList = $("#playbookList");
  function renderPlaybooks() {
    pbList.innerHTML = "";
    PLAYBOOKS.forEach((p) => {
      const item = el("div", "pb");
      const head = el("button", "pb-head", `${esc(p.title)}<span class="chev">›</span>`);
      const body = el("div", "pb-body",
        `<div class="pb-line"><span class="k">First move</span><span class="v">${esc(p.firstMove)}</span></div>
         <div class="pb-line"><span class="k">What not to do</span><span class="v">${esc(p.doNot)}</span></div>
         <div class="pb-line"><span class="k">Who approves</span><span class="v">${esc(p.approves)}</span></div>
         <div class="pb-line"><span class="k">When to escalate</span><span class="v">${esc(p.escalate)}</span></div>
         <div class="pb-line"><span class="k">How to log it</span><span class="v">${esc(p.log)}</span></div>`);
      head.addEventListener("click", () => item.classList.toggle("open"));
      item.appendChild(head);
      item.appendChild(body);
      item.dataset.pbId = p.id;
      pbList.appendChild(item);
    });
  }
  renderPlaybooks();

  function openPlaybook(title) {
    switchTab("playbooks");
    const item = $$(".pb").find((n) => {
      const p = PLAYBOOKS.find((x) => x.id === n.dataset.pbId);
      return p && p.title === title;
    });
    if (item) {
      $$(".pb").forEach((n) => n.classList.remove("open"));
      item.classList.add("open");
      item.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  /* ---------------- Ask Boom ---------------- */
  const askPrompts = $("#askPrompts");
  ASK_BOOM.forEach((entry) => {
    const c = el("button", "chip", esc(entry.prompt));
    c.addEventListener("click", () => { $("#askInput").value = entry.prompt; runAsk(entry.prompt); });
    askPrompts.appendChild(c);
  });

  function matchAsk(query) {
    const q = query.toLowerCase();
    let best = null, bestScore = 0;
    ASK_BOOM.forEach((entry) => {
      let score = 0;
      entry.keywords.forEach((kw) => { if (q.includes(kw)) score += kw.length; });
      if (score > bestScore) { bestScore = score; best = entry; }
    });
    return best;
  }

  function runAsk(query) {
    query = (query || "").trim();
    if (!query) return;
    const match = matchAsk(query);
    const a = match ? match.answer : ASK_BOOM_FALLBACK;
    const out = $("#askAnswer");
    out.innerHTML = "";

    const block = (num, head, body) => {
      const b = el("div", "ab-block", `<span class="num">${num}</span><span class="h">${head}</span>`);
      b.appendChild(body);
      return b;
    };
    const ul = (items) => { const u = el("ul"); items.forEach((i) => u.appendChild(el("li", null, esc(i)))); return u; };
    const p = (text) => el("p", null, esc(text));

    out.appendChild(block(1, "Do this now", ul(a.now)));
    out.appendChild(block(2, "Call this person/vendor", ul(a.call)));
    out.appendChild(block(3, "Escalate if", p(a.escalate)));
    out.appendChild(block(4, "Log this", p(a.log)));

    const pbBlock = el("div", "ab-block", `<span class="num">5</span><span class="h">Related playbook</span>`);
    const link = el("button", "ab-pb-link", esc(a.playbook));
    link.addEventListener("click", () => openPlaybook(a.playbook));
    pbBlock.appendChild(link);
    out.appendChild(pbBlock);

    out.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  $("#askBtn").addEventListener("click", () => runAsk($("#askInput").value));
  $("#askInput").addEventListener("keydown", (e) => { if (e.key === "Enter") runAsk($("#askInput").value); });

  /* ---------------- Incident log (Supabase-backed, offline-first) ---------------- */
  // Storage + sync live in store.js (IncidentStore). These are thin wrappers.
  function loadIncidents() { return IncidentStore.list(); }
  function saveIncident(inc) { return IncidentStore.add(inc); }
  function updateIncident(id, patch) { IncidentStore.update(id, patch); }

  let currentView = "open";
  let currentFilter = "";

  $$("#logViews .chip").forEach((c) =>
    c.addEventListener("click", () => {
      $$("#logViews .chip").forEach((x) => x.classList.remove("active"));
      c.classList.add("active");
      currentView = c.dataset.view;
      renderIncidents();
    }));
  $$("#logFilters .chip").forEach((c) =>
    c.addEventListener("click", () => {
      $$("#logFilters .chip").forEach((x) => x.classList.remove("active"));
      c.classList.add("active");
      currentFilter = c.dataset.filter;
      renderIncidents();
    }));
  $("#newIncidentBtn").addEventListener("click", () => { if (requireLogAuth()) openIncidentForm(null); });

  function filterIncidents(list) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekAgo = now.getTime() - 7 * 864e5;

    let out = list.slice();
    if (currentView === "open") out = out.filter((i) => i.status !== "resolved");
    else if (currentView === "today") out = out.filter((i) => i.ts >= startOfDay);
    else if (currentView === "week") out = out.filter((i) => i.ts >= weekAgo);
    else if (currentView === "repeat") {
      const counts = {};
      list.forEach((i) => { counts[i.type] = (counts[i.type] || 0) + 1; });
      out = out.filter((i) => counts[i.type] > 1);
    }

    if (currentFilter === "Unresolved") out = out.filter((i) => i.status !== "resolved");
    else if (currentFilter === "Vendor") out = out.filter((i) => i.vendorContacted);
    else if (currentFilter) out = out.filter((i) => i.category === currentFilter);

    return out;
  }

  function fmtTime(ts) {
    const d = new Date(ts);
    const today = new Date();
    const sameDay = d.toDateString() === today.toDateString();
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return sameDay ? time : d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + time;
  }

  // Decide whether to show the log, the sign-in card, or a not-authorized card.
  function refreshLog() {
    const gated = BoomAuth.configured && !BoomAuth.isManager();
    ["#logViews", "#logFilters", "#newIncidentBtn"].forEach((s) => {
      const node = $(s);
      if (node) node.style.display = gated ? "none" : "";
    });
    if (gated) renderLogGate();
    else renderIncidents();
  }

  function renderLogGate() {
    const host = $("#incidentList");
    host.innerHTML = "";
    if (BoomAuth.isAuthed()) {
      // Signed in but email isn't on the allowlist.
      const card = el("div", "gate",
        `<h3>Not authorized yet</h3>
         <p>You're signed in as <strong>${esc(BoomAuth.email())}</strong>, but that
         email isn't on the Highlands manager list. Ask an admin to add it.</p>`);
      const out = el("button", "btn ghost full", "Sign out");
      out.addEventListener("click", () => BoomAuth.signOut());
      card.appendChild(out);
      host.appendChild(card);
      return;
    }
    const last = localStorage.getItem("boomSOS.lastEmail") || "";
    const card = el("div", "gate",
      `<h3>Sign in to the incident log</h3>
       <p>The shared log is for Highlands managers. Enter your work email and
       we'll send a one-tap sign-in link - no password.</p>`);
    const field = el("div", "field",
      `<label>Work email</label><input id="gateEmail" type="email" inputmode="email"
        autocomplete="email" value="${esc(last)}" placeholder="you@boombozz.com">`);
    card.appendChild(field);
    const send = el("button", "btn primary full", "Send sign-in link");
    send.addEventListener("click", async () => {
      const email = $("#gateEmail", card).value.trim();
      if (!email || !/.+@.+\..+/.test(email)) { toast("Enter a valid email"); return; }
      localStorage.setItem("boomSOS.lastEmail", email);
      send.disabled = true; send.textContent = "Sending…";
      try {
        await BoomAuth.sendMagicLink(email);
        host.innerHTML = "";
        host.appendChild(el("div", "gate",
          `<h3>Check your email</h3>
           <p>We sent a sign-in link to <strong>${esc(email)}</strong>. Open it on
           this device to finish signing in.</p>`));
      } catch (e) {
        send.disabled = false; send.textContent = "Send sign-in link";
        toast("Couldn't send link: " + (e && e.message ? e.message : "try again"));
      }
    });
    card.appendChild(send);
    host.appendChild(card);
  }

  function renderIncidents() {
    const host = $("#incidentList");
    host.innerHTML = "";
    host.appendChild(syncStatusLine());
    const list = filterIncidents(loadIncidents());
    if (!list.length) {
      host.appendChild(el("div", "empty", "No incidents here. That's a good thing."));
      return;
    }
    list.forEach((inc) => host.appendChild(incidentCard(inc)));
  }

  function syncStatusLine() {
    const s = IncidentStore.status();
    let txt, cls;
    if (!s.configured) { txt = "Local only - backend not configured"; cls = "off"; }
    else if (!s.online) { txt = `Offline - ${s.pending} change${s.pending === 1 ? "" : "s"} will sync when back online`; cls = "off"; }
    else if (s.pending) { txt = `Syncing ${s.pending} change${s.pending === 1 ? "" : "s"}…`; cls = "pending"; }
    else { txt = "Synced - shared across managers"; cls = "ok"; }
    return el("div", "sync-status " + cls, esc(txt));
  }

  function incidentCard(inc) {
    const cls = inc.status === "resolved" ? "resolved" : inc.escalated ? "escalated" : "open";
    const meta = [];
    meta.push(`MOD ${esc(inc.mod)}`);
    if (inc.tempReported) meta.push(`Temp ${esc(inc.tempReported)}`);
    if (inc.vendorContacted) meta.push("Vendor called");
    if (inc.eta) meta.push(`ETA ${esc(inc.eta)}`);
    if (inc.productAtRisk) meta.push("⚠️ Product at risk");
    if (inc.escalated) meta.push("⬆️ Escalated");
    if (inc.details) meta.push(esc(inc.details));
    if (inc.resolution) meta.push("✓ " + esc(inc.resolution));

    const card = el("div", "incident " + cls,
      `<div class="inc-top">
         <span class="inc-issue">${esc(inc.issue)}</span>
         <span class="inc-time">${fmtTime(inc.ts)}</span>
       </div>
       <div class="inc-meta">${meta.join(" · ")}</div>`);

    const actions = el("div", "inc-actions");
    if (inc.status !== "resolved") {
      const resolve = el("button", "btn primary sm", "Resolve");
      resolve.addEventListener("click", () => {
        const note = prompt("Resolution note:", "");
        if (note !== null) {
          updateIncident(inc.id, { status: "resolved", resolution: note || "Resolved" });
          renderIncidents();
        }
      });
      actions.appendChild(resolve);

      if (!inc.escalated) {
        const esc2 = el("button", "btn ghost sm", "⬆️ Escalate");
        esc2.addEventListener("click", () => {
          updateIncident(inc.id, { escalated: true });
          callOrCopy("John", CONTACTS.john.phone);
          renderIncidents();
        });
        actions.appendChild(esc2);
      }
    } else {
      const reopen = el("button", "btn ghost sm", "Reopen");
      reopen.addEventListener("click", () => {
        updateIncident(inc.id, { status: "open" });
        renderIncidents();
      });
      actions.appendChild(reopen);
    }
    card.appendChild(actions);
    return card;
  }

  // Manual / blank incident form
  function openIncidentForm(card) {
    const wrap = el("div");
    wrap.appendChild(modalHead(card ? "Log: " + card.title : "Log a new incident"));
    const answers = {};

    const issueField = el("div", "field",
      `<label>Issue</label><input id="f_issue" type="text" value="${card ? esc(card.title) : ""}" placeholder="What happened?">`);
    wrap.appendChild(issueField);

    const catField = el("div", "field");
    catField.appendChild(el("label", null, "Category"));
    const sel = el("select");
    ["Equipment", "Utilities", "Staffing", "Guest"].forEach((c) => {
      const o = el("option", null, c); o.value = c;
      if (card && categoryForCard(card.id) === c) o.selected = true;
      sel.appendChild(o);
    });
    catField.appendChild(sel);
    wrap.appendChild(catField);

    const modField = el("div", "field",
      `<label>Manager on duty</label><input id="f_mod" type="text" placeholder="Your name"
        value="${esc(currentManagerName() === "[MOD]" ? "" : currentManagerName())}">`);
    wrap.appendChild(modField);

    const detailField = el("div", "field",
      `<label>Notes</label><textarea id="f_details" placeholder="What's going on, vendor, ETA…"></textarea>`);
    wrap.appendChild(detailField);

    const riskField = el("div", "field");
    riskField.appendChild(el("label", null, "Product at risk?"));
    const yn = el("div", "yesno");
    ["Yes", "No"].forEach((opt) => {
      const b = el("button", null, opt);
      b.addEventListener("click", () => {
        answers.atRisk = opt;
        $$("button", yn).forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
      });
      yn.appendChild(b);
    });
    riskField.appendChild(yn);
    wrap.appendChild(riskField);

    const save = el("button", "btn primary full", "Save to incident log");
    save.addEventListener("click", () => {
      if (!requireLogAuth()) { closeModal(); return; }
      const issue = $("#f_issue", wrap).value.trim();
      if (!issue) { toast("Add what happened first"); return; }
      saveIncident({
        issue,
        type: card ? card.title : issue,
        category: sel.value,
        mod: $("#f_mod", wrap).value.trim() || "[MOD]",
        details: $("#f_details", wrap).value.trim(),
        productAtRisk: (answers.atRisk || "") === "Yes",
        vendorContacted: false,
        escalated: false,
        status: "open",
      });
      toast("Logged ✓");
      closeModal();
      switchTab("log");
    });
    wrap.appendChild(save);
    openModal(wrap);
  }

  /* ---------------- Escalation ---------------- */
  const ladder = $("#ladder");
  ESCALATION.ladder.forEach((r, i) => {
    const rung = el("div", "rung",
      `<span class="step">${i + 1}</span>
       <div><div class="who">${esc(r.who)}</div><div class="when">${esc(r.when)}</div></div>`);
    ladder.appendChild(rung);
  });
  const redList = $("#redList");
  ESCALATION.redLevel.forEach((r) => redList.appendChild(el("li", null, esc(r))));

  /* ---------------- Global search ---------------- */
  const SEARCH_INDEX = [];
  EMERGENCY_CARDS.forEach((c) => SEARCH_INDEX.push({ kind: "Emergency", label: c.title, icon: c.icon, run: () => openFlow(c) }));
  VENDORS.forEach((v) => SEARCH_INDEX.push({ kind: "Vendor", label: v.category, icon: "🔧", run: () => { switchTab("vendors"); $("#vendorSearch").value = v.category; renderVendors(v.category); } }));
  PLAYBOOKS.forEach((p) => SEARCH_INDEX.push({ kind: "Playbook", label: p.title, icon: "📘", run: () => openPlaybook(p.title) }));
  ASK_BOOM.forEach((a) => SEARCH_INDEX.push({ kind: "Ask Boom", label: a.prompt, icon: "💬", run: () => { switchTab("ask"); $("#askInput").value = a.prompt; runAsk(a.prompt); } }));

  const searchResults = $("#searchResults");
  function runGlobalSearch(q) {
    q = q.trim().toLowerCase();
    if (!q) { searchResults.hidden = true; searchResults.innerHTML = ""; return; }
    const hits = SEARCH_INDEX.filter((x) => x.label.toLowerCase().includes(q)).slice(0, 8);
    searchResults.innerHTML = "";
    if (!hits.length) { searchResults.hidden = true; return; }
    hits.forEach((h) => {
      const item = el("div", "sr-item", `<span>${h.icon}</span><span>${esc(h.label)}</span><span class="sr-kind">${h.kind}</span>`);
      item.addEventListener("click", () => {
        searchResults.hidden = true;
        $("#globalSearch").value = "";
        h.run();
      });
      searchResults.appendChild(item);
    });
    searchResults.hidden = false;
  }
  $("#globalSearch").addEventListener("input", (e) => runGlobalSearch(e.target.value));
  document.addEventListener("click", (e) => {
    if (!searchResults.contains(e.target) && e.target.id !== "globalSearch") searchResults.hidden = true;
  });

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  /* ---------------- Init ---------------- */
  const refreshLogIfActive = () => {
    if ($("#panel-log").classList.contains("active")) refreshLog();
  };
  IncidentStore.subscribe(refreshLogIfActive);

  // React to sign-in / sign-out: update the chip, re-render the log, pull data.
  BoomAuth.onChange(() => {
    renderAuthChip();
    refreshLogIfActive();
    IncidentStore.refresh();
  });
  renderAuthChip();

  IncidentStore.init();
  refreshLog();
})();
