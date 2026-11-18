# Home for Paws HQ: setup guide

HQ is the private admin area at **homeforpaws.co/admin/**. It is where every enquiry lands and where you run the business day to day.

| Section | What you do there |
| --- | --- |
| Today | Your to-do list, built automatically: new enquiries to answer, medication due, photo updates owed, arrivals and pick-ups, unpaid stays, shelter follow-ups, plus your own to-dos |
| Inbox | Every website form: stay requests (with the full questionnaire) and adoption enquiries. One-tap replies by SMS, WhatsApp or email with the message already written. "Accept and create stay" turns a request into a client, a guest profile, a stay with a price, and a care plan |
| Stays | Bookings. Each stay has its auto-generated care plan (printable), a daily checklist, owner updates with photos, and payment (Square link, paid or not) |
| Pets | Create, edit, hide or delete every profile on the website, with photo upload |
| Clients | Pet owners and their history |
| Shelters | Find shelters and rescues near any suburb, and track each from prospect to partner. Starts with 5 local shelters |
| Emergency | Tap-to-call emergency vet, poisons line and council pound, the vet and emergency details of every pet in your care, and first steps for common emergencies |

## Demo mode (now)

Until the database is connected, HQ runs in **demo mode**: it works fully, but data is saved only in the browser you use, and the website's forms still arrive by email. Use it to try everything out.

## Going live (about 15 minutes, free)

HQ uses [Supabase](https://supabase.com) for the database, logins and photo storage. The free plan is plenty for this business.

1. **Create the project.** Sign up at supabase.com, then New project. Name it `homeforpaws`, choose the **Sydney** region, and save the database password somewhere safe.
2. **Create the tables.** In the project, open **SQL Editor**, then New query. Paste everything from [`supabase/schema.sql`](supabase/schema.sql) and press **Run**.
3. **Create your login.** Go to **Authentication, Users**, then **Add user**, then **Create new user**, with your email and a strong password. Tick "Auto confirm user".
4. **Make yourself the admin.** Back in SQL Editor, run (with your email):
   ```sql
   insert into admins (email) values ('you@example.com');
   ```
   Add your wife the same way: create her user, then insert her email.
5. **Lock sign-ups.** In **Authentication, Sign In / Providers**, turn off **Allow new users to sign up**. Only the people you add can log in.
6. **Connect the website.** In **Project Settings, API**, copy the **Project URL** and the **anon public** key into `assets/config.js`:
   ```js
   supabaseUrl: "https://xxxx.supabase.co",
   supabaseAnonKey: "eyJ...",
   ```
   The anon key is designed to be public. The database rules in `schema.sql` only let visitors see listed pets and send enquiries; everything else needs an admin login.
7. Open **homeforpaws.co/admin/** and sign in. Go to Pets to add your real pets (and delete the samples), and use the buttons on Shelters and Emergency to load the starter lists.

## How the care plan works

When you accept a stay request, HQ reads the owner's questionnaire and writes a plan: must-know alerts (allergies, medication, escape risk, missing vaccinations), a daily routine with walk lengths based on energy and age, comfort steps for each fear they ticked, rules for other animals, behaviour handling, enrichment ideas, how the owner wants updates, emergency details, and a drop-off checklist. It also makes a tickable daily checklist. Press **Regenerate** after editing the pet's details, and **Print care plan** for a paper copy on the fridge.

## Reminders

Reminders are worked out fresh each time you open HQ, so nothing needs setting up. Tick one to clear it. Some ticks do the job too: ticking a reply marks the enquiry as replied, ticking a payment marks the stay paid.

HQ does not send messages by itself yet. Every message opens on your phone already written, so you just press send. Fully automatic emails and texts are a later step (see below).

## Later: the 24/7 client and caretaker app

The database is built so a phone app can use the same data later: owners logging in to see live updates, caretakers checking in pets, and messages in both directions. Sensible next steps when you're ready:

1. Automatic email or SMS reminders and owner updates (Supabase Edge Functions with an email or SMS service).
2. Square online checkout tied to each stay, so "paid" updates itself.
3. Owner logins, to see their pet's updates privately.
4. A phone app for owners and caretakers on the same database.
