(function () {
  var C = window.HFP_CONFIG || {};
  var PETS = window.HFP_PETS || [];

  var PAW =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="6" cy="9" rx="2.2" ry="2.8"/><ellipse cx="10" cy="5.5" rx="2.2" ry="2.8"/><ellipse cx="14" cy="5.5" rx="2.2" ry="2.8"/><ellipse cx="18" cy="9" rx="2.2" ry="2.8"/><path d="M12 11c-3 0-6 3.6-6 6.3C6 19.4 7.6 20 9 20c1.3 0 2-.6 3-.6s1.7.6 3 .6c1.4 0 3-.6 3-2.7C18 14.6 15 11 12 11z"/></svg>';

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // ---------- Header and footer ----------
  var page = document.body.getAttribute("data-page");
  var links = [
    ["index.html", "Home", "home"],
    ["adopt.html", "Adopt", "adopt"],
    ["pet-sitting.html", "Pet sitting", "sitting"],
    ["guests.html", "Our guests", "guests"],
    ["book.html", "Book a stay", "book"],
  ];
  var header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML =
      '<div class="wrap"><a class="logo" href="index.html">' + PAW + esc(C.businessName || "Home for Paws") + "</a>" +
      '<button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>' +
      '<nav class="nav" id="nav">' +
      links.map(function (l) {
        return '<a href="' + l[0] + '"' + (l[2] === page ? ' aria-current="page"' : "") + ">" + l[1] + "</a>";
      }).join("") +
      "</nav></div>";
    var btn = header.querySelector(".menu-btn");
    var nav = header.querySelector(".nav");
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }
  var footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="wrap">' +
      "<div><strong>" + esc(C.businessName) + "</strong><br>Finding forever homes for shelter pets, and a home away from home for yours.</div>" +
      "<div><strong>Where</strong><br>" + esc(C.area) + "</div>" +
      "<div><strong>Contact</strong><br>" +
      (C.contactEmail ? '<a href="mailto:' + esc(C.contactEmail) + '">' + esc(C.contactEmail) + "</a><br>" : "") +
      (C.phone ? esc(C.phone) : "") +
      "</div></div>";
  }

  // ---------- Pet cards ----------
  function photo(p, big) {
    if (p.photo) {
      return '<img class="pet-photo" src="' + esc(p.photo) + '" alt="Photo of ' + esc(p.name) + '">';
    }
    return '<div class="pet-photo" style="background:' + esc(p.colour || "#e9b872") + '" role="img" aria-label="' + esc(p.name) + ' (photo coming soon)">' +
      esc(p.name.charAt(0)) + PAW + "</div>";
  }

  function badge(p) {
    var b = p.status === "guest" ? '<span class="badge guest">Staying with us</span>' : '<span class="badge">Looking for a home</span>';
    if (p.sample) b += ' <span class="badge sample">Sample</span>';
    return b;
  }

  function card(p) {
    return '<a class="pet-card" href="pet.html?id=' + encodeURIComponent(p.id) + '">' + photo(p) +
      '<div class="body">' + badge(p) +
      "<h3 style=\"margin-top:8px\">" + esc(p.name) + "</h3>" +
      '<div class="meta">' + esc([p.species, p.age, p.sex].filter(Boolean).join(" · ")) + "</div>" +
      '<ul class="tags">' + (p.traits || []).slice(0, 3).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" +
      "</div></a>";
  }

  document.querySelectorAll("[data-pet-grid]").forEach(function (grid) {
    var status = grid.getAttribute("data-pet-grid");
    var limit = parseInt(grid.getAttribute("data-limit") || "0", 10);
    var list = PETS.filter(function (p) { return status === "all" || p.status === status; });
    var filterBar = grid.previousElementSibling && grid.previousElementSibling.classList.contains("filters") ? grid.previousElementSibling : null;

    function render(species) {
      var shown = list.filter(function (p) { return !species || species === "All" || p.species === species; });
      if (limit) shown = shown.slice(0, limit);
      grid.innerHTML = shown.length ? shown.map(card).join("") : '<p class="lead">No pets to show here right now. Check back soon!</p>';
    }

    if (filterBar) {
      var kinds = ["All"].concat(Array.from(new Set(list.map(function (p) { return p.species; }))));
      filterBar.innerHTML = kinds.map(function (k, i) {
        return '<button type="button" aria-pressed="' + (i === 0) + '">' + esc(k === "All" ? "All" : k + "s") + "</button>";
      }).join("");
      filterBar.querySelectorAll("button").forEach(function (b, i) {
        b.addEventListener("click", function () {
          filterBar.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", "false"); });
          b.setAttribute("aria-pressed", "true");
          render(kinds[i]);
        });
      });
    }
    render("All");
  });

  // ---------- Single pet profile ----------
  var profile = document.getElementById("pet-profile");
  if (profile) {
    var id = new URLSearchParams(location.search).get("id");
    var p = PETS.find(function (x) { return x.id === id; });
    if (!p) {
      profile.innerHTML = '<h1>Pet not found</h1><p>This profile may have been removed. <a href="adopt.html">See pets looking for a home</a>.</p>';
    } else {
      document.title = p.name + " | " + (C.businessName || "Home for Paws");
      function gw(label, v) {
        var cls = v === true ? "yes" : v === false ? "no" : "unk";
        var txt = v === true ? "Yes" : v === false ? "No" : "Not sure yet";
        return '<li class="' + cls + '">' + label + ": " + txt + "</li>";
      }
      var facts = [["Species", p.species], ["Breed", p.breed], ["Age", p.age], ["Sex", p.sex], ["Size", p.size]]
        .concat(p.status === "guest" ? [["Stay", p.stay]] : [["Shelter", p.shelter]])
        .filter(function (f) { return f[1]; });
      var g = p.goodWith || {};
      var action = "";
      if (p.status === "adoptable") {
        var href = p.enquire || (C.contactEmail ? "mailto:" + C.contactEmail + "?subject=" + encodeURIComponent("Adoption enquiry: " + p.name) : "#");
        action = '<div class="btn-row"><a class="btn" href="' + esc(href) + '">Enquire about ' + esc(p.name) + '</a><a class="btn secondary" href="adopt.html">See all pets</a></div>';
      } else {
        action = '<div class="btn-row"><a class="btn" href="book.html">Book a stay for your pet</a><a class="btn secondary" href="guests.html">All our guests</a></div>';
      }
      profile.innerHTML =
        '<div class="profile"><div>' + photo(p, true) + "</div><div>" + badge(p) +
        '<h1 style="margin-top:10px">' + esc(p.name) + "</h1>" +
        '<ul class="tags">' + (p.traits || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>" +
        '<dl class="facts">' + facts.map(function (f) { return "<div><dt>" + esc(f[0]) + "</dt><dd>" + esc(f[1]) + "</dd></div>"; }).join("") + "</dl>" +
        '<ul class="goodwith">' + gw("Kids", g.kids) + gw("Dogs", g.dogs) + gw("Cats", g.cats) + "</ul>" +
        "<h2>" + (p.status === "guest" ? "About this guest" : "My story") + "</h2><p>" + esc(p.story) + "</p>" +
        (p.needs ? "<p><strong>Good to know:</strong> " + esc(p.needs) + "</p>" : "") +
        (p.updates && p.updates.length ? '<h2>Stay updates</h2><div class="updates">' + p.updates.map(function (u) { return "<p>" + esc(u) + "</p>"; }).join("") + "</div>" : "") +
        action + "</div></div>";
    }
  }

  // ---------- Forms (booking + questionnaire) ----------
  document.querySelectorAll("form[data-hfp-form]").forEach(function (form) {
    var bar = document.querySelector(".progress-bar div");
    var label = document.querySelector(".progress small");
    var required = form.querySelectorAll("[required]");

    function progress() {
      if (!bar) return;
      var groups = {};
      form.querySelectorAll("input, select, textarea").forEach(function (el) {
        if (!el.name || el.type === "hidden" || el.name === "_gotcha") return;
        var filled = el.type === "checkbox" || el.type === "radio" ? el.checked : el.value.trim() !== "" && !(el.type === "range" && !el.dataset.touched);
        groups[el.name] = groups[el.name] || filled;
      });
      var names = Object.keys(groups);
      var done = names.filter(function (n) { return groups[n]; }).length;
      var pct = names.length ? Math.round((done / names.length) * 100) : 0;
      bar.style.width = pct + "%";
      if (label) label.textContent = pct + "% complete" + (pct === 100 ? ". Amazing, you know your pet so well!" : "");
    }
    form.addEventListener("input", function (e) {
      if (e.target.type === "range") e.target.dataset.touched = "1";
      progress();
    });
    form.addEventListener("change", progress);
    progress();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var data = new FormData(form);
      if (data.get("_gotcha")) return; // spam trap
      var status = document.getElementById("form-status");
      var subject = form.getAttribute("data-subject") + (data.get("pet_name") ? ": " + data.get("pet_name") : "");

      if (C.formEndpoint) {
        data.append("_subject", subject);
        fetch(C.formEndpoint, { method: "POST", body: data, headers: { Accept: "application/json" } })
          .then(function (r) {
            if (!r.ok) throw new Error();
            form.hidden = true;
            status.className = "notice";
            status.innerHTML = "<h2>Thank you!</h2><p>We've got your answers and will be in touch within 24 hours to arrange a free meet-and-greet.</p>";
            status.scrollIntoView({ behavior: "smooth" });
          })
          .catch(function () {
            status.className = "notice warn";
            status.textContent = "Sorry, something went wrong sending the form. Please try again, or email us at " + (C.contactEmail || "") + ".";
          });
      } else {
        // No form service yet: open the visitor's email app with the answers filled in.
        var lines = [];
        form.querySelectorAll("fieldset").forEach(function (fs) {
          var lg = fs.querySelector("legend");
          lines.push("", "== " + (lg ? lg.textContent : "") + " ==");
          var seen = {};
          fs.querySelectorAll("[name]").forEach(function (el) {
            if (seen[el.name] || el.name === "_gotcha") return;
            seen[el.name] = 1;
            var vals = data.getAll(el.name).filter(Boolean);
            if (!vals.length) return;
            var q = el.closest(".field");
            var qText = q ? (q.querySelector(".q, label") || {}).textContent : el.name;
            lines.push((qText || el.name).trim() + ": " + vals.join(", "));
          });
        });
        location.href = "mailto:" + (C.contactEmail || "") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n").trim());
        status.className = "notice";
        status.innerHTML = "<p>Your email app should open with your answers filled in. Just press send!</p>";
      }
    });
  });
})();
