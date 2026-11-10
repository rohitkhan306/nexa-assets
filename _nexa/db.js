/* MayaDB: a small database for a site made with Maya.
 *
 *   <script src="https://getmaya.cloud/_maya/db.js"></script>
 *
 *   const id   = await MayaDB.add("scores", { name: "Riya", score: 12 });
 *   const rows = await MayaDB.list("scores", { limit: 20 });   // [{ id, data, created, updated }]
 *   await MayaDB.update("scores", id, { name: "Riya", score: 15 });
 *   await MayaDB.remove("scores", id);
 *   const likes = await MayaDB.inc("counters", "likes", "count", 1);
 *
 * Rules worth knowing:
 *   - Anyone visiting can ADD. Only the browser that added a row can change or delete it
 *     (MayaDB remembers a key for it in this browser).
 *   - A collection whose name starts with "private_" can be written by visitors but read
 *     only by the site's owner, in the Maya app. Use it for contact forms.
 *   - One row is at most 16 KB of JSON. Never store passwords, OTPs or card numbers.
 *
 * On the real site the data lives on the server. Anywhere else (the preview on your
 * phone, a file opened from disk) it is kept in this browser only, so the page can still
 * be tried out before it is published.
 */
(function () {
  "use strict";
  if (window.MayaDB) return;

  var DOMAIN = "getmaya.cloud";
  var host = (location.hostname || "").toLowerCase();
  var LIVE = host.length > DOMAIN.length + 1 && host.slice(-(DOMAIN.length + 1)) === "." + DOMAIN;

  function fail(code, message, status) {
    var e = new Error(message || code);
    e.code = code;
    e.status = status || 0;
    return e;
  }

  function okName(s, what) {
    if (what === "collection" ? !/^[a-z][a-z0-9_]{0,31}$/.test(s) : !/^[A-Za-z0-9_-]{1,64}$/.test(s)) {
      throw fail("bad_" + what, what === "collection"
        ? "collection names are a-z, 0-9 and _, starting with a letter"
        : "ids are letters, digits, - and _");
    }
    return s;
  }

  // ---- where a row's edit key is remembered
  function keyAt(coll, id) { return "mayadb-key:" + host + ":" + coll + ":" + id; }
  function saveKey(coll, id, key) { try { localStorage.setItem(keyAt(coll, id), key); } catch (e) {} }
  function loadKey(coll, id) { try { return localStorage.getItem(keyAt(coll, id)) || ""; } catch (e) { return ""; } }
  function dropKey(coll, id) { try { localStorage.removeItem(keyAt(coll, id)); } catch (e) {} }

  // ---------------------------------------------------------------- the real thing
  async function call(method, path, body, key) {
    var headers = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (key) headers["X-Edit-Key"] = key;
    var res;
    try {
      res = await fetch("/_db/" + path, {
        method: method, headers: headers, cache: "no-store",
        body: body === undefined ? undefined : JSON.stringify(body)
      });
    } catch (e) {
      throw fail("offline", "could not reach the database - check the internet");
    }
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok || !data || !data.ok) {
      throw fail((data && data.error) || ("http_" + res.status), (data && data.message) || ("MayaDB error " + res.status), res.status);
    }
    return data;
  }

  var remote = {
    add: async function (coll, doc, id) {
      var r = await call("POST", coll + (id ? "?id=" + encodeURIComponent(id) : ""), doc);
      saveKey(coll, r.id, r.key);
      return r.id;
    },
    page: async function (coll, opts) {
      opts = opts || {};
      var q = "?limit=" + (opts.limit || 50) + "&order=" + (opts.order === "old" ? "old" : "new");
      if (opts.cursor) q += "&cursor=" + encodeURIComponent(opts.cursor);
      var r = await call("GET", coll + q);
      return { items: r.items, next: r.next || "" };
    },
    get: async function (coll, id) {
      try {
        var r = await call("GET", coll + "/" + id);
        return { id: r.id, data: r.data, created: r.created, updated: r.updated };
      } catch (e) {
        if (e.status === 404) return null;
        throw e;
      }
    },
    update: async function (coll, id, doc) { await call("PUT", coll + "/" + id, doc, loadKey(coll, id)); return true; },
    remove: async function (coll, id) { await call("DELETE", coll + "/" + id, undefined, loadKey(coll, id)); dropKey(coll, id); return true; },
    inc: async function (coll, id, field, by) {
      var r = await call("POST", coll + "/" + id + "/inc", { field: field, by: by === undefined ? 1 : by });
      return r.value;
    }
  };

  // ---------------------------------------------------------------- the preview stand-in
  // Same answers, kept in this browser. Good enough to try a page; nobody else sees it.
  function boxAt(coll) { return "mayadb-preview:" + coll; }
  function readBox(coll) { try { return JSON.parse(localStorage.getItem(boxAt(coll)) || "[]"); } catch (e) { return []; } }
  function writeBox(coll, rows) { try { localStorage.setItem(boxAt(coll), JSON.stringify(rows)); } catch (e) { throw fail("quota", "this browser's storage is full"); } }
  function isPrivate(coll) { return coll.indexOf("private_") === 0; }

  var local = {
    add: async function (coll, doc, id) {
      var rows = readBox(coll);
      var now = Date.now();
      var rid = id || (now.toString(16) + Math.random().toString(16).slice(2, 10));
      if (rows.some(function (r) { return r.id === rid; })) throw fail("exists", "a document with that id already exists", 409);
      rows.push({ id: rid, data: doc, created: now, updated: now });
      writeBox(coll, rows);
      return rid;
    },
    page: async function (coll, opts) {
      if (isPrivate(coll)) throw fail("private", "this collection can only be read by the site's owner", 403);
      opts = opts || {};
      var rows = readBox(coll).slice().sort(function (a, b) { return a.created - b.created; });
      if (opts.order !== "old") rows.reverse();
      return { items: rows.slice(0, opts.limit || 50), next: "" };
    },
    get: async function (coll, id) {
      if (isPrivate(coll)) throw fail("private", "this collection can only be read by the site's owner", 403);
      var hit = readBox(coll).filter(function (r) { return r.id === id; })[0];
      return hit || null;
    },
    update: async function (coll, id, doc) {
      var rows = readBox(coll), found = false;
      rows.forEach(function (r) { if (r.id === id) { r.data = doc; r.updated = Date.now(); found = true; } });
      if (!found) throw fail("not_found", "no such document", 404);
      writeBox(coll, rows);
      return true;
    },
    remove: async function (coll, id) {
      var rows = readBox(coll), kept = rows.filter(function (r) { return r.id !== id; });
      if (kept.length === rows.length) throw fail("not_found", "no such document", 404);
      writeBox(coll, kept);
      return true;
    },
    inc: async function (coll, id, field, by) {
      var rows = readBox(coll), step = by === undefined ? 1 : by, value = step, found = false;
      rows.forEach(function (r) {
        if (r.id === id) { r.data[field] = (Number(r.data[field]) || 0) + step; r.updated = Date.now(); value = r.data[field]; found = true; }
      });
      if (!found) { var d = {}; d[field] = step; rows.push({ id: id, data: d, created: Date.now(), updated: Date.now() }); }
      writeBox(coll, rows);
      return value;
    }
  };

  var impl = LIVE ? remote : local;

  function isObject(doc) { return doc !== null && typeof doc === "object" && !Array.isArray(doc); }

  window.MayaDB = {
    /** true on the published site, false in a preview (data stays in this browser). */
    live: LIVE,
    add: function (coll, doc, id) {
      okName(coll, "collection"); if (id) okName(id, "id");
      if (!isObject(doc)) return Promise.reject(fail("bad_body", "a document is an object, e.g. { name: 'Riya' }"));
      return impl.add(coll, doc, id);
    },
    /** The rows of a collection, newest first: [{ id, data, created, updated }]. */
    list: function (coll, opts) { okName(coll, "collection"); return impl.page(coll, opts).then(function (p) { return p.items; }); },
    /** Like list(), but also returns `next` to pass back as opts.cursor for the following page. */
    page: function (coll, opts) { okName(coll, "collection"); return impl.page(coll, opts); },
    get: function (coll, id) { okName(coll, "collection"); okName(id, "id"); return impl.get(coll, id); },
    update: function (coll, id, doc) {
      okName(coll, "collection"); okName(id, "id");
      if (!isObject(doc)) return Promise.reject(fail("bad_body", "a document is an object, e.g. { name: 'Riya' }"));
      return impl.update(coll, id, doc);
    },
    remove: function (coll, id) { okName(coll, "collection"); okName(id, "id"); return impl.remove(coll, id); },
    /** Add `by` (default 1) to a number in a row, creating the row if needed. Returns the new value. */
    inc: function (coll, id, field, by) { okName(coll, "collection"); okName(id, "id"); return impl.inc(coll, id, field, by); },
    /** Can this browser change that row? (It can if it created it.) */
    mine: function (coll, id) { return LIVE ? !!loadKey(coll, id) : true; }
  };
})();
