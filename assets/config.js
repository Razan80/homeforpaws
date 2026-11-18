// Site settings. Edit these before launch.
window.HFP_CONFIG = {
  businessName: "Home for Paws",
  area: "Campbelltown, Leumeah & the Macarthur region, NSW",
  // Where booking requests and questionnaires are sent.
  // 1. Create a free form at https://formspree.io and paste its endpoint here,
  //    e.g. "https://formspree.io/f/abcdwxyz". Submissions then arrive by email.
  // 2. Left empty, the site opens the visitor's email app with the answers
  //    filled in, addressed to contactEmail below.
  formEndpoint: "",
  contactEmail: "hello@homeforpaws.co", // TODO: set up this mailbox, or use an address you already have
  phone: "", // optional, e.g. "0400 000 000"

  // Admin HQ database (see ADMIN-SETUP.md). Both values come from
  // Supabase -> Project Settings -> API. The anon key is safe to publish:
  // the database rules only let visitors see public pets and send enquiries.
  // Leave empty to run in demo mode (data kept only in your own browser).
  supabaseUrl: "",
  supabaseAnonKey: "",

  // Used by the admin for owner messages and price estimates.
  siteUrl: "https://homeforpaws.co/",
  rates: { dogNight: 50, catNight: 35, otherNight: 35, extraPetNight: 25, dayCare: 40, dropIn: 25 },
};
