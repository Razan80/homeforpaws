# Home for Paws website

A simple static website for Home for Paws: shelter pet adoption profiles and home pet sitting around Campbelltown, Leumeah and Macarthur, NSW.

No build step, no database. Open `index.html` in a browser, or host the folder on GitHub Pages, Netlify or similar for free.

## Pages

| Page | What it is |
| --- | --- |
| `index.html` | Home page |
| `adopt.html` | Shelter pets looking for a home, with a dog/cat filter |
| `guests.html` | Pets currently staying with us for pet sitting |
| `pet.html?id=...` | One profile page per pet (adoptable or guest) |
| `pet-sitting.html` | Services, prices, how it works |
| `book.html` | Booking request plus the fun pre-stay questionnaire |
| `admin/` | **HQ**, the private admin area: enquiries, profiles, stays, care plans, reminders, shelters, emergency info. See [ADMIN-SETUP.md](ADMIN-SETUP.md) |

## Everyday edits

**Add, change or remove a pet:** once HQ is connected to the database, do it in HQ (Pets). Until then, edit `assets/pets.js`. Each pet is one block. Copy an existing block, give it a unique `id`, and set `status` to `"adoptable"` (shelter pet) or `"guest"` (pet sitting). Put photos in `assets/pets/` and set `photo: "assets/pets/biscuit.jpg"`. Delete the sample pets (`sample: true`) before launch.

**Contact details and form delivery:** edit `assets/config.js`.
- Set `contactEmail` to your real email.
- For bookings to arrive in your inbox automatically, create a free form at [formspree.io](https://formspree.io) and paste its endpoint into `formEndpoint`. Until then, the Send button opens the visitor's email app with all their answers filled in.

**Prices:** edit the table in `pet-sitting.html`.

## Publishing with GitHub Pages

In the repository on GitHub: Settings → Pages → Source: "Deploy from a branch" → pick the branch and `/ (root)` → Save. The site appears at `https://<username>.github.io/homeforpaws/` within a few minutes. The `CNAME` file in this repo points the site at **homeforpaws.co**. At your domain registrar, add these DNS records:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | razan80.github.io |

Then in Settings → Pages, enter `homeforpaws.co` as the custom domain and tick "Enforce HTTPS" once it becomes available (can take up to 24 hours).
