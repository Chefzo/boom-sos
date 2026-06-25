/* Boom SOS — incident store
 *
 * Offline-first. localStorage is always the working copy so the log keeps
 * functioning when the internet is down (which is one of the emergencies this
 * tool exists for). When online, changes sync to Supabase so every manager —
 * and eventually every store — sees the same log.
 *
 * Flow:
 *   - add/update write locally first, mark the record dirty, render instantly
 *   - sync() pushes dirty records, then pulls remote and merges
 *     (remote wins for records with no local unsynced changes)
 *   - sync runs on load, when the browser comes back online, and on a timer
 */
(function () {
  "use strict";

  const CFG = window.BOOM_SOS_CONFIG || {};
  const LS_KEY = "boomSOS.highlands.incidents";
  // Backed by Supabase only when the client + auth module are present.
  const CONFIGURED = !!(CFG.supabaseUrl && CFG.supabaseKey && window.sb);
  const STORE_NAME = CFG.store || "Highlands";
  const canSync = () =>
    CONFIGURED && navigator.onLine && window.BoomAuth && window.BoomAuth.isManager();

  let cache = [];
  const listeners = [];
  let syncing = false;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  /* ---- local persistence ---- */
  function loadLocal() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveLocal() { localStorage.setItem(LS_KEY, JSON.stringify(cache)); }

  /* ---- mapping between app shape and DB row ---- */
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
      created_at: new Date(inc.ts).toISOString(),
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
    const { error } = await window.sb.from(CFG.table).upsert(toRow(inc));
    if (error) throw error;
  }

  /* ---- sync ---- */
  async function sync() {
    if (!canSync() || syncing) return;
    syncing = true;
    try {
      // push local changes first
      for (const d of cache.filter((c) => c.dirty)) {
        try { await remoteUpsert(d); d.dirty = false; }
        catch (e) { /* keep dirty, retry next sync */ }
      }
      saveLocal();

      // pull remote and merge (remote wins unless we hold unsynced edits)
      const rows = await remoteList();
      const byId = {};
      cache.forEach((c) => (byId[c.id] = c));
      rows.forEach((r) => {
        const local = byId[r.id];
        if (!local) { const obj = fromRow(r); byId[r.id] = obj; cache.push(obj); }
        else if (!local.dirty) { Object.assign(local, fromRow(r)); }
      });
      saveLocal();
      emit();
    } catch (e) {
      /* offline or transient error — local copy stands */
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
    };
  }
  function add(inc) {
    inc.id = uuid();
    inc.ts = Date.now();
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
    Object.assign(cache[i], patch, { dirty: true });
    saveLocal();
    emit();
    sync();
  }
  function subscribe(fn) { listeners.push(fn); }
  function init() {
    cache = loadLocal();
    emit();
    sync();
    window.addEventListener("online", sync);
    setInterval(sync, 30000);
  }

  window.IncidentStore = { init, list, add, update, subscribe, status, refresh: sync };
})();
