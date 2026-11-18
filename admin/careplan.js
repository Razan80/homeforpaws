// Builds a care plan from a pet's pre-stay questionnaire answers.
// Input: answers object (keys = form field names from book.html), the pet, and the stay.
// Output: { sections: [{ title, items: [string], level?: 'alert' }], tasks: [{ time, text }] }
(function () {
  function arr(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }
  function has(list, v) { return arr(list).indexOf(v) !== -1; }
  function txt(v) { return arr(v).join(", "); }
  function years(age) {
    if (!age) return null;
    var s = String(age).toLowerCase();
    var n = parseFloat(s);
    if (isNaN(n)) return null;
    if (/month|mo\b|wk|week/.test(s)) return n / 12;
    return n;
  }

  function build(a, pet, stay) {
    a = a || {};
    pet = pet || {};
    var species = a.species || pet.species || "Dog";
    var dog = /dog/i.test(species);
    var cat = /cat/i.test(species);
    var name = a.pet_name || pet.name || "your guest";
    var energy = parseInt(a.energy_level || "3", 10);
    var cuddle = parseInt(a.cuddle_level || "3", 10);
    var age = years(a.age || pet.age);
    var senior = age != null && age >= (dog ? 8 : 11);
    var young = age != null && age < 1;
    var fears = arr(a.fears);
    var behaviour = arr(a.behaviour);
    var S = [];
    var tasks = [];

    // ---- Must-know alerts first ----
    var alerts = [];
    if (a.treats_and_allergies) alerts.push("Food rules from owner: " + a.treats_and_allergies);
    if (a.medications) alerts.push("Medication / health: " + a.medications);
    if (a.vaccinated && a.vaccinated !== "Yes") alerts.push("Vaccinations not confirmed. Get the certificate before drop-off, or do not accept the stay.");
    if (a.parasite_treatment === "No") alerts.push("Flea, tick and worm treatment not current. Ask the owner to treat before drop-off.");
    if (has(behaviour, "Escape artist") || has(behaviour, "Jumps fences")) alerts.push("Escape risk: never off-lead outside, check gates and fences before every yard visit.");
    if (has(behaviour, "Guards food or toys")) alerts.push("Guards food or toys: feed alone, pick up bowls and high-value toys when other animals are around.");
    if (alerts.length) S.push({ title: "Must know", level: "alert", items: alerts });

    // ---- Daily routine ----
    var routine = [];
    if (a.wake_time) { routine.push(a.wake_time + ": wake up" + (dog ? ", straight out for a toilet break" : "")); tasks.push({ time: a.wake_time, text: "Morning toilet and check-in" }); }
    if (a.meals) { routine.push("Meals: " + a.meals); tasks.push({ time: "Meal times", text: "Feed as per owner: " + a.meals }); }
    if (dog) {
      var walk = a.walks ? "Owner's routine: " + a.walks : null;
      var rec = senior ? "2 gentle walks of 15 to 20 minutes, on soft ground where possible"
        : energy >= 4 ? "2 walks of 45 minutes plus a 15 minute play or fetch session"
        : energy <= 2 ? "2 relaxed walks of 20 minutes"
        : "2 walks of 30 minutes plus some yard play";
      routine.push("Exercise: " + (walk ? walk + ". " : "") + "Plan for " + rec + ".");
      tasks.push({ time: "Morning", text: "Walk (" + rec.split(" plus")[0] + ")" });
      tasks.push({ time: "Afternoon", text: "Walk and play" });
    } else if (cat) {
      routine.push("Play: " + (energy >= 4 ? "3 short wand-toy sessions a day" : "2 gentle play sessions a day") + ". Fresh water and clean litter morning and evening.");
      tasks.push({ time: "Morning and evening", text: "Clean litter, refresh water, play session" });
    } else {
      routine.push("Follow the owner's routine closely. Check food, water and enclosure twice a day.");
    }
    if (a.toilet_routine) routine.push("Toilet: " + a.toilet_routine);
    if (young) { routine.push("Puppy or kitten: toilet break every 2 hours and after every meal, nap and play."); }
    if (a.sleep_spot) routine.push("Sleeps: " + a.sleep_spot + ". Set up their own bed from home in a quiet spot.");
    if (a.bed_time) { routine.push(a.bed_time + ": last toilet break and bed."); tasks.push({ time: a.bed_time, text: "Last toilet break, settle into bed" }); }
    S.push({ title: "Daily routine", items: routine });

    // ---- Medication tasks ----
    if (a.medications) tasks.unshift({ time: "As prescribed", text: "Give medication: " + a.medications + " (record each dose)" });

    // ---- Comfort and fears ----
    var comfort = [];
    if (cuddle >= 4) comfort.push("Loves company. Keep them close, avoid leaving them alone for long stretches.");
    if (cuddle <= 2) comfort.push("Independent. Let them come to you; give them a quiet space of their own.");
    var FEAR = {
      "Thunderstorms": "Thunder: check the BOM forecast each morning. On storm days set up a covered den, close curtains and play calm music.",
      "Fireworks": "Fireworks: keep indoors after dusk on New Year's Eve and other event nights; close windows and curtains, extra-secure gates.",
      "Vacuum cleaner": "Vacuum: only vacuum while they are in another room or out on a walk.",
      "Strangers": "Strangers: keep visitors to a minimum and let them approach in their own time.",
      "Being left alone": "Separation: no more than 2 to 3 hours alone. Leave an item that smells of home and a long-lasting chew or puzzle toy.",
      "Car rides": "Car rides: avoid unless needed for the vet; use a crate or harness and keep trips short.",
      "Bath time": "Baths: only if necessary, with warm water and lots of treats.",
    };
    fears.forEach(function (f) { if (FEAR[f]) comfort.push(FEAR[f]); });
    if (a.calming) comfort.push("What calms them: " + a.calming);
    if (comfort.length) S.push({ title: "Comfort and fears", items: comfort });

    // ---- Other animals and people ----
    var social = [];
    function soc(label, v) {
      if (!v) return;
      if (/Loves/.test(v)) social.push(label + ": loves them. Supervised play is fine.");
      else if (/introduction/.test(v)) social.push(label + ": introduce slowly, on lead, in a neutral area before sharing space.");
      else if (/chase|Prefers not/.test(v)) social.push(label + ": keep separate at all times. Do not book alongside these guests.");
      else social.push(label + ": unknown. Treat as 'introduce slowly' and keep separate if in doubt.");
    }
    soc("Other dogs", a.with_dogs); soc("Cats", a.with_cats); soc("Kids", a.with_kids);
    if (social.length) S.push({ title: "Other animals and people", items: social });

    // ---- Behaviour ----
    var B = {
      "Pulls on lead": "Pulls on lead: use a front-clip harness; short training walks.",
      "Chews things": "Chewer: pick up shoes, cables and cushions; provide safe chews.",
      "Barks a lot": "Barker: plenty of exercise and enrichment; avoid leaving near the front fence (neighbours).",
      "Escape artist": "Escape artist: double-door rule, no unsupervised yard time.",
      "Jumps fences": "Jumps fences: on lead or supervised in the yard only.",
    };
    var beh = behaviour.map(function (b) { return B[b]; }).filter(Boolean);
    if (senior) beh.push("Senior: shorter outings, soft bedding, watch for stiffness, and keep them cool on hot days.");
    if (beh.length) S.push({ title: "Behaviour and handling", items: beh });

    // ---- Fun and enrichment ----
    var fun = [];
    if (a.favourite_toys) fun.push("Favourite toys and games: " + a.favourite_toys);
    if (a.scratch_spot) fun.push("Best scratch spot: " + a.scratch_spot);
    if (a.tricks) fun.push("Knows: " + a.tricks + ". Practise a couple each day for treats.");
    if (a.quirks) fun.push("Quirks: " + a.quirks);
    if (a.superpower) fun.push("Superpower: " + a.superpower);
    if (fun.length) S.push({ title: "Fun and enrichment", items: fun });

    // ---- Owner updates ----
    var upd = ["Send a photo and a one-line update every day" + (a.update_channel ? " by " + a.update_channel : "") + "."];
    if (a.share_profile === "Yes") upd.push("Owner is happy for photos to be shared publicly.");
    else upd.push("Keep photos private: do not post on social media.");
    S.push({ title: "Updates for the owner", items: upd });
    tasks.push({ time: "Every evening", text: "Send the owner today's photo and update" });

    // ---- Emergency ----
    var em = [];
    if (a.vet_name || a.vet_phone) em.push("Owner's vet: " + [a.vet_name, a.vet_phone].filter(Boolean).join(", "));
    if (a.emergency_contact) em.push("Emergency contact: " + a.emergency_contact);
    if (a.microchip) em.push("Microchip: " + a.microchip);
    em.push(a.vet_consent ? "Owner has consented to vet treatment if they cannot be reached." : "No vet consent recorded. Get it signed before drop-off.");
    em.push("Nearest after-hours vet and the Animal Poisons Helpline are on the Emergency page.");
    S.push({ title: "Emergency", level: a.vet_consent ? null : "alert", items: em });

    // ---- Drop-off checklist ----
    S.push({ title: "Drop-off checklist", items: [
      "Their usual food (enough for the stay plus 2 days)",
      "Bed, blanket or a worn T-shirt that smells of home",
      "Favourite toy" + (a.favourite_toys ? " (" + a.favourite_toys + ")" : ""),
      a.medications ? "All medication, with written doses" : "Any medication",
      "Vaccination certificate" + (dog ? " (C5)" : cat ? " (F3)" : ""),
      dog ? "Lead, collar with ID tag, and harness" : cat ? "Carrier and usual litter" : "Their enclosure items",
      "Confirm pick-up time and payment",
    ] });

    return { sections: S, tasks: tasks, generatedAt: new Date().toISOString() };
  }

  window.HFP_CAREPLAN = { build: build };
})();
