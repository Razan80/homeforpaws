// Home for Paws HQ: the admin app.
(function () {
  var C = window.HFP_CONFIG || {};
  var DB = window.HFP_DB;
  var CP = window.HFP_CAREPLAN;
  var app = document.getElementById("app");
  var S = {}; // cached data
  var TABLES = ["pets", "enquiries", "clients", "stays", "stay_updates", "shelters", "contacts", "reminders"];
  var COLOURS = ["#e9b872", "#9fb7a8", "#c99a8b", "#b8a9d9", "#8fb3cf", "#d6a5b8", "#a8c58f"];
  var PAW = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="6" cy="9" rx="2.2" ry="2.8"/><ellipse cx="10" cy="5.5" rx="2.2" ry="2.8"/><ellipse cx="14" cy="5.5" rx="2.2" ry="2.8"/><ellipse cx="18" cy="9" rx="2.2" ry="2.8"/><path d="M12 11c-3 0-6 3.6-6 6.3C6 19.4 7.6 20 9 20c1.3 0 2-.6 3-.6s1.7.6 3 .6c1.4 0 3-.6 3-2.7C18 14.6 15 11 12 11z"/></svg>';

  // ---------- Helpers ----------
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function today() { return ymd(new Date()); }
  function addDays(s, n) { var d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return ymd(d); }
  function daysBetween(a, b) { return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 864e5); }
  function fmtDate(s) {
    if (!s) return "";
    var d = new Date(s.length <= 10 ? s + "T12:00:00" : s);
    return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  }
  function fmtWhen(s) {
    if (!s) return "";
    var d = new Date(s), mins = Math.round((Date.now() - d) / 6e4);
    if (mins < 60) return mins <= 1 ? "just now" : mins + " min ago";
    if (mins < 1440) return Math.round(mins / 60) + " h ago";
    return d.toLocaleDateString("en-AU", { day: "numeric", month: "short" });
  }
  function money(n) { return n == null || n === "" ? "" : "$" + Number(n).toFixed(Number(n) % 1 ? 2 : 0); }
  function first(name) { return String(name || "").trim().split(/\s+/)[0] || "there"; }
  function byId(t, id) { return (S[t] || []).find(function (x) { return x.id === id; }); }
  function siteUrl() { return C.siteUrl || location.href.replace(/admin\/.*$/, ""); }
  function petLink(p) { return siteUrl() + "pet.html?id=" + encodeURIComponent(p.id); }
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function fail(e) { console.error(e); toast("Something went wrong: " + (e && e.message ? e.message : e)); }
  function intlPhone(p) {
    var d = String(p || "").replace(/[^\d+]/g, "");
    if (d.indexOf("+") === 0) return d.slice(1);
    if (d.indexOf("0") === 0) return "61" + d.slice(1);
    return d;
  }
  function thumb(p) {
    return p.photo_url ? '<img class="thumb" src="' + esc(p.photo_url) + '" alt="">'
      : '<div class="thumb" style="background:' + esc(p.colour || "#e9b872") + '">' + esc((p.name || "?").charAt(0)) + "</div>";
  }
  function pill(s, label) { return '<span class="pill ' + esc(s) + '">' + esc(label || String(s).replace(/_/g, " ")) + "</span>"; }
  function contactButtons(person, message, subject) {
    if (!person) return "";
    var b = [];
    var msg = encodeURIComponent(message || "");
    if (person.phone) {
      b.push('<a class="btn sm ghost" href="tel:' + esc(person.phone.replace(/\s/g, "")) + '">Call</a>');
      b.push('<a class="btn sm ghost" href="sms:' + esc(person.phone.replace(/\s/g, "")) + "?&body=" + msg + '">SMS</a>');
      b.push('<a class="btn sm ghost" target="_blank" rel="noopener" href="https://wa.me/' + esc(intlPhone(person.phone)) + "?text=" + msg + '">WhatsApp</a>');
    }
    if (person.email) b.push('<a class="btn sm ghost" href="mailto:' + esc(person.email) + "?subject=" + encodeURIComponent(subject || C.businessName) + "&body=" + msg + '">Email</a>');
    return b.length ? '<div class="contact-acts">' + b.join("") + "</div>" : '<p class="empty">No phone or email saved.</p>';
  }
  function opt(v, cur, label) { return '<option value="' + esc(v) + '"' + (String(v) === String(cur == null ? "" : cur) ? " selected" : "") + ">" + esc(label || v) + "</option>"; }
  function field(label, name, value, o) {
    o = o || {};
    var id = "f_" + name, input;
    if (o.type === "select") input = '<select id="' + id + '" name="' + name + '">' + o.options.map(function (x) { return Array.isArray(x) ? opt(x[0], value, x[1]) : opt(x, value); }).join("") + "</select>";
    else if (o.type === "textarea") input = '<textarea id="' + id + '" name="' + name + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + ">" + esc(value) + "</textarea>";
    else input = '<input id="' + id + '" name="' + name + '" type="' + (o.type || "text") + '" value="' + esc(value) + '"' + (o.required ? " required" : "") + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + (o.step ? ' step="' + o.step + '"' : "") + ">";
    return '<div class="field' + (o.full ? " full" : "") + '"><label for="' + id + '">' + esc(label) + (o.hint ? ' <span class="hint">' + esc(o.hint) + "</span>" : "") + "</label>" + input + "</div>";
  }
  function formData(form) {
    var o = {};
    new FormData(form).forEach(function (v, k) { o[k] = typeof v === "string" ? v.trim() : v; });
    return o;
  }
  function nullify(o) { Object.keys(o).forEach(function (k) { if (o[k] === "") o[k] = null; }); return o; }

  var LABELS = {
    owner_name: "Owner", phone: "Mobile", email: "Email", service: "Service", start_date: "Drop-off", end_date: "Pick-up",
    suburb: "Suburb", emergency_contact: "Emergency contact", pet_name: "Pet", nicknames: "Nicknames", species: "Species",
    breed: "Breed", age: "Age", sex: "Sex", desexed: "Desexed", three_words: "In three words", superpower: "Superpower",
    energy_level: "Energy (1 to 5)", cuddle_level: "Cuddles (1 to 5)", with_dogs: "With dogs", with_cats: "With cats", with_kids: "With kids",
    fears: "Nervous of", calming: "What calms them", wake_time: "Wakes", bed_time: "Bedtime", meals: "Meals",
    treats_and_allergies: "Treats / must not eat", walks: "Walks", sleep_spot: "Sleeps", toilet_routine: "Toilet",
    favourite_toys: "Favourite toys", scratch_spot: "Scratch spot", tricks: "Tricks", quirks: "Quirks",
    vaccinated: "Vaccinated", parasite_treatment: "Flea/worm current", medications: "Medication / health", behaviour: "Behaviour",
    vet_name: "Vet", vet_phone: "Vet phone", microchip: "Microchip", update_channel: "Updates by", share_profile: "Share profile",
    vet_consent: "Vet consent", anything_else: "Anything else",
  };
  function answersHtml(a) {
    var keys = Object.keys(a || {});
    if (!keys.length) return '<p class="empty">No questionnaire answers.</p>';
    return '<dl class="kv">' + keys.map(function (k) {
      var v = a[k]; return "<dt>" + esc(LABELS[k] || k.replace(/_/g, " ")) + "</dt><dd>" + esc(Array.isArray(v) ? v.join(", ") : v) + "</dd>";
    }).join("") + "</dl>";
  }

  // ---------- Pricing ----------
  function units(stay) {
    if (!stay.start_date || !stay.end_date) return 0;
    var d = daysBetween(stay.start_date, stay.end_date);
    return /overnight/i.test(stay.service || "Overnight") ? Math.max(d, 1) : d + 1;
  }
  function estimate(stay, pet) {
    var R = C.rates || {}, n = units(stay);
    if (!n) return null;
    if (/day care/i.test(stay.service || "")) return n * (R.dayCare || 40);
    if (/drop-in/i.test(stay.service || "")) return n * (R.dropIn || 25);
    var rate = /dog/i.test((pet && pet.species) || "") ? R.dogNight || 50 : /cat/i.test((pet && pet.species) || "") ? R.catNight || 35 : R.otherNight || 35;
    return n * rate;
  }

  // ---------- Stays ----------
  function stayState(s) {
    var t = today();
    if (s.status === "confirmed" && s.start_date && s.start_date <= t && (!s.end_date || s.end_date >= t)) return "in_care";
    return s.status;
  }
  function inCare() { return S.stays.filter(function (s) { return stayState(s) === "in_care"; }); }
  function stayTitle(s) { var p = byId("pets", s.pet_id); return (p ? p.name : "Pet") + ", " + fmtDate(s.start_date) + " to " + fmtDate(s.end_date); }

  // ---------- Reminders ----------
  function isDone(key) { return S.reminders.some(function (r) { return r.key === key && r.done; }); }
  function computeReminders() {
    var t = today(), out = [];
    function add(r) { if (!r.key || !isDone(r.key)) out.push(r); }

    S.enquiries.filter(function (e) { return e.status === "new"; }).forEach(function (e) {
      var old = Date.now() - new Date(e.created_at) > 12 * 36e5;
      add({ key: null, enquiry: e.id, level: old ? "alert" : "", sort: 0,
        title: "Reply to " + (e.name || "new enquiry") + (e.pet_name ? " about " + e.pet_name : ""),
        sub: (e.kind === "booking" ? "Stay request" : e.kind === "adoption" ? "Adoption enquiry" : "Enquiry") + ", received " + fmtWhen(e.created_at) + (old ? ". Over 12 hours old!" : ""),
        actions: [["Open", "#/inbox/" + e.id]] });
    });

    S.stays.forEach(function (s) {
      var p = byId("pets", s.pet_id) || {}, c = byId("clients", s.client_id) || {}, st = stayState(s);
      var a = p.profile || {};
      if (st === "in_care") {
        var hasUpdate = S.stay_updates.some(function (u) { return u.pet_id === s.pet_id && ymd(new Date(u.created_at)) === t; });
        if (!hasUpdate) add({ key: "photo:" + s.id + ":" + t, sort: 2, title: "Send " + p.name + "'s photo update to " + first(c.name),
          sub: "Owner prefers " + (a.update_channel || "a message") + ". Add the photo in the stay, then send.", actions: [["Add update", "#/stays/" + s.id]] });
        if (a.medications) add({ key: "meds:" + s.id + ":" + t, level: "alert", sort: 1, title: "Give " + p.name + " their medication", sub: a.medications, actions: [["Care plan", "#/stays/" + s.id]] });
        if (s.end_date === t) add({ key: "out:" + s.id, sort: 1, title: p.name + " goes home today", sub: "Pack their things, send a last photo, then mark the stay completed.", actions: [["Open stay", "#/stays/" + s.id]] });
        else if (s.end_date === addDays(t, 1)) add({ key: "leave:" + s.id, sort: 3, title: "Confirm tomorrow's pick-up time for " + p.name, sub: "With " + (c.name || "the owner"), actions: [["Open stay", "#/stays/" + s.id]] });
      }
      if (s.status === "confirmed" && s.start_date && s.start_date > t && s.start_date <= addDays(t, 2)) {
        add({ key: "arrive:" + s.id, sort: 2, title: "Get ready: " + p.name + " arrives " + (s.start_date === addDays(t, 1) ? "tomorrow" : fmtDate(s.start_date)),
          sub: "Read the care plan, set up their space and confirm drop-off time with " + first(c.name) + ".", actions: [["Care plan", "#/stays/" + s.id]] });
      }
      if (s.status === "confirmed" && s.start_date >= t && a.vaccinated && a.vaccinated !== "Yes") {
        add({ key: "vacc:" + s.id, level: "alert", sort: 1, title: "Get " + p.name + "'s vaccination certificate", sub: "Questionnaire says: " + a.vaccinated, actions: [["Open stay", "#/stays/" + s.id]] });
      }
      if (!s.paid && (s.status === "confirmed" || s.status === "in_care" || s.status === "completed") && s.start_date && s.start_date <= addDays(t, 2)) {
        add({ key: null, payStay: s.id, sort: 3, title: "Collect payment for " + p.name + (s.price_total ? " (" + money(s.price_total) + ")" : ""),
          sub: s.payment_link ? "Payment link ready to send." : "Add a Square payment link to the stay, then send it.", actions: [["Open stay", "#/stays/" + s.id]] });
      }
    });

    S.pets.filter(function (p) { return p.status === "adoptable"; }).forEach(function (p) {
      var upd = (p.updated_at || p.created_at || "").slice(0, 10);
      if (upd && daysBetween(upd, t) >= 14) add({ key: null, freshPet: p.id, sort: 5, title: "Is " + p.name + " still available?",
        sub: "Profile not updated for " + daysBetween(upd, t) + " days. Check with " + (p.shelter_name || "the shelter") + ".", actions: [["Edit profile", "#/pets/" + p.id]] });
    });
    if (S.pets.some(function (p) { return p.sample; })) add({ key: "samples", sort: 6, title: "Replace the sample pets with real ones", sub: "Biscuit, Mittens, Rex and Luna are examples.", actions: [["Pets", "#/pets"]] });

    S.shelters.forEach(function (sh) {
      if (sh.next_step_date && sh.next_step_date <= t && sh.status !== "partner" && sh.status !== "not_interested")
        add({ key: "shelter:" + sh.id + ":" + sh.next_step_date, sort: 4, title: "Follow up: " + sh.name, sub: sh.next_step || "Planned follow-up", actions: [["Open", "#/shelters/" + sh.id]] });
    });

    S.reminders.filter(function (r) { return r.title && !r.done; }).forEach(function (r) {
      out.push({ todo: r.id, sort: r.due_date && r.due_date <= t ? 1 : 7, level: r.due_date && r.due_date < t ? "alert" : "",
        title: r.title, sub: r.due_date ? "Due " + fmtDate(r.due_date) : "Your to-do", actions: [] });
    });
    return out.sort(function (a, b) { return a.sort - b.sort; });
  }
  function reminderList(list) {
    if (!list.length) return '<p class="empty">All done. Nice work!</p>';
    return '<ul class="list">' + list.map(function (r, i) {
      return '<li class="rem ' + (r.level || "") + '"><input type="checkbox" data-rem="' + i + '" aria-label="Mark done"><div class="grow"><b>' + esc(r.title) + '</b><div class="sub">' + esc(r.sub || "") + "</div>" +
        (r.actions.length ? '<div class="acts">' + r.actions.map(function (a) { return '<a class="btn sm ghost" href="' + esc(a[1]) + '">' + esc(a[0]) + "</a>"; }).join("") + "</div>" : "") + "</div></li>";
    }).join("") + "</ul>";
  }
  function bindReminders(list) {
    app.querySelectorAll("[data-rem]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var r = list[+cb.getAttribute("data-rem")], p;
        if (r.enquiry) p = DB.update("enquiries", r.enquiry, { status: "replied", handled_at: new Date().toISOString() });
        else if (r.payStay) p = DB.update("stays", r.payStay, { paid: true });
        else if (r.freshPet) p = DB.update("pets", r.freshPet, {});
        else if (r.todo) p = DB.update("reminders", r.todo, { done: true });
        else p = DB.setReminder(r.key, true);
        cb.closest("li").style.opacity = 0.4;
        p.then(refresh).then(function () { toast("Done"); }).catch(fail);
      });
    });
  }

  // ---------- Data ----------
  function loadAll() {
    return Promise.all(TABLES.map(function (t) { return DB.list(t).catch(function () { return []; }); })).then(function (r) {
      TABLES.forEach(function (t, i) { S[t] = r[i] || []; });
    });
  }
  function refresh() { return loadAll().then(route); }

  // ---------- Shell ----------
  var NAV = [["dashboard", "Today"], ["inbox", "Inbox"], ["stays", "Stays"], ["pets", "Pets"], ["clients", "Clients"], ["shelters", "Shelters"], ["emergency", "Emergency"], ["settings", "Settings"]];
  function shell(active, html) {
    var newCount = S.enquiries.filter(function (e) { return e.status === "new"; }).length;
    var care = inCare().length;
    app.innerHTML =
      '<div class="topbar"><strong>Home for Paws HQ</strong><button id="menu">Menu</button></div>' +
      '<div class="hq"><aside class="side" id="side"><div class="logo">' + PAW.replace("<svg", '<svg style="width:26px;height:26px;color:var(--brand)"') + " HQ<small>" + esc(C.businessName) + "</small></div><nav>" +
      NAV.map(function (n) {
        var c = n[0] === "inbox" && newCount ? newCount : n[0] === "stays" && care ? care : "";
        return '<a href="#/' + n[0] + '" class="' + (n[0] === active ? "on" : "") + '">' + n[1] + (c ? '<span class="count">' + c + "</span>" : "") + "</a>";
      }).join("") +
      '</nav><div class="foot"><a href="../index.html" target="_blank">View website</a>' + (DB.live ? '<br><button id="signout">Sign out</button>' : "<br>Demo mode") + "</div></aside>" +
      '<main class="main">' + (DB.live ? "" : '<div class="banner"><b>Demo mode.</b> Changes are saved only in this browser. Connect the database to use HQ for real: see <a href="#/settings">Settings</a>.</div>') + html + "</main></div>";
    var side = document.getElementById("side");
    document.getElementById("menu").onclick = function () { side.classList.toggle("open"); };
    side.addEventListener("click", function (e) { if (e.target.tagName === "A") side.classList.remove("open"); });
    var so = document.getElementById("signout");
    if (so) so.onclick = function () { DB.auth.signOut().then(function () { location.reload(); }); };
    window.scrollTo(0, 0);
  }

  // ---------- Pages ----------
  function pageDashboard() {
    var t = today();
    var rem = computeReminders();
    var care = inCare();
    var arriving = S.stays.filter(function (s) { return s.status === "confirmed" && s.start_date > t && s.start_date <= addDays(t, 7); });
    var unpaid = S.stays.filter(function (s) { return !s.paid && s.status !== "cancelled" && s.status !== "requested"; });
    var newE = S.enquiries.filter(function (e) { return e.status === "new"; });
    var adoptable = S.pets.filter(function (p) { return p.status === "adoptable" && p.visibility === "public"; });
    var hour = new Date().getHours();
    shell("dashboard",
      '<div class="page-head"><div><h1>Good ' + (hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening") + "</h1><p>" + esc(new Date().toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" })) + "</p></div></div>" +
      '<div class="tiles">' +
      '<a class="tile ' + (newE.length ? "hot" : "") + '" href="#/inbox"><b>' + newE.length + "</b><span>New enquiries</span></a>" +
      '<a class="tile" href="#/stays"><b>' + care.length + "</b><span>Pets in care now</span></a>" +
      '<a class="tile" href="#/stays"><b>' + arriving.length + "</b><span>Arriving in 7 days</span></a>" +
      '<a class="tile ' + (unpaid.length ? "hot" : "") + '" href="#/stays"><b>' + unpaid.length + "</b><span>Unpaid stays</span></a>" +
      '<a class="tile" href="#/pets"><b>' + adoptable.length + "</b><span>Pets up for adoption</span></a></div>" +
      '<div class="cols"><div><div class="panel"><h2>To do today <span class="muted" style="font-size:.85rem;font-family:Nunito">' + rem.length + " open</span></h2>" + reminderList(rem) +
      '<form id="todo" class="toolbar" style="margin:14px 0 0;display:flex"><input name="title" placeholder="Add your own to-do" required style="flex:1;min-width:160px"><input name="due_date" type="date" value="' + t + '"><button class="btn sm">Add</button></form></div></div>' +
      '<div><div class="panel"><h2>In care now <a href="#/stays">All stays</a></h2>' +
      (care.length ? '<ul class="list">' + care.map(function (s) {
        var p = byId("pets", s.pet_id) || {}, c = byId("clients", s.client_id) || {};
        return "<li>" + thumb(p) + '<div class="grow"><a class="row-link" href="#/stays/' + s.id + '"><b>' + esc(p.name) + '</b><div class="sub">' + esc(c.name || "") + " · home " + esc(fmtDate(s.end_date)) + "</div></a></div></li>";
      }).join("") + "</ul>" : '<p class="empty">No pets in care right now.</p>') + "</div>" +
      '<div class="panel"><h2>Latest enquiries <a href="#/inbox">Inbox</a></h2>' +
      (S.enquiries.length ? '<ul class="list">' + S.enquiries.slice(0, 5).map(function (e) {
        return '<li><div class="grow"><a class="row-link" href="#/inbox/' + e.id + '"><b>' + esc(e.name || "No name") + "</b> " + pill(e.status) + '<div class="sub">' + esc(kindLabel(e.kind)) + (e.pet_name ? " · " + esc(e.pet_name) : "") + " · " + esc(fmtWhen(e.created_at)) + "</div></a></div></li>";
      }).join("") + "</ul>" : '<p class="empty">No enquiries yet. They appear here as soon as someone fills in a form on the website.</p>') + "</div></div></div>");
    bindReminders(rem);
    document.getElementById("todo").onsubmit = function (e) {
      e.preventDefault(); var d = nullify(formData(e.target));
      DB.insert("reminders", { title: d.title, due_date: d.due_date, done: false }).then(refresh).catch(fail);
    };
  }

  function kindLabel(k) { return k === "booking" ? "Stay request" : k === "adoption" ? "Adoption enquiry" : "Enquiry"; }

  var inboxFilter = "new";
  function pageInbox() {
    var list = S.enquiries.filter(function (e) { return inboxFilter === "all" || e.status === inboxFilter; });
    var counts = {}; S.enquiries.forEach(function (e) { counts[e.status] = (counts[e.status] || 0) + 1; });
    shell("inbox",
      '<div class="page-head"><div><h1>Inbox</h1><p>Every form on the website lands here: stay requests with the full questionnaire, and adoption enquiries.</p></div></div>' +
      '<div class="toolbar"><div class="seg" id="seg">' + [["new", "New"], ["replied", "Replied"], ["booked", "Booked"], ["closed", "Closed"], ["all", "All"]].map(function (f) {
        return '<button data-f="' + f[0] + '" class="' + (inboxFilter === f[0] ? "on" : "") + '">' + f[1] + (f[0] !== "all" && counts[f[0]] ? " (" + counts[f[0]] + ")" : "") + "</button>";
      }).join("") + "</div></div>" +
      (list.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>From</th><th>Type</th><th>Pet</th><th>Dates</th><th>Received</th><th>Status</th></tr></thead><tbody>' +
        list.map(function (e) {
          var a = e.answers || {};
          return '<tr class="click" data-go="#/inbox/' + e.id + '"><td><b>' + esc(e.name || "No name") + '</b><div class="muted" style="font-size:.85rem">' + esc(e.phone || e.email || "") + "</div></td><td>" + esc(kindLabel(e.kind)) + "</td><td>" + esc(e.pet_name || "") + "</td><td>" + esc(a.start_date ? fmtDate(a.start_date) + " to " + fmtDate(a.end_date) : "") + "</td><td>" + esc(fmtWhen(e.created_at)) + "</td><td>" + pill(e.status) + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<div class="panel"><p class="empty">Nothing here.</p></div>'));
    app.querySelectorAll("#seg button").forEach(function (b) { b.onclick = function () { inboxFilter = b.getAttribute("data-f"); pageInbox(); }; });
    bindRows();
  }
  function bindRows() { app.querySelectorAll("[data-go]").forEach(function (r) { r.onclick = function () { location.hash = r.getAttribute("data-go"); }; }); }

  function replyTemplate(e) {
    var a = e.answers || {}, biz = C.businessName || "Home for Paws";
    if (e.kind === "adoption") return "Hi " + first(e.name) + ", thanks so much for your interest in " + (e.pet_name || "our pet") + "! I'd love to tell you more and put you in touch with the shelter. When is a good time for a quick chat? " + biz;
    if (e.kind === "booking") return "Hi " + first(e.name) + ", thanks for telling us all about " + (a.pet_name || "your pet") + "! " +
      (a.start_date ? "We'd love to look after them from " + fmtDate(a.start_date) + " to " + fmtDate(a.end_date) + ". " : "") +
      "When suits you for a free meet-and-greet at our place? " + biz;
    return "Hi " + first(e.name) + ", thanks for getting in touch! " + biz;
  }

  function pageEnquiry(id) {
    var e = byId("enquiries", id);
    if (!e) return notFound("inbox");
    var a = e.answers || {};
    var stay = S.stays.find(function (s) { return s.enquiry_id === e.id; });
    shell("inbox",
      '<div class="page-head"><div><p><a href="#/inbox">Inbox</a></p><h1>' + esc(e.name || "Enquiry") + " " + pill(e.status) + "</h1><p>" + esc(kindLabel(e.kind)) + (e.pet_name ? " for " + esc(e.pet_name) : "") + ", received " + esc(new Date(e.created_at).toLocaleString("en-AU")) + "</p></div></div>" +
      '<div class="cols"><div>' +
      '<div class="panel"><h2>Reply</h2><dl class="kv">' +
      (e.phone ? "<dt>Mobile</dt><dd>" + esc(e.phone) + "</dd>" : "") + (e.email ? "<dt>Email</dt><dd>" + esc(e.email) + "</dd>" : "") +
      (a.start_date ? "<dt>Dates</dt><dd>" + esc(fmtDate(a.start_date) + " to " + fmtDate(a.end_date)) + (a.service ? " (" + esc(a.service) + ")" : "") + "</dd>" : "") +
      (e.message ? "<dt>Message</dt><dd>" + esc(e.message) + "</dd>" : "") + "</dl>" +
      '<p class="hint" style="margin:12px 0 0">Buttons open your phone or email with a friendly reply already written. Tick "Replied" after you send it.</p>' +
      contactButtons(e, replyTemplate(e), "Re: " + (e.pet_name || C.businessName)) + "</div>" +
      (e.kind === "booking" ? '<div class="panel"><h2>Questionnaire</h2>' + answersHtml(a) + "</div>" : "") +
      (e.kind === "adoption" && e.pet_id && byId("pets", e.pet_id) ? '<div class="panel"><h2>Pet</h2><a href="#/pets/' + e.pet_id + '">' + esc(byId("pets", e.pet_id).name) + "'s profile</a></div>" : "") +
      '</div><div><div class="panel"><h2>Manage</h2><form id="ef"><div class="field"><label for="f_status">Status</label><select id="f_status" name="status">' +
      [["new", "New"], ["replied", "Replied"], ["booked", "Booked"], ["closed", "Closed"]].map(function (s) { return opt(s[0], e.status, s[1]); }).join("") + "</select></div>" +
      field("Private notes", "notes", e.notes, { type: "textarea", ph: "Call notes, follow-ups..." }) +
      '<div class="actions-bar"><button class="btn sm">Save</button><button type="button" class="btn sm danger" id="del">Delete</button></div></form></div>' +
      (e.kind === "booking" ? '<div class="panel"><h2>Booking</h2>' + (stay ? '<p>Booked. <a href="#/stays/' + stay.id + '">Open the stay and care plan</a></p>'
        : "<p>Happy to take this stay? This creates the owner, a guest profile for " + esc(a.pet_name || "the pet") + ", the stay with a price estimate, and a care plan from the questionnaire.</p><button class=\"btn\" id=\"convert\">Accept and create stay</button>") + "</div>" : "") +
      "</div></div>");
    document.getElementById("ef").onsubmit = function (ev) {
      ev.preventDefault(); var d = formData(ev.target);
      DB.update("enquiries", e.id, { status: d.status, notes: d.notes || null, handled_at: d.status === "new" ? null : e.handled_at || new Date().toISOString() })
        .then(refresh).then(function () { toast("Saved"); }).catch(fail);
    };
    document.getElementById("del").onclick = function () {
      if (!confirm("Delete this enquiry? This cannot be undone.")) return;
      DB.remove("enquiries", e.id).then(function () { location.hash = "#/inbox"; return refresh(); }).catch(fail);
    };
    var cv = document.getElementById("convert");
    if (cv) cv.onclick = function () { cv.disabled = true; convertEnquiry(e).catch(function (x) { cv.disabled = false; fail(x); }); };
  }

  function goodWith(v) { if (!v) return null; if (/Loves|Fine/.test(v)) return true; if (/Prefers not|chase/.test(v)) return false; return null; }
  function convertEnquiry(e) {
    var a = e.answers || {};
    var existing = S.clients.find(function (c) { return e.email && c.email && c.email.toLowerCase() === e.email.toLowerCase(); });
    var clientP = existing ? Promise.resolve(existing) : DB.insert("clients", nullify({
      name: e.name || "Unknown", email: e.email || "", phone: e.phone || "", suburb: a.suburb || "", emergency_contact: a.emergency_contact || "",
    }));
    return clientP.then(function (client) {
      var traits = String(a.three_words || "").split(/[,;]+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4);
      var pet = {
        status: "guest", visibility: a.share_profile === "Yes" ? "public" : "unlisted", name: a.pet_name || "Guest",
        species: a.species || "Dog", breed: a.breed || null, age: a.age || null, sex: a.sex || null, size: null,
        colour: COLOURS[Math.floor(Math.random() * COLOURS.length)], photo_url: null, traits: traits,
        good_with: { kids: goodWith(a.with_kids), dogs: goodWith(a.with_dogs), cats: goodWith(a.with_cats) },
        story: (a.pet_name || "This pet") + " is staying with us" + (a.superpower ? ". Their superpower: " + a.superpower : "") + ".",
        needs: a.medications || null, client_id: client.id, profile: a, sample: false,
      };
      return DB.insert("pets", pet).then(function (p) {
        var stay = { pet_id: p.id, client_id: client.id, enquiry_id: e.id, service: a.service || "Overnight stay",
          start_date: a.start_date || null, end_date: a.end_date || null, status: "confirmed", paid: false };
        stay.price_total = estimate(stay, p);
        stay.care_plan = CP.build(a, p, stay);
        return DB.insert("stays", stay).then(function (s) {
          return DB.update("enquiries", e.id, { status: "booked", pet_id: p.id, handled_at: e.handled_at || new Date().toISOString() }).then(function () { return s; });
        });
      });
    }).then(function (s) { toast("Stay created with care plan"); location.hash = "#/stays/" + s.id; return loadAll().then(route); });
  }

  var stayFilter = "current";
  function pageStays() {
    var t = today();
    var list = S.stays.filter(function (s) {
      var st = stayState(s);
      if (stayFilter === "current") return st === "in_care" || st === "confirmed" || st === "requested";
      if (stayFilter === "past") return st === "completed";
      if (stayFilter === "cancelled") return st === "cancelled";
      return true;
    }).sort(function (a, b) { return (a.start_date || "") < (b.start_date || "") ? (stayFilter === "past" ? 1 : -1) : (stayFilter === "past" ? -1 : 1); });
    shell("stays",
      '<div class="page-head"><div><h1>Stays</h1><p>Bookings, care plans, owner updates and payments.</p></div><a class="btn" href="#/stays/new">New stay</a></div>' +
      '<div class="toolbar"><div class="seg" id="seg">' + [["current", "Upcoming and in care"], ["past", "Completed"], ["cancelled", "Cancelled"], ["all", "All"]].map(function (f) {
        return '<button data-f="' + f[0] + '" class="' + (stayFilter === f[0] ? "on" : "") + '">' + f[1] + "</button>"; }).join("") + "</div></div>" +
      (list.length ? '<div class="table-wrap"><table class="data"><thead><tr><th></th><th>Pet</th><th>Owner</th><th>Dates</th><th>Service</th><th>Status</th><th>Payment</th></tr></thead><tbody>' +
        list.map(function (s) {
          var p = byId("pets", s.pet_id) || {}, c = byId("clients", s.client_id) || {};
          return '<tr class="click" data-go="#/stays/' + s.id + '"><td>' + thumb(p) + "</td><td><b>" + esc(p.name) + "</b></td><td>" + esc(c.name || "") + "</td><td>" + esc(fmtDate(s.start_date) + " to " + fmtDate(s.end_date)) + "</td><td>" + esc(s.service || "") + "</td><td>" + pill(stayState(s)) + "</td><td>" + (s.paid ? pill("paid", "Paid") : pill("unpaid", "Unpaid " + money(s.price_total))) + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<div class="panel"><p class="empty">No stays here yet. Accept a stay request in the Inbox, or add one with "New stay".</p></div>'));
    app.querySelectorAll("#seg button").forEach(function (b) { b.onclick = function () { stayFilter = b.getAttribute("data-f"); pageStays(); }; });
    bindRows();
  }

  function pageStayNew() {
    var guests = S.pets.filter(function (p) { return p.status === "guest"; });
    shell("stays",
      '<div class="page-head"><div><p><a href="#/stays">Stays</a></p><h1>New stay</h1><p>For bookings that came by phone or in person. The pet needs a guest profile first.</p></div></div>' +
      '<div class="panel"><form id="sf"><div class="form-grid">' +
      field("Pet", "pet_id", "", { type: "select", options: [["", "Choose a guest pet"]].concat(guests.map(function (p) { return [p.id, p.name]; })), hint: "" }) +
      field("Owner", "client_id", "", { type: "select", options: [["", "Choose an owner"]].concat(S.clients.map(function (c) { return [c.id, c.name]; })) }) +
      field("Service", "service", "Overnight stay", { type: "select", options: ["Overnight stay", "Day care", "Drop-in visits"] }) +
      field("Drop-off", "start_date", today(), { type: "date" }) + field("Pick-up", "end_date", addDays(today(), 3), { type: "date" }) +
      field("Status", "status", "confirmed", { type: "select", options: [["requested", "Requested"], ["confirmed", "Confirmed"]] }) +
      '</div><p class="hint">No guest profile yet? <a href="#/pets/new">Add the pet</a> (status "Sitting guest") and <a href="#/clients/new">the owner</a> first.</p><div><button class="btn">Create stay</button></div></form></div>');
    document.getElementById("sf").onsubmit = function (ev) {
      ev.preventDefault(); var d = nullify(formData(ev.target));
      if (!d.pet_id) return toast("Choose a pet");
      var p = byId("pets", d.pet_id);
      d.client_id = d.client_id || (p && p.client_id) || null;
      d.paid = false; d.price_total = estimate(d, p);
      d.care_plan = CP.build((p && p.profile) || {}, p, d);
      DB.insert("stays", d).then(function (s) { location.hash = "#/stays/" + s.id; return refresh(); }).catch(fail);
    };
  }

  function planHtml(plan, stay) {
    if (!plan || !plan.sections) return '<p class="empty">No care plan yet.</p>';
    var t = today();
    return '<div class="plan">' + plan.sections.map(function (s) {
      return '<section class="' + (s.level === "alert" ? "alert" : "") + '"><h3>' + esc(s.title) + "</h3><ul>" + s.items.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("") + "</ul></section>";
    }).join("") +
      (plan.tasks && plan.tasks.length ? '<section><h3>Daily checklist (' + esc(fmtDate(t)) + ')</h3><ul class="tasks">' + plan.tasks.map(function (k, i) {
        var key = "task:" + stay.id + ":" + t + ":" + i;
        return '<li><label><input type="checkbox" data-task="' + esc(key) + '"' + (isDone(key) ? " checked" : "") + "> <span><b>" + esc(k.time) + ":</b> " + esc(k.text) + "</span></label></li>";
      }).join("") + "</ul></section>" : "") + '<p class="hint">Generated ' + esc(fmtWhen(plan.generatedAt)) + " from the questionnaire.</p></div>";
  }

  function pageStay(id) {
    var s = byId("stays", id);
    if (!s) return notFound("stays");
    var p = byId("pets", s.pet_id) || {}, c = byId("clients", s.client_id) || null, a = p.profile || {};
    var ups = S.stay_updates.filter(function (u) { return u.stay_id === s.id || (!u.stay_id && u.pet_id === s.pet_id); });
    var lastUp = ups[0];
    var upMsg = "Hi " + first(c && c.name) + ", today's update from " + p.name + ": " + ((lastUp && lastUp.note) || "all good and happy!") + " See the photos: " + petLink(p);
    var payMsg = "Hi " + first(c && c.name) + ", here's the payment link for " + p.name + "'s stay (" + fmtDate(s.start_date) + " to " + fmtDate(s.end_date) + ")" + (s.price_total ? ", " + money(s.price_total) : "") + ": " + (s.payment_link || "[add Square link]") + " Thank you!";
    var est = estimate(s, p);
    shell("stays",
      '<div class="page-head"><div><p><a href="#/stays">Stays</a></p><h1>' + esc(stayTitle(s)) + " " + pill(stayState(s)) + "</h1><p>" + esc(s.service || "") + " · " + units(s) + (/overnight/i.test(s.service || "Overnight") ? " nights" : " days") + "</p></div>" +
      '<div class="toolbar no-print"><a class="btn ghost sm" href="#/pets/' + esc(p.id) + '">Pet profile</a><button class="btn ghost sm" onclick="window.print()">Print care plan</button></div></div>' +
      '<div class="cols"><div>' +
      '<div class="panel"><h2>Care plan <button class="btn sm ghost no-print" id="regen">Regenerate</button></h2>' + planHtml(s.care_plan, s) + "</div>" +
      '<div class="panel no-print" id="updates"><h2>Owner updates</h2><form id="uf"><div class="form-grid">' +
      '<div class="field"><label for="u_photo">Photo</label><input id="u_photo" name="photo" type="file" accept="image/*"></div>' +
      field("What did they get up to?", "note", "", { type: "textarea", full: true, ph: "Big walk at the park, ate all their dinner, now snoring on the couch." }) +
      '</div><button class="btn sm">Save update</button></form>' +
      '<p class="hint" style="margin-top:14px">Then send it to ' + esc(c ? first(c.name) : "the owner") + ". The message links to " + esc(p.name) + "'s profile page, where all photos show.</p>" + contactButtons(c, upMsg, p.name + "'s update") +
      '<div class="updates-log" style="margin-top:14px">' + (ups.length ? '<ul class="list">' + ups.map(function (u) {
        return '<li><div class="grow"><div class="sub">' + esc(new Date(u.created_at).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })) + "</div>" + (u.photo_url ? '<img src="' + esc(u.photo_url) + '" alt="">' : "") + (u.note ? "<p>" + esc(u.note) + "</p>" : "") + '</div><button class="btn sm danger" data-delup="' + u.id + '">Delete</button></li>';
      }).join("") + "</ul>" : '<p class="empty">No updates yet.</p>') + "</div></div>" +
      '</div><div class="no-print">' +
      '<div class="panel"><h2>Booking and payment</h2><form id="bf"><div class="form-grid">' +
      field("Status", "status", s.status, { type: "select", options: [["requested", "Requested"], ["confirmed", "Confirmed"], ["in_care", "In care"], ["completed", "Completed"], ["cancelled", "Cancelled"]] }) +
      field("Service", "service", s.service, { type: "select", options: ["Overnight stay", "Day care", "Drop-in visits"] }) +
      field("Drop-off", "start_date", s.start_date, { type: "date" }) + field("Pick-up", "end_date", s.end_date, { type: "date" }) +
      field("Price (AUD)", "price_total", s.price_total, { type: "number", step: "0.01", hint: est ? "estimate " + money(est) : "" }) +
      field("Paid?", "paid", s.paid ? "yes" : "no", { type: "select", options: [["no", "Not yet"], ["yes", "Paid"]] }) +
      field("Square payment link", "payment_link", s.payment_link, { full: true, ph: "https://square.link/u/..." }) +
      field("Notes", "notes", s.notes, { type: "textarea", full: true }) +
      '</div><div class="actions-bar"><button class="btn sm">Save</button><button type="button" class="btn sm danger" id="dels">Delete stay</button></div></form>' +
      (!s.paid ? '<p class="hint" style="margin-top:14px">Send the payment link:</p>' + contactButtons(c, payMsg, "Payment for " + p.name + "'s stay") : "") + "</div>" +
      '<div class="panel"><h2>Owner</h2>' + (c ? '<dl class="kv"><dt>Name</dt><dd><a href="#/clients/' + c.id + '">' + esc(c.name) + "</a></dd>" + (c.phone ? "<dt>Mobile</dt><dd>" + esc(c.phone) + "</dd>" : "") + (c.email ? "<dt>Email</dt><dd>" + esc(c.email) + "</dd>" : "") + (c.emergency_contact ? "<dt>Emergency</dt><dd>" + esc(c.emergency_contact) + "</dd>" : "") + "</dl>" + contactButtons(c, "Hi " + first(c.name) + ", ", C.businessName) : '<p class="empty">No owner linked.</p>') + "</div>" +
      '<div class="panel"><h2>Questionnaire</h2><details><summary>Show all answers</summary><div style="margin-top:10px">' + answersHtml(a) + "</div></details></div>" +
      "</div></div>");
    document.getElementById("bf").onsubmit = function (ev) {
      ev.preventDefault(); var d = nullify(formData(ev.target));
      d.paid = d.paid === "yes"; d.price_total = d.price_total == null ? null : Number(d.price_total);
      DB.update("stays", s.id, d).then(refresh).then(function () { toast("Saved"); }).catch(fail);
    };
    document.getElementById("dels").onclick = function () {
      if (!confirm("Delete this stay and its care plan? Updates stay on the pet's profile.")) return;
      DB.remove("stays", s.id).then(function () { location.hash = "#/stays"; return refresh(); }).catch(fail);
    };
    document.getElementById("regen").onclick = function () {
      DB.update("stays", s.id, { care_plan: CP.build(a, p, s) }).then(refresh).then(function () { toast("Care plan rebuilt"); }).catch(fail);
    };
    app.querySelectorAll("[data-task]").forEach(function (cb) {
      cb.onchange = function () { DB.setReminder(cb.getAttribute("data-task"), cb.checked).then(loadAll).catch(fail); };
    });
    document.getElementById("uf").onsubmit = function (ev) {
      ev.preventDefault();
      var btn = ev.target.querySelector("button"); btn.disabled = true;
      var file = ev.target.photo.files[0], note = ev.target.note.value.trim();
      if (!file && !note) { btn.disabled = false; return toast("Add a photo or a note"); }
      (file ? DB.uploadPhoto(file) : Promise.resolve(null)).then(function (url) {
        return DB.insert("stay_updates", { stay_id: s.id, pet_id: s.pet_id, note: note || null, photo_url: url });
      }).then(function () {
        return DB.setReminder("photo:" + s.id + ":" + today(), true);
      }).then(refresh).then(function () { toast("Update saved. Now send it to the owner."); var u = document.getElementById("updates"); if (u) u.scrollIntoView(); })
        .catch(function (x) { btn.disabled = false; fail(x); });
    };
    app.querySelectorAll("[data-delup]").forEach(function (b) {
      b.onclick = function () { if (confirm("Delete this update?")) DB.remove("stay_updates", b.getAttribute("data-delup")).then(refresh).catch(fail); };
    });
  }

  var petFilter = "all";
  function pageTPets() {
    var list = S.pets.filter(function (p) { return petFilter === "all" ? p.status !== "archived" : p.status === petFilter; });
    shell("pets",
      '<div class="page-head"><div><h1>Pets</h1><p>Every profile on the website: shelter pets looking for a home and sitting guests.</p></div><a class="btn" href="#/pets/new">New pet profile</a></div>' +
      '<div class="toolbar"><div class="seg" id="seg">' + [["all", "Active"], ["adoptable", "For adoption"], ["guest", "Sitting guests"], ["adopted", "Adopted"], ["archived", "Archived"]].map(function (f) {
        return '<button data-f="' + f[0] + '" class="' + (petFilter === f[0] ? "on" : "") + '">' + f[1] + "</button>"; }).join("") + "</div></div>" +
      (list.length ? '<div class="table-wrap"><table class="data"><thead><tr><th></th><th>Name</th><th>Species</th><th>Status</th><th>On website</th><th>Shelter / owner</th><th>Updated</th></tr></thead><tbody>' +
        list.map(function (p) {
          var c = byId("clients", p.client_id);
          return '<tr class="click" data-go="#/pets/' + p.id + '"><td>' + thumb(p) + "</td><td><b>" + esc(p.name) + "</b>" + (p.sample ? ' <span class="pill">sample</span>' : "") + "</td><td>" + esc(p.species || "") + "</td><td>" + pill(p.status, p.status === "guest" ? "sitting guest" : p.status) + "</td><td>" + esc({ public: "Listed", unlisted: "Link only", private: "Hidden" }[p.visibility] || "") + "</td><td>" + esc(p.status === "guest" ? (c ? c.name : "") : p.shelter_name || "") + "</td><td>" + esc(fmtWhen(p.updated_at)) + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<div class="panel"><p class="empty">No pets here.</p></div>'));
    app.querySelectorAll("#seg button").forEach(function (b) { b.onclick = function () { petFilter = b.getAttribute("data-f"); pageTPets(); }; });
    bindRows();
  }

  function pagePet(id) {
    var isNew = id === "new";
    var p = isNew ? { status: "adoptable", visibility: "public", species: "Dog", good_with: {}, traits: [], colour: COLOURS[Math.floor(Math.random() * COLOURS.length)] } : byId("pets", id);
    if (!p) return notFound("pets");
    var g = p.good_with || {};
    function gwSel(k, label) { var v = g[k] === true ? "yes" : g[k] === false ? "no" : ""; return field(label, "gw_" + k, v, { type: "select", options: [["", "Not sure"], ["yes", "Yes"], ["no", "No"]] }); }
    var stays = isNew ? [] : S.stays.filter(function (s) { return s.pet_id === p.id; });
    var enq = isNew ? [] : S.enquiries.filter(function (e) { return e.pet_id === p.id && e.kind === "adoption"; });
    shell("pets",
      '<div class="page-head"><div><p><a href="#/pets">Pets</a></p><h1>' + (isNew ? "New pet profile" : esc(p.name)) + "</h1></div>" +
      (!isNew && p.visibility !== "private" && (p.status === "adoptable" || p.status === "guest") ? '<a class="btn ghost" target="_blank" href="' + esc(petLink(p)) + '">View on website</a>' : "") + "</div>" +
      '<div class="cols"><div><div class="panel"><form id="pf">' +
      '<div class="photo-edit"><div id="ph">' + (p.photo_url ? '<img src="' + esc(p.photo_url) + '" alt="">' : '<div class="pet-photo" style="background:' + esc(p.colour) + '">' + esc((p.name || "?").charAt(0)) + "</div>") + "</div>" +
      '<div class="field"><label for="f_photo">Photo <span class="hint">(resized automatically)</span></label><input id="f_photo" type="file" accept="image/*"></div></div>' +
      '<div class="form-grid">' +
      field("Name", "name", p.name, { required: true }) +
      field("Profile type", "status", p.status, { type: "select", options: [["adoptable", "Looking for a home"], ["guest", "Sitting guest"], ["adopted", "Adopted (hidden)"], ["archived", "Archived (hidden)"]] }) +
      field("On the website", "visibility", p.visibility, { type: "select", options: [["public", "Listed"], ["unlisted", "Only with the link (for private guests)"], ["private", "Hidden"]] }) +
      field("Species", "species", p.species, { type: "select", options: ["Dog", "Cat", "Rabbit", "Guinea pig", "Bird", "Other"] }) +
      field("Breed", "breed", p.breed) + field("Age", "age", p.age, { ph: "3 years" }) +
      field("Sex", "sex", p.sex, { type: "select", options: ["", "Male", "Female"] }) +
      field("Size", "size", p.size, { type: "select", options: ["", "Small", "Medium", "Large"] }) +
      gwSel("kids", "Good with kids") + gwSel("dogs", "Good with dogs") + gwSel("cats", "Good with cats") +
      field("Personality tags", "traits", (p.traits || []).join(", "), { full: true, hint: "comma separated", ph: "Loves fetch, Gentle, Lap cat" }) +
      field(p.status === "guest" ? "About this guest" : "Their story", "story", p.story, { type: "textarea", full: true }) +
      field("Good to know", "needs", p.needs, { type: "textarea", full: true, ph: "Needs a fenced yard, on joint supplements..." }) +
      '<div class="field"><label for="f_shelter_id">Shelter</label><select id="f_shelter_id" name="shelter_id">' + opt("", p.shelter_id, "None / not a shelter pet") + S.shelters.map(function (sh) { return opt(sh.id, p.shelter_id, sh.name); }).join("") + "</select></div>" +
      field("Owner (sitting guests)", "client_id", p.client_id, { type: "select", options: [["", "None"]].concat(S.clients.map(function (c) { return [c.id, c.name]; })) }) +
      field("Shelter listing link", "enquire_url", p.enquire_url, { full: true, ph: "https://...", hint: "optional" }) +
      '</div><div class="actions-bar"><button class="btn">' + (isNew ? "Create profile" : "Save changes") + "</button>" + (isNew ? "" : '<button type="button" class="btn danger" id="delp">Delete profile</button>') + "</div></form></div></div>" +
      "<div>" +
      (enq.length ? '<div class="panel"><h2>Adoption enquiries</h2><ul class="list">' + enq.map(function (e) { return '<li><a class="row-link grow" href="#/inbox/' + e.id + '"><b>' + esc(e.name) + "</b> " + pill(e.status) + '<div class="sub">' + esc(fmtWhen(e.created_at)) + "</div></a></li>"; }).join("") + "</ul></div>" : "") +
      (stays.length ? '<div class="panel"><h2>Stays</h2><ul class="list">' + stays.map(function (s) { return '<li><a class="row-link grow" href="#/stays/' + s.id + '"><b>' + esc(fmtDate(s.start_date) + " to " + fmtDate(s.end_date)) + "</b> " + pill(stayState(s)) + "</a></li>"; }).join("") + "</ul></div>" : "") +
      (p.profile && Object.keys(p.profile).length ? '<div class="panel"><h2>Questionnaire</h2><details><summary>Show answers</summary><div style="margin-top:10px">' + answersHtml(p.profile) + "</div></details></div>" : "") +
      (p.status === "adoptable" ? '<div class="panel"><h2>Tips</h2><p class="muted">Bright, close-up photos at eye level get the most enquiries. Lead the story with what makes them lovable, then what home suits them.</p></div>' : "") +
      "</div></div>");
    var newPhoto = null;
    document.getElementById("f_photo").onchange = function (ev) {
      var f = ev.target.files[0]; if (!f) return;
      document.getElementById("ph").innerHTML = '<p class="muted">Uploading...</p>';
      DB.uploadPhoto(f).then(function (url) { newPhoto = url; document.getElementById("ph").innerHTML = '<img src="' + esc(url) + '" alt="">'; }).catch(fail);
    };
    document.getElementById("pf").onsubmit = function (ev) {
      ev.preventDefault(); var d = nullify(formData(ev.target));
      function gv(v) { return v === "yes" ? true : v === "no" ? false : null; }
      var row = {
        name: d.name, status: d.status, visibility: d.visibility, species: d.species, breed: d.breed, age: d.age, sex: d.sex, size: d.size,
        traits: String(d.traits || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean),
        good_with: { kids: gv(d.gw_kids), dogs: gv(d.gw_dogs), cats: gv(d.gw_cats) },
        story: d.story, needs: d.needs, shelter_id: d.shelter_id, client_id: d.client_id, enquire_url: d.enquire_url,
        shelter_name: d.shelter_id ? (byId("shelters", d.shelter_id) || {}).name : (p.shelter_id ? null : p.shelter_name || null),
        colour: p.colour, sample: isNew ? false : !!p.sample,
      };
      if (newPhoto) row.photo_url = newPhoto;
      var btn = ev.target.querySelector(".btn"); btn.disabled = true;
      (isNew ? DB.insert("pets", Object.assign({ profile: {} }, row)) : DB.update("pets", p.id, row)).then(function (saved) {
        toast(isNew ? "Profile created" : "Saved");
        if (isNew) location.hash = "#/pets/" + saved.id;
        return refresh();
      }).catch(function (x) { btn.disabled = false; fail(x); });
    };
    var dp = document.getElementById("delp");
    if (dp) dp.onclick = function () {
      if (!confirm("Delete " + p.name + "'s profile, stays and updates? To just hide it, set the status to Adopted or Archived instead.")) return;
      DB.remove("pets", p.id).then(function () { location.hash = "#/pets"; return refresh(); }).catch(fail);
    };
  }

  function pageClients() {
    shell("clients",
      '<div class="page-head"><div><h1>Clients</h1><p>Pet owners. Created automatically when you accept a stay request.</p></div><a class="btn" href="#/clients/new">New client</a></div>' +
      (S.clients.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Mobile</th><th>Email</th><th>Suburb</th><th>Pets</th><th>Stays</th></tr></thead><tbody>' +
        S.clients.map(function (c) {
          return '<tr class="click" data-go="#/clients/' + c.id + '"><td><b>' + esc(c.name) + "</b></td><td>" + esc(c.phone || "") + "</td><td>" + esc(c.email || "") + "</td><td>" + esc(c.suburb || "") + "</td><td>" +
            esc(S.pets.filter(function (p) { return p.client_id === c.id; }).map(function (p) { return p.name; }).join(", ")) + "</td><td>" + S.stays.filter(function (s) { return s.client_id === c.id; }).length + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<div class="panel"><p class="empty">No clients yet.</p></div>'));
    bindRows();
  }

  function pageClient(id) {
    var isNew = id === "new";
    var c = isNew ? {} : byId("clients", id);
    if (!c) return notFound("clients");
    var pets = isNew ? [] : S.pets.filter(function (p) { return p.client_id === c.id; });
    var stays = isNew ? [] : S.stays.filter(function (s) { return s.client_id === c.id; });
    shell("clients",
      '<div class="page-head"><div><p><a href="#/clients">Clients</a></p><h1>' + (isNew ? "New client" : esc(c.name)) + "</h1></div></div>" +
      '<div class="cols"><div class="panel"><form id="cf"><div class="form-grid">' +
      field("Name", "name", c.name, { required: true }) + field("Mobile", "phone", c.phone, { type: "tel" }) + field("Email", "email", c.email, { type: "email" }) +
      field("Suburb", "suburb", c.suburb) + field("Emergency contact", "emergency_contact", c.emergency_contact, { full: true, ph: "Name and phone" }) +
      field("Notes", "notes", c.notes, { type: "textarea", full: true }) +
      '</div><div class="actions-bar"><button class="btn">' + (isNew ? "Create client" : "Save") + "</button>" + (isNew ? "" : '<button type="button" class="btn danger" id="delc">Delete</button>') + "</div></form>" + (isNew ? "" : contactButtons(c, "Hi " + first(c.name) + ", ", C.businessName)) + "</div>" +
      "<div>" + (pets.length ? '<div class="panel"><h2>Pets</h2><ul class="list">' + pets.map(function (p) { return "<li>" + thumb(p) + '<a class="row-link grow" href="#/pets/' + p.id + '"><b>' + esc(p.name) + '</b><div class="sub">' + esc(p.species || "") + "</div></a></li>"; }).join("") + "</ul></div>" : "") +
      (stays.length ? '<div class="panel"><h2>Stays</h2><ul class="list">' + stays.map(function (s) { return '<li><a class="row-link grow" href="#/stays/' + s.id + '"><b>' + esc(stayTitle(s)) + "</b> " + pill(stayState(s)) + "</a></li>"; }).join("") + "</ul></div>" : "") + "</div></div>");
    document.getElementById("cf").onsubmit = function (ev) {
      ev.preventDefault(); var d = nullify(formData(ev.target));
      (isNew ? DB.insert("clients", d) : DB.update("clients", c.id, d)).then(function (r) {
        toast("Saved"); if (isNew) location.hash = "#/clients/" + r.id; return refresh();
      }).catch(fail);
    };
    var dc = document.getElementById("delc");
    if (dc) dc.onclick = function () { if (confirm("Delete " + c.name + "? Their pets and stays are kept.")) DB.remove("clients", c.id).then(function () { location.hash = "#/clients"; return refresh(); }).catch(fail); };
  }

  var SH_STATUS = [["prospect", "Prospects"], ["contacted", "Contacted"], ["visited", "Visited"], ["partner", "Partners"], ["not_interested", "Not now"]];
  function pageShelters() {
    var sub = (function () { try { return localStorage.getItem("hfp_suburb") || "Leumeah NSW"; } catch (e) { return "Leumeah NSW"; } })();
    shell("shelters",
      '<div class="page-head"><div><h1>Shelters</h1><p>Find shelters and rescues, and track each one from first contact to partner.</p></div><a class="btn" href="#/shelters/new">Add shelter</a></div>' +
      '<div class="panel"><h2>Find more shelters</h2><form id="find" class="toolbar" style="margin:0"><input name="q" value="' + esc(sub) + '" style="min-width:200px" aria-label="Suburb"> ' +
      '<button class="btn sm" data-q="animal shelter">Animal shelters</button><button class="btn sm ghost" data-q="animal rescue">Rescue groups</button><button class="btn sm ghost" data-q="cat rescue">Cat rescues</button><button class="btn sm ghost" data-q="council animal care facility">Council pounds</button></form>' +
      '<p class="hint" style="margin:10px 0 0">Opens Google Maps near that suburb. Also browse rescue groups on <a href="https://www.petrescue.com.au/" target="_blank" rel="noopener">PetRescue</a>. Add the good ones here.</p>' +
      (S.shelters.length ? "" : '<p style="margin-top:14px"><button class="btn" id="seed">Add 5 shelters near you to get started</button></p>') + "</div>" +
      '<div class="board">' + SH_STATUS.map(function (st) {
        var items = S.shelters.filter(function (s) { return s.status === st[0]; });
        return '<div class="col"><h3>' + st[1] + "<span>" + items.length + "</span></h3>" + items.map(function (s) {
          return '<div class="card" data-go="#/shelters/' + s.id + '"><b>' + esc(s.name) + '</b><div class="sub">' + esc(s.suburb || "") + (s.next_step ? "<br>Next: " + esc(s.next_step) + (s.next_step_date ? " (" + esc(fmtDate(s.next_step_date)) + ")" : "") : "") + "</div></div>";
        }).join("") + "</div>";
      }).join("") + "</div>");
    var form = document.getElementById("find");
    form.querySelectorAll("button[data-q]").forEach(function (b) {
      b.onclick = function (ev) {
        ev.preventDefault(); var where = form.q.value.trim() || "Leumeah NSW";
        try { localStorage.setItem("hfp_suburb", where); } catch (e) {}
        window.open("https://www.google.com/maps/search/" + encodeURIComponent(b.getAttribute("data-q") + " near " + where), "_blank", "noopener");
      };
    });
    var sd = document.getElementById("seed");
    if (sd) sd.onclick = function () {
      sd.disabled = true;
      Promise.all(window.HFP_SEED.shelters.map(function (s) { return DB.insert("shelters", s); })).then(refresh).then(function () { toast("Added 5 shelters"); }).catch(fail);
    };
    bindRows();
  }

  function pageShelter(id) {
    var isNew = id === "new";
    var s = isNew ? { status: "prospect" } : byId("shelters", id);
    if (!s) return notFound("shelters");
    var pets = isNew ? [] : S.pets.filter(function (p) { return p.shelter_id === s.id; });
    shell("shelters",
      '<div class="page-head"><div><p><a href="#/shelters">Shelters</a></p><h1>' + (isNew ? "Add shelter" : esc(s.name)) + "</h1></div></div>" +
      '<div class="cols"><div class="panel"><form id="shf"><div class="form-grid">' +
      field("Name", "name", s.name, { required: true, full: true }) +
      field("Stage", "status", s.status, { type: "select", options: SH_STATUS.map(function (x) { return [x[0], x[1]]; }) }) +
      field("Suburb", "suburb", s.suburb) + field("Address", "address", s.address, { full: true }) +
      field("Phone", "phone", s.phone, { type: "tel" }) + field("Email", "email", s.email, { type: "email" }) +
      field("Website", "website", s.website, { full: true }) + field("Opening hours", "hours", s.hours, { full: true }) +
      field("Next step", "next_step", s.next_step, { full: true, ph: "Call the manager about featuring their dogs" }) +
      field("Next step date", "next_step_date", s.next_step_date, { type: "date", hint: "a reminder appears on this day" }) +
      field("Notes", "notes", s.notes, { type: "textarea", full: true }) +
      '</div><div class="actions-bar"><button class="btn">' + (isNew ? "Add shelter" : "Save") + "</button>" + (isNew ? "" : '<button type="button" class="btn danger" id="delsh">Delete</button>') + "</div></form>" +
      (isNew ? "" : contactButtons(s, "Hi, this is " + (C.businessName || "Home for Paws") + ". ", C.businessName)) + "</div>" +
      "<div>" + (s.website ? '<div class="panel"><h2>Links</h2><p><a target="_blank" rel="noopener" href="' + esc(s.website) + '">Website</a>' + (s.address ? ' · <a target="_blank" rel="noopener" href="https://www.google.com/maps/search/' + encodeURIComponent(s.address) + '">Map</a>' : "") + "</p></div>" : "") +
      (pets.length ? '<div class="panel"><h2>Their pets on our site</h2><ul class="list">' + pets.map(function (p) { return "<li>" + thumb(p) + '<a class="row-link grow" href="#/pets/' + p.id + '"><b>' + esc(p.name) + "</b> " + pill(p.status) + "</a></li>"; }).join("") + "</ul></div>" : "") + "</div></div>");
    document.getElementById("shf").onsubmit = function (ev) {
      ev.preventDefault(); var d = nullify(formData(ev.target));
      (isNew ? DB.insert("shelters", d) : DB.update("shelters", s.id, d)).then(function (r) { toast("Saved"); if (isNew) location.hash = "#/shelters/" + r.id; return refresh(); }).catch(fail);
    };
    var del = document.getElementById("delsh");
    if (del) del.onclick = function () { if (confirm("Delete " + s.name + "?")) DB.remove("shelters", s.id).then(function () { location.hash = "#/shelters"; return refresh(); }).catch(fail); };
  }

  function pageEmergency() {
    var list = S.contacts.slice().sort(function (a, b) { return (a.sort || 100) - (b.sort || 100); });
    var care = inCare();
    shell("emergency",
      '<div class="page-head"><div><h1>Emergency</h1><p>Who to call, and the details for every pet in your care. Save this page to your phone\'s home screen.</p></div><a class="btn" href="#/emergency/new">Add contact</a></div>' +
      (list.length ? '<div class="em-grid" style="margin-bottom:18px">' + list.map(function (c) {
        var tel = (String(c.phone || "").match(/[\d\s()+]{3,}/) || [""])[0].replace(/[^\d+]/g, "");
        return '<div class="em-card"><div class="cat">' + esc(c.category) + "</div><b>" + esc(c.name) + "</b><br>" + (tel ? '<a class="call" href="tel:' + esc(tel) + '">' + esc(c.phone) + "</a>" : "") +
          (c.address ? '<p><a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(c.address) + '">Directions</a>: ' + esc(c.address) + "</p>" : "") +
          (c.hours ? "<p>" + esc(c.hours) + "</p>" : "") + (c.notes ? '<p class="muted">' + esc(c.notes) + "</p>" : "") +
          '<p><a href="#/emergency/' + c.id + '">Edit</a>' + (c.website ? ' · <a target="_blank" rel="noopener" href="' + esc(c.website) + '">Website</a>' : "") + "</p></div>";
      }).join("") + "</div>" : '<div class="panel"><p>No emergency contacts yet.</p><button class="btn" id="seed">Add the local emergency vet, poisons line and council pound</button></div>') +
      '<div class="panel"><h2>Pets in your care right now</h2>' + (care.length ? '<div class="table-wrap"><table class="data"><thead><tr><th>Pet</th><th>Owner</th><th>Emergency contact</th><th>Their vet</th><th>Medication</th><th>Microchip</th></tr></thead><tbody>' +
        care.map(function (s) {
          var p = byId("pets", s.pet_id) || {}, c = byId("clients", s.client_id) || {}, a = p.profile || {};
          return '<tr><td><a href="#/stays/' + s.id + '"><b>' + esc(p.name) + "</b></a></td><td>" + esc(c.name || "") + (c.phone ? '<br><a href="tel:' + esc(c.phone.replace(/\s/g, "")) + '">' + esc(c.phone) + "</a>" : "") + "</td><td>" + esc(a.emergency_contact || c.emergency_contact || "") + "</td><td>" + esc([a.vet_name, a.vet_phone].filter(Boolean).join(", ")) + "</td><td>" + esc(a.medications || "None") + "</td><td>" + esc(a.microchip || "") + "</td></tr>";
        }).join("") + "</tbody></table></div>" : '<p class="empty">No pets in care right now.</p>') + "</div>" +
      '<div class="panel"><h2>First steps</h2><p class="muted">A general guide only. When in doubt, call the emergency vet straight away.</p><ul>' +
      "<li><b>Injured or collapsed:</b> keep them still and warm, call the emergency vet and go. Call the owner once you're on the way.</li>" +
      "<li><b>Ate something toxic</b> (chocolate, grapes, rat or snail bait, medication, lilies for cats): call the Animal Poisons Helpline or vet now. Do not make them vomit unless told to. Bring the packet.</li>" +
      "<li><b>Snake bite</b> (or suspected): keep them calm and still, carry them, go straight to the vet. Do not wash or cut the bite.</li>" +
      "<li><b>Heat stress</b> (heavy panting, drooling, wobbly): move to shade, wet with cool (not icy) water, offer small sips, go to the vet.</li>" +
      "<li><b>Escaped:</b> search nearby straight away, call the owner and the council pound, and post in local lost-pet groups with a photo.</li>" +
      "<li><b>Afterwards:</b> write down what happened and the times in the stay notes.</li></ul></div>");
    var sd = document.getElementById("seed");
    if (sd) sd.onclick = function () { sd.disabled = true; Promise.all(window.HFP_SEED.contacts.map(function (c) { return DB.insert("contacts", c); })).then(refresh).catch(fail); };
  }

  function pageContact(id) {
    var isNew = id === "new";
    var c = isNew ? { category: "Emergency vet", sort: 50 } : byId("contacts", id);
    if (!c) return notFound("emergency");
    shell("emergency",
      '<div class="page-head"><div><p><a href="#/emergency">Emergency</a></p><h1>' + (isNew ? "Add contact" : esc(c.name)) + "</h1></div></div>" +
      '<div class="panel"><form id="ctf"><div class="form-grid">' +
      field("Type", "category", c.category, { type: "select", options: ["Emergency vet", "Regular vet", "Poisoning", "Lost pet", "People emergency", "Other"] }) +
      field("Name", "name", c.name, { required: true }) + field("Phone", "phone", c.phone) + field("Address", "address", c.address, { full: true }) +
      field("Hours", "hours", c.hours, { full: true }) + field("Website", "website", c.website, { full: true }) + field("Notes", "notes", c.notes, { type: "textarea", full: true }) +
      field("Order on page", "sort", c.sort, { type: "number", hint: "lower shows first" }) +
      '</div><div class="actions-bar"><button class="btn">Save</button>' + (isNew ? "" : '<button type="button" class="btn danger" id="delct">Delete</button>') + "</div></form></div>");
    document.getElementById("ctf").onsubmit = function (ev) {
      ev.preventDefault(); var d = nullify(formData(ev.target)); d.sort = Number(d.sort || 100);
      (isNew ? DB.insert("contacts", d) : DB.update("contacts", c.id, d)).then(function () { location.hash = "#/emergency"; return refresh(); }).catch(fail);
    };
    var del = document.getElementById("delct");
    if (del) del.onclick = function () { if (confirm("Delete this contact?")) DB.remove("contacts", c.id).then(function () { location.hash = "#/emergency"; return refresh(); }).catch(fail); };
  }

  function pageSettings() {
    var R = C.rates || {};
    shell("settings",
      '<div class="page-head"><div><h1>Settings</h1></div></div>' +
      '<div class="panel"><h2>Database</h2>' + (DB.live ? '<p class="banner ok" style="margin:0">Connected to Supabase. Enquiries, profiles and photos are stored securely online.</p>'
        : "<p>HQ is in <b>demo mode</b>: everything you do here is saved only in this browser, and the website's forms still arrive by email. To go live (about 15 minutes, free):</p><ol>" +
          '<li>Create a free account and project at <a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a> (region: Sydney).</li>' +
          "<li>In the project, open SQL Editor, paste the contents of <code>supabase/schema.sql</code> from the repo, and Run.</li>" +
          "<li>Authentication, Users: add a user with your email and a strong password. Then run <code>insert into admins (email) values ('your@email');</code> in the SQL Editor.</li>" +
          "<li>Authentication, Sign In / Providers: turn off \"Allow new users to sign up\".</li>" +
          "<li>Project Settings, API: copy the Project URL and anon public key into <code>assets/config.js</code> (or send them to Claude to do it).</li></ol>" +
          '<p>Full guide: <code>ADMIN-SETUP.md</code> in the repo.</p>') + "</div>" +
      '<div class="panel"><h2>Prices used for estimates</h2><dl class="kv"><dt>Dog, per night</dt><dd>' + money(R.dogNight) + "</dd><dt>Cat, per night</dt><dd>" + money(R.catNight) + "</dd><dt>Other pets, per night</dt><dd>" + money(R.otherNight) + "</dd><dt>Day care, per day</dt><dd>" + money(R.dayCare) + "</dd><dt>Drop-in visit</dt><dd>" + money(R.dropIn) + '</dd></dl><p class="hint">Change these in <code>assets/config.js</code>. You can always override the price on each stay.</p></div>' +
      '<div class="panel"><h2>Payments</h2><p>Create a payment link in Square for each stay (Square Dashboard, Online, Payment links), paste it into the stay, and send it with one tap. Mark the stay paid when it comes through.</p></div>' +
      (DB.live ? "" : '<div class="panel"><h2>Demo data</h2><p>Start the demo again from the sample data.</p><button class="btn danger" id="reset">Reset demo data</button></div>'));
    var rs = document.getElementById("reset");
    if (rs) rs.onclick = function () { if (confirm("Reset all demo data in this browser?")) { DB.resetDemo(); refresh(); } };
  }

  function notFound(back) { shell(back, '<div class="panel"><h1>Not found</h1><p>This item may have been deleted. <a href="#/' + back + '">Go back</a></p></div>'); }

  // ---------- Router ----------
  function route() {
    var parts = (location.hash || "#/dashboard").replace(/^#\//, "").split("/");
    var page = parts[0] || "dashboard", id = parts[1];
    try {
      if (page === "inbox") return id ? pageEnquiry(id) : pageInbox();
      if (page === "stays") return id === "new" ? pageStayNew() : id ? pageStay(id) : pageStays();
      if (page === "pets") return id ? pagePet(id) : pageTPets();
      if (page === "clients") return id ? pageClient(id) : pageClients();
      if (page === "shelters") return id ? pageShelter(id) : pageShelters();
      if (page === "emergency") return id ? pageContact(id) : pageEmergency();
      if (page === "settings") return pageSettings();
      return pageDashboard();
    } catch (e) { fail(e); }
  }

  // ---------- Login ----------
  function login(msg) {
    app.innerHTML = '<div class="login panel"><h1 style="font-size:1.6rem">' + PAW.replace("<svg", '<svg style="width:28px;height:28px;color:var(--brand);vertical-align:-4px"') + " HQ sign in</h1>" +
      (msg ? '<p class="banner">' + esc(msg) + "</p>" : "") +
      '<form id="lf">' + field("Email", "email", "", { type: "email", required: true }) + field("Password", "password", "", { type: "password", required: true }) +
      '<button class="btn">Sign in</button></form></div>';
    document.getElementById("lf").onsubmit = function (ev) {
      ev.preventDefault(); var d = formData(ev.target), b = ev.target.querySelector("button"); b.disabled = true;
      DB.auth.signIn(d.email, d.password).then(start).catch(function (e) { b.disabled = false; login(e.message || "Sign in failed"); });
    };
  }
  function start() {
    return DB.auth.session().then(function (s) {
      if (!s) return login();
      return (DB.live ? DB.list("admins", { order: "created_at" }) : Promise.resolve([1])).then(function (adm) {
        if (DB.live && !adm.length) return DB.auth.signOut().then(function () { login("This account is not an admin yet. Add your email to the admins table (see ADMIN-SETUP.md)."); });
        window.onhashchange = route;
        return loadAll().then(route);
      });
    }).catch(function (e) { app.innerHTML = '<div class="login panel"><h1>HQ could not start</h1><p>' + esc(e.message || e) + "</p></div>"; });
  }
  start();
})();
