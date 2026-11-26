import type { CommuteMode, CookingFuel, HeatingType, Lang, WindowHabit } from "../types";

/** The household questions and their summary. */
export interface FormStrings {
  formTitle: string;
  formLead: string;
  update: string;
  updating: string;
  household: string;
  adults: string;
  children: string;
  elders: string;
  respiratory: string;
  heart: string;
  pregnant: string;
  healthPrompt: string;
  commute: string;
  mode: Record<CommuteMode, string>;
  km: string;
  home: string;
  cooking: Record<CookingFuel, string>;
  cookingLabel: string;
  heating: Record<HeatingType, string>;
  heatingLabel: string;
  purifier: string;
  windows: string;
  windowHabit: Record<WindowHabit, string>;
  exercise: string;
  exerciseOutdoor: string;
  minutes: string;
  pickPlaceFirst: string;
  editHousehold: string;
  buildPlan: string;
  useTypical: string;
}

export const form: Record<Lang, FormStrings> = {
  en: {
    formTitle: "Your household",
    formLead: "A minute of answers makes the plan fit your home.",
    update: "Update my plan",
    updating: "Updating…",
    household: "Who lives here",
    adults: "Adults",
    children: "Children",
    elders: "Older adults (60+)",
    respiratory: "Asthma or lung disease",
    heart: "Heart disease",
    pregnant: "Someone is pregnant",
    healthPrompt: "Does anyone here live with:",
    commute: "Daily travel",
    mode: { car: "Car", bike: "Two-wheeler", bus: "Bus", metro: "Metro", walk: "On foot", wfh: "Work from home" },
    km: "Distance each way (km)",
    home: "At home",
    cooking: { lpg: "LPG", png: "Piped gas", induction: "Induction", biomass: "Wood, dung or crop waste" },
    cookingLabel: "Cooking fuel",
    heating: { none: "None", electric: "Electric heater", biomass: "Wood or coal fire" },
    heatingLabel: "Winter heating",
    purifier: "We have an air purifier",
    windows: "Windows",
    windowHabit: { open: "Often open", "mostly-closed": "Mostly closed" },
    exercise: "Exercise",
    exerciseOutdoor: "Someone exercises outdoors",
    minutes: "Minutes per session",
    pickPlaceFirst: "Choose a place first.",
    editHousehold: "Change household details",
    buildPlan: "Build my plan",
    useTypical: "Or use a typical household",
  },
  hi: {
    formTitle: "आपका परिवार",
    formLead: "एक मिनट के जवाब प्लान को आपके घर के हिसाब से बनाते हैं।",
    update: "मेरा प्लान अपडेट करें",
    updating: "अपडेट हो रहा है…",
    household: "घर में कौन रहता है",
    adults: "वयस्क",
    children: "बच्चे",
    elders: "बुज़ुर्ग (60+)",
    respiratory: "दमा या फेफड़ों की बीमारी",
    heart: "दिल की बीमारी",
    pregnant: "कोई गर्भवती है",
    healthPrompt: "क्या घर में किसी को है:",
    commute: "रोज़ का सफ़र",
    mode: { car: "कार", bike: "दोपहिया", bus: "बस", metro: "मेट्रो", walk: "पैदल", wfh: "घर से काम" },
    km: "एक तरफ़ की दूरी (किमी)",
    home: "घर में",
    cooking: { lpg: "LPG", png: "पाइप गैस", induction: "इंडक्शन", biomass: "लकड़ी, उपले या फ़सल का कचरा" },
    cookingLabel: "खाना पकाने का ईंधन",
    heating: { none: "कुछ नहीं", electric: "इलेक्ट्रिक हीटर", biomass: "लकड़ी या कोयले की आग" },
    heatingLabel: "सर्दियों में गर्माहट",
    purifier: "हमारे पास एयर प्यूरीफ़ायर है",
    windows: "खिड़कियाँ",
    windowHabit: { open: "अक्सर खुली", "mostly-closed": "ज़्यादातर बंद" },
    exercise: "कसरत",
    exerciseOutdoor: "कोई बाहर कसरत करता है",
    minutes: "हर बार कितने मिनट",
    pickPlaceFirst: "पहले जगह चुनें।",
    editHousehold: "परिवार की जानकारी बदलें",
    buildPlan: "मेरा प्लान बनाएँ",
    useTypical: "या सामान्य परिवार का प्लान देखें",
  },
};
