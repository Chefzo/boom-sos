/* Boom SOS — backend config
 *
 * These are PUBLIC client credentials (Supabase publishable key). They are
 * safe to ship in the browser — access is governed by row-level security on
 * the boom_sos_incidents table, not by hiding this key.
 */
window.BOOM_SOS_CONFIG = {
  supabaseUrl: "https://xrrsxcdqkpkgwkqzgzpm.supabase.co",
  supabaseKey: "sb_publishable_jgikraIDQfRDo9lvtr0twg_GcpCRhLz",
  table: "boom_sos_incidents",
  store: "Highlands",
};
