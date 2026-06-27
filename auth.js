/* Boom SOS - auth (email magic link)
 *
 * Design choice: this gates ONLY the shared incident log. The emergency
 * reference content (cards, vendors, playbooks, Ask Boom) is never behind a
 * login - you should never have to sign in to read "shut off the gas."
 *
 * Sessions persist, so a manager signs in once and stays in. The allowlisted
 * manager row is cached locally so logging keeps working offline after the
 * first successful sign-in.
 */
(function () {
  "use strict";

  const CFG = window.BOOM_SOS_CONFIG || {};
  const MGR_CACHE = "boomSOS.manager";
  const listeners = [];
  let session = null;
  let manager = null; // allowlist row, or null if not authorized

  const haveSDK = !!(window.supabase && window.supabase.createClient);
  const configured = !!(CFG.supabaseUrl && CFG.supabaseKey && haveSDK);

  let sb = null;
  if (configured) {
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
    });
    window.sb = sb;
  }

  function emit() { listeners.forEach((fn) => { try { fn(api); } catch (e) {} }); }

  function cacheManager(m) { try { localStorage.setItem(MGR_CACHE, JSON.stringify(m)); } catch (e) {} }
  function clearManagerCache() { try { localStorage.removeItem(MGR_CACHE); } catch (e) {} }
  function readCachedManager(email) {
    try {
      const m = JSON.parse(localStorage.getItem(MGR_CACHE));
      if (m && email && m.email && m.email.toLowerCase() === email.toLowerCase()) return m;
    } catch (e) {}
    return null;
  }

  async function loadManager() {
    manager = null;
    if (!session || !session.user) return;
    const email = session.user.email;
    try {
      const { data, error } = await sb
        .from("boom_sos_managers")
        .select("email,name,store,role")
        .ilike("email", email)
        .limit(1);
      if (!error && data && data.length) { manager = data[0]; cacheManager(manager); }
      else if (!error) { manager = null; } // authed but not allowlisted
      else { manager = readCachedManager(email); } // query error → fall back to cache
    } catch (e) {
      manager = readCachedManager(email); // offline → trust cached allowlist row
    }
  }

  async function sendMagicLink(email) {
    if (!configured) throw new Error("Backend not configured");
    const redirect = window.location.origin + window.location.pathname;
    const { error } = await sb.auth.signInWithOtp({
      email: String(email).trim(),
      options: { emailRedirectTo: redirect },
    });
    if (error) throw error;
  }

  async function signOut() {
    if (sb) { try { await sb.auth.signOut(); } catch (e) {} }
    session = null; manager = null; clearManagerCache(); emit();
  }

  const api = {
    configured,
    isAuthed: () => !!session,
    isManager: () => !!manager,
    email: () => (session && session.user ? session.user.email : null),
    manager: () => manager,
    displayName: () => (manager && manager.name) || (session && session.user ? session.user.email : null),
    sendMagicLink,
    signOut,
    onChange: (fn) => { listeners.push(fn); if (configured) fn(api); },
    client: () => sb,
  };
  window.BoomAuth = api;

  if (configured) {
    sb.auth.getSession().then(async ({ data }) => {
      session = data.session;
      await loadManager();
      emit();
    });
    sb.auth.onAuthStateChange(async (_evt, s) => {
      session = s;
      await loadManager();
      emit();
    });
  }
})();
