// Data layer shared by the public site and the admin.
// With supabaseUrl + supabaseAnonKey set in config.js, everything is stored in Supabase.
// Without them the site runs in "demo mode": data is kept only in this browser.
(function () {
  var C = window.HFP_CONFIG || {};
  var LIVE = !!(C.supabaseUrl && C.supabaseAnonKey);
  var SB_SRC = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js";
  var TABLES = ["pets", "enquiries", "clients", "stays", "stay_updates", "shelters", "contacts", "reminders"];
  var client = null;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  function now() { return new Date().toISOString(); }

  // ---------- Demo store (localStorage) ----------
  var KEY = "hfp_demo_v1";
  var mem = null;
  function seedPets() {
    return (window.HFP_PETS || []).map(function (p) {
      return {
        id: p.id, status: p.status, visibility: "public", name: p.name, species: p.species, breed: p.breed,
        age: p.age, sex: p.sex, size: p.size, colour: p.colour, photo_url: p.photo || "",
        traits: p.traits || [], good_with: p.goodWith || {}, story: p.story, needs: p.needs || "",
        shelter_name: p.shelter || "", enquire_url: p.enquire || "", sample: !!p.sample, profile: {},
        created_at: now(), updated_at: now(),
      };
    });
  }
  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY) || "null"); } catch (e) { mem = null; }
    if (!mem) {
      mem = {};
      TABLES.forEach(function (t) { mem[t] = []; });
      mem.pets = seedPets();
      (window.HFP_PETS || []).forEach(function (p) {
        (p.updates || []).forEach(function (u, i) {
          mem.stay_updates.push({ id: uuid(), pet_id: p.id, note: u, photo_url: "", created_at: new Date(Date.now() - (2 - i) * 864e5).toISOString() });
        });
      });
      save();
    }
    TABLES.forEach(function (t) { mem[t] = mem[t] || []; });
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* storage full or blocked */ } }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  // ---------- Supabase ----------
  var readyP = null;
  function ready() {
    if (readyP) return readyP;
    if (!LIVE) { readyP = Promise.resolve(); return readyP; }
    readyP = new Promise(function (res, rej) {
      if (window.supabase && window.supabase.createClient) return res();
      var s = document.createElement("script");
      s.src = SB_SRC; s.onload = res; s.onerror = function () { rej(new Error("Could not load Supabase")); };
      document.head.appendChild(s);
    }).then(function () {
      client = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
    });
    return readyP;
  }
  function sb(q) { return q.then(function (r) { if (r.error) throw r.error; return r.data; }); }

  var db = {
    live: LIVE,
    uuid: uuid,
    ready: ready,

    // Generic CRUD used by the admin
    list: function (table, opts) {
      opts = opts || {};
      return ready().then(function () {
        if (LIVE) {
          var q = client.from(table).select("*");
          if (opts.eq) Object.keys(opts.eq).forEach(function (k) { q = q.eq(k, opts.eq[k]); });
          q = q.order(opts.order || "created_at", { ascending: !!opts.asc });
          return sb(q);
        }
        var rows = load()[table].filter(function (r) {
          return !opts.eq || Object.keys(opts.eq).every(function (k) { return r[k] === opts.eq[k]; });
        });
        var key = opts.order || "created_at";
        rows.sort(function (a, b) { var x = a[key] || "", y = b[key] || ""; return (x < y ? -1 : x > y ? 1 : 0) * (opts.asc ? 1 : -1); });
        return clone(rows);
      });
    },
    get: function (table, id) {
      return ready().then(function () {
        if (LIVE) return sb(client.from(table).select("*").eq("id", id).maybeSingle());
        var r = load()[table].find(function (x) { return x.id === id; });
        return r ? clone(r) : null;
      });
    },
    insert: function (table, row) {
      row = Object.assign({ id: uuid(), created_at: now() }, row);
      if (table === "pets") row.updated_at = now();
      return ready().then(function () {
        if (LIVE) return sb(client.from(table).insert(row).select().single());
        load()[table].push(row); save(); return clone(row);
      });
    },
    update: function (table, id, patch) {
      patch = Object.assign({}, patch);
      if (table === "pets") patch.updated_at = now();
      return ready().then(function () {
        if (LIVE) return sb(client.from(table).update(patch).eq("id", id).select().single());
        var r = load()[table].find(function (x) { return x.id === id; });
        if (!r) throw new Error("Not found");
        Object.assign(r, patch); save(); return clone(r);
      });
    },
    remove: function (table, id) {
      return ready().then(function () {
        if (LIVE) return sb(client.from(table).delete().eq("id", id));
        var s = load();
        s[table] = s[table].filter(function (x) { return x.id !== id; });
        if (table === "pets") {
          s.stays = s.stays.filter(function (x) { return x.pet_id !== id; });
          s.stay_updates = s.stay_updates.filter(function (x) { return x.pet_id !== id; });
        }
        save();
      });
    },
    // Mark an automatic reminder done (or undone) by its key
    setReminder: function (key, done) {
      return ready().then(function () {
        if (LIVE) return sb(client.from("reminders").upsert({ key: key, done: done }, { onConflict: "key" }));
        var s = load(); var r = s.reminders.find(function (x) { return x.key === key; });
        if (r) r.done = done; else s.reminders.push({ id: uuid(), key: key, done: done, created_at: now() });
        save();
      });
    },

    // Photos: Supabase Storage when live, a resized data URL in demo mode
    uploadPhoto: function (file) {
      return resize(file, LIVE ? 1600 : 700).then(function (blob) {
        if (!LIVE) return blobToDataURL(blob);
        return ready().then(function () {
          var path = new Date().toISOString().slice(0, 10) + "/" + uuid() + ".jpg";
          return sb(client.storage.from("pet-photos").upload(path, blob, { contentType: "image/jpeg" })).then(function () {
            return client.storage.from("pet-photos").getPublicUrl(path).data.publicUrl;
          });
        });
      });
    },

    // Public site
    publicPets: function () {
      return db.list("pets", { asc: true }).then(function (rows) {
        return rows.filter(function (p) { return p.visibility === "public" && (p.status === "adoptable" || p.status === "guest"); });
      });
    },
    publicPet: function (id) {
      return db.get("pets", id).then(function (p) {
        if (!p || p.visibility === "private" || !(p.status === "adoptable" || p.status === "guest")) return null;
        return db.list("stay_updates", { eq: { pet_id: id }, asc: true }).then(function (u) { p.updates = u; return p; });
      });
    },
    submitEnquiry: function (row) {
      row = Object.assign({ status: "new" }, row);
      return ready().then(function () {
        // Insert without reading back: visitors may send enquiries but never read them.
        if (LIVE) return sb(client.from("enquiries").insert(row));
        row.id = uuid(); row.created_at = now();
        load().enquiries.push(row); save();
      });
    },

    // Admin login
    auth: {
      session: function () {
        return ready().then(function () {
          if (!LIVE) return { user: { email: "demo" } };
          return client.auth.getSession().then(function (r) { return r.data.session; });
        });
      },
      signIn: function (email, password) {
        return ready().then(function () {
          return client.auth.signInWithPassword({ email: email, password: password }).then(function (r) {
            if (r.error) throw r.error; return r.data.session;
          });
        });
      },
      signOut: function () { return ready().then(function () { return LIVE ? client.auth.signOut() : null; }); },
    },

    resetDemo: function () { try { localStorage.removeItem(KEY); } catch (e) {} mem = null; },
  };

  function resize(file, max) {
    return new Promise(function (res, rej) {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, max / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { b ? res(b) : rej(new Error("Could not read photo")); }, "image/jpeg", 0.82);
        URL.revokeObjectURL(img.src);
      };
      img.onerror = function () { rej(new Error("That file is not a photo we can read")); };
      img.src = URL.createObjectURL(file);
    });
  }
  function blobToDataURL(b) {
    return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(b); });
  }

  window.HFP_DB = db;
})();
