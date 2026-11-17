// Every pet profile on the site lives here.
// status: "adoptable" = shelter pet looking for a home
//         "guest"     = a pet staying with us for pet sitting
// photo: path to an image in assets/pets/ (optional; a drawn placeholder shows if empty)
// goodWith: true / false / null (null = not known yet)
//
// The pets below are SAMPLES so the site has something to show.
// Replace them with real pets after the shelter visit.
window.HFP_PETS = [
  {
    id: "biscuit",
    status: "adoptable",
    sample: true,
    name: "Biscuit",
    species: "Dog",
    breed: "Kelpie cross",
    age: "3 years",
    sex: "Male",
    size: "Medium",
    photo: "",
    colour: "#e9b872",
    traits: ["Loves fetch", "Fast learner", "Gentle"],
    goodWith: { kids: true, dogs: true, cats: null },
    story:
      "Biscuit came to the shelter when his family moved overseas. He is a happy, bouncy boy who knows sit, drop and shake, and would love an active family with a yard.",
    needs: "Needs daily runs and a securely fenced yard.",
    shelter: "Partner shelter, Leumeah",
    enquire: "",
  },
  {
    id: "mittens",
    status: "adoptable",
    sample: true,
    name: "Mittens",
    species: "Cat",
    breed: "Domestic shorthair",
    age: "6 years",
    sex: "Female",
    size: "Small",
    photo: "",
    colour: "#9fb7a8",
    traits: ["Lap cat", "Quiet", "Chatty at dinner time"],
    goodWith: { kids: true, dogs: false, cats: true },
    story:
      "Mittens is a calm older lady who has been waiting longer than most. She likes sunny windowsills, soft blankets and a slow chin scratch.",
    needs: "Best as an indoor cat in a home without dogs.",
    shelter: "Partner shelter, Leumeah",
    enquire: "",
  },
  {
    id: "rex",
    status: "adoptable",
    sample: true,
    name: "Rex",
    species: "Dog",
    breed: "Staffy cross",
    age: "8 years",
    sex: "Male",
    size: "Medium",
    photo: "",
    colour: "#c99a8b",
    traits: ["Couch potato", "Loves people", "Snores"],
    goodWith: { kids: true, dogs: null, cats: false },
    story:
      "Rex is a senior gentleman with a huge heart. Short walks, long naps and being near his people are all he asks for.",
    needs: "On joint supplements; vet history available from the shelter.",
    shelter: "Partner shelter, Leumeah",
    enquire: "",
  },
  {
    id: "luna",
    status: "guest",
    sample: true,
    name: "Luna",
    species: "Dog",
    breed: "Cavoodle",
    age: "2 years",
    sex: "Female",
    size: "Small",
    photo: "",
    colour: "#b8a9d9",
    traits: ["Zoomies at 6pm", "Afraid of thunder", "Squeaky toy fan"],
    goodWith: { kids: true, dogs: true, cats: true },
    story:
      "Luna is staying with us while her family is on holiday. She settled in on the first night and has claimed the bean bag.",
    stay: "Holiday stay, 7 nights",
    updates: [
      "Day 1: Explored every corner of the yard, then a big nap.",
      "Day 2: Beach-towel tug of war champion. Ate all her dinner.",
    ],
  },
];
