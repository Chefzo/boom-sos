/* Boom SOS - incident store
 *
 * Offline-first. localStorage is the working copy so the log keeps functioning
 * when the internet is down (one of the emergencies this tool exists for).
 * When online + signed in, changes sync to Supabase so every manager sees the
 * same log.
 *
 * Hardening notes (production):
 *   - Every record carries a monotonic `rev`. A push only clears `dirty` if the
 *     record was NOT edited while the push was in flight (rev unchanged). This
 *     prevents lost updates when a manager resolves/escalates mid-sync.
 *   - localStorage writes are guarded; quota / private-mode failures surface a
 *     real error state instead of throwing through the click handler.
 *   - Sync errors are classified (offline / auth / transient) and surfaced via
 *     status() so the UI can warn instead of retrying forever in silence.
 */
(function () {
  "use strict";

  const CFG = window.BOOM_SOS_CONFIG || {};
  const LS_KEY = "boomSOS.highlands.incidents";
  const CONFIGURED = !!(CFG.supabaseUrl && CFG.supabaseKey && window.sb);
  const STORE_NAME = CFG.store || "Highlands";
  const canSync = () =>
    CONFIGURED && navigator.onLine && window.BoomAuth && window.BoomAuth.isManager();

  let cache = [];
  const listeners = [];
  let syncing = false;
  let started = false;
  let persistError = false;     // last localStorage write failed (quota / private mode)
  let syncError = null;         // 'offline' | 'auth' | 'transient' | null

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  /* ---- local persistence (guarded) ---- */
  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch (e) { return []; }
  }
  // Returns true on success. Never throws - a failed write must not break a save.
  function saveLocal() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(cache));
      persistError = false;
      return true;
    } catch (e) {
      // Quota exceeded / Safari Private Mode / storage disabled. Keep the record
      // in memory for this session and tell the user it isn't durable.
      persistError = true;
      return false;
    }
  }

  /* ---- mapping between app shape and DB row ---- */
  function safeISO(ts) {
    const t = typeof ts === "number" ? ts : Date.parse(ts);
    return new Date(Number.isFinite(t) ? t : Date.now()).toISOString();
  }
  function toRow(inc) {
    return {
      id: inc.id,
      store: STORE_NAME,
      issue: inc.issue,
      type: inc.type,
      category: inc.category,
      details: inc.details,
      temp_reported: inc.tempReported || null,
      vendor_contacted: !!inc.vendorContacted,
      eta: inc.eta || null,
      product_at_risk: !!inc.productAtRisk,
      escalated: !!inc.escalated,
      status: inc.status || "open",
      mod: inc.mod || null,
      resolution: inc.resolution || null,
      created_at: safeISO(inc.ts),
    };
  }
  function fromRow(r) {
    return {
      id: r.id,
      ts: r.created_at ? Date.parse(r.created_at) : Date.now(),
      issue: r.issue,
      type: r.type,
      category: r.category,
      details: r.details,
      tempReported: r.temp_reported || "",
      vendorContacted: !!r.vendor_contacted,
      eta: r.eta || "",
      productAtRisk: !!r.product_at_risk,
      escalated: !!r.escalated,
      status: r.status || "open",
      mod: r.mod || "[MOD]",
      resolution: r.resolution || "",
      dirty: false,
    };
  }

  /* ---- error taxonomy ---- */
  function classifyError(e) {
    if (!navigator.onLine) return "offline";
    const status = e && (e.status || e.statusCode || (e.code && Number(e.code)));
    if (status === 401 || status === 403) return "auth";
    const msg = (e && (e.message || e.code || e.details || "")).toString().toLowerCase();
    if (/jwt|permission|row-level|rls|not authorized|denied|forbidden|401|403/.test(msg)) return "auth";
    return "transient";
  }

  /* ---- remote (Supabase client, runs as the signed-in manager) ---- */
  async function remoteList() {
    const { data, error } = await window.sb
      .from(CFG.table)
      .select("*")
      .eq("store", STORE_NAME)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }
  async function remoteUpsert(inc) {
    const { error } = await window.sb.from(CFG.table).upsert(toRow(inc), { onConflict: "id" });
    if (error) throw error;
  }

  /* ---- sync ---- */
  async function sync() {
    if (!canSync() || syncing) return;
    syncing = true;
    let hadError = null;
    try {
      // Push phase. Snapshot (id, rev) so we can detect edits made during the
      // network round-trip and avoid clearing dirty on a record that changed.
      const pending = cache.filter((c) => c.dirty).map((c) => ({ id: c.id, rev: c.rev }));
      for (const snap of pending) {
        const rec = cache.find((c) => c.id === snap.id);
        if (!rec || !rec.dirty) continue;
        try {
          await remoteUpsert(rec);                 // payload snapshotted at call time
          const cur = cache.find((c) => c.id === snap.id);
          if (cur && cur.rev === snap.rev) cur.dirty = false; // unchanged during push
        } catch (e) {
          hadError = classifyError(e);             // keep dirty; retry next cycle
          if (hadError === "offline") break;       // no point continuing offline
        }
      }
      saveLocal();

      // Pull + merge (remote wins only when we hold no unsynced edit).
      try {
        const rows = await remoteList();
        const byId = {};
        cache.forEach((c) => (byId[c.id] = c));
        rows.forEach((r) => {
          const local = byId[r.id];
          if (!local) { const obj = fromRow(r); byId[r.id] = obj; cache.push(obj); }
          else if (!local.dirty) {
            const rev = local.rev;                 // preserve local rev across merge
            Object.assign(local, fromRow(r), { rev });
          }
        });
        saveLocal();
      } catch (e) {
        hadError = hadError || classifyError(e);
      }

      syncError = hadError;
      emit();
    } finally {
      syncing = false;
    }
  }

  /* ---- public API ---- */
  function emit() { listeners.forEach((fn) => { try { fn(list()); } catch (e) {} }); }
  function list() { return cache.slice().sort((a, b) => b.ts - a.ts); }
  function status() {
    return {
      configured: CONFIGURED,
      online: navigator.onLine,
      pending: cache.filter((c) => c.dirty).length,
      persistError,                 // localStorage write failing
      error: syncError,             // 'offline' | 'auth' | 'transient' | null
    };
  }
  function add(inc) {
    inc.id = uuid();
    inc.ts = Date.now();
    inc.rev = 1;
    inc.mod = inc.mod || "[MOD]";
    inc.dirty = true;
    cache.push(inc);
    saveLocal();
    emit();
    sync();
    return inc;
  }
  function update(id, patch) {
    const i = cache.findIndex((c) => c.id === id);
    if (i < 0) return;
    const rev = (cache[i].rev || 0) + 1;
    Object.assign(cache[i], patch, { dirty: true, rev });
    saveLocal();
    emit();
    sync();
  }
  function subscribe(fn) { listeners.push(fn); }
  function init() {
    if (started) return;            // idempotent: never stack timers/listeners
    started = true;
    cache = loadLocal();
    // Backfill rev for records persisted before this field existed.
    cache.forEach((c) => { if (typeof c.rev !== "number") c.rev = 1; });
    emit();
    sync();
    window.addEventListener("online", sync);
    setInterval(sync, 30000);
  }

  window.IncidentStore = { init, list, add, update, subscribe, status, refresh: sync };
})();
