import type { ActionGroup, CommuteMode, CookingFuel, ErrorCode, HeatingType, Lang, WindowHabit } from "./types";

type Strings = {
  tagline: string;
  heroTitle: string;
  heroLead: string;
  searchLabel: string;
  searchPlaceholder: string;
  useLocation: string;
  locating: string;
  noPlaces: string;
  tryThese: string;
  checking: (place: string) => string;
  retry: string;
  skip: string;
  aqiNow: string;
  srcModel: string;
  srcStation: (name: string, km: number) => string;
  /** median of several stations; km is the farthest one used */
  srcStations: (count: number, km: number) => string;
  srcUncertain: string;
  cigarettes: (n: number) => string;
  cleanest: string;
  worst: string;
  allDay: string;
  hourlyTitle: string;
  hourlyHint: string;
  startHere: string;
  more: string;
  groups: Record<ActionGroup, string>;
  forLabel: string;
  forHousehold: string;
  howCalculated: string;
  noNumbers: string;
  pickOne: string;
  didThis: string;
  inhaled: (ug: number) => string;
  cigEq: (n: number) => string;
  co2: (kg: number) => string;
  totalsTitle: string;
  totalsLead: string;
  trackerTitle: string;
  trackerEmpty: string;
  today: string;
  streak: (n: number) => string;
  last7: string;
  askTitle: string;
  askLead: string;
  askPlaceholder: string;
  askButton: string;
  asking: string;
  suggestions: string[];
  shareTitle: string;
  shareWhatsApp: string;
  copy: string;
  copied: string;
  formTitle: string;
  update: string;
  updating: string;
  household: string;
  adults: string;
  children: string;
  elders: string;
  respiratory: string;
  heart: string;
  pregnant: string;
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
  disclaimer: string;
  privacy: string;
  sources: string;
  aiOn: string;
  aiOff: string;
  aiOffHint: string;
  tipsTitle: string;
  language: string;
  pickPlaceFirst: string;
  editHousehold: string;
  buildPlan: string;
  useTypical: string;
  formLead: string;
  healthPrompt: string;
  cancel: string;
  stepsTitle: string;
  steps: { title: string; text: string }[];
  locFound: (accuracy: string) => string;
  locApprox: (accuracy: string) => string;
  locDenied: string;
  locUnavailable: string;
  locTimeout: string;
  locUnsupported: string;
  locYours: string;
  units: { km: string; min: string; kg: string };
  lessBreathed: string;
  lessEmitted: string;
  aiWriting: string;
  errors: Record<ErrorCode, string>;
};

export const UI: Record<Lang, Strings> = {
  en: {
    tagline: "Smog plans for your family",
    heroTitle: "Know today's air. Know what to do about it.",
    heroLead:
      "Pick your city and tell us a little about your household. You get a plan for today that says when to go out, how to keep the air inside clean, and what each choice saves you.",
    searchLabel: "City or area",
    searchPlaceholder: "Search a city, for example Delhi",
    useLocation: "Use my location",
    locating: "Finding you…",
    noPlaces: "No match. Try a bigger city nearby.",
    tryThese: "Try",
    checking: (p) => `Checking the air in ${p}…`,
    retry: "Try again",
    skip: "Skip to your plan",
    aqiNow: "AQI now",
    srcModel: "Model estimate (no station data), may differ from local readings",
    srcStation: (name, km) => `Station: ${name}, ${km} km away`,
    srcStations: (n, km) => `Median of ${n} stations within ${km} km`,
    srcUncertain: "Few or conflicting stations nearby, so treat this number as approximate.",
    cigarettes: (n) => `Breathing today's air is roughly like smoking ${n} cigarette${n === 1 ? "" : "s"}.`,
    cleanest: "Cleanest hour",
    worst: "Worst stretch",
    allDay: "most of the day",
    hourlyTitle: "The next 24 hours",
    hourlyHint: "Taller and darker means dirtier air. Plan outings around the shaded low points.",
    startHere: "Start here",
    more: "More ways to cut your exposure",
    groups: {
      health: "Protect the most sensitive",
      move: "Getting around",
      outdoor: "Time outdoors",
      indoor: "Indoor air",
      kitchen: "Kitchen and heating",
      community: "Your street and society",
    },
    forLabel: "For",
    forHousehold: "For your household",
    howCalculated: "How this is calculated",
    noNumbers: "No single number fits this one, so we do not invent one. The reason is above.",
    pickOne: "Pick one of these ways to commute.",
    didThis: "I did this today",
    inhaled: (ug) => `${ug.toLocaleString("en-IN")} µg less PM2.5 inhaled a day`,
    cigEq: (n) => `about ${n} cigarette${n === 1 ? "" : "s"}' worth`,
    co2: (kg) => `${kg} kg less CO₂ a day`,
    totalsTitle: "If you follow today's plan",
    totalsLead: "Estimated daily effect of the steps below, counting one commute option only.",
    trackerTitle: "Your impact so far",
    trackerEmpty: "Tick the steps you take and your savings add up here.",
    today: "Today",
    streak: (n) => (n > 0 ? `${n}-day streak` : "No streak yet"),
    last7: "Last 7 days: PM2.5 you avoided breathing",
    askTitle: "Ask about your air",
    askLead: "Questions are answered with today's numbers for your place and household.",
    askPlaceholder: "For example: can the kids play outside today?",
    askButton: "Ask",
    asking: "Thinking…",
    suggestions: [
      "Can the kids play outside today?",
      "Is it safe to open the windows?",
      "Which mask should we buy?",
      "Should my parents go for their morning walk?",
    ],
    shareTitle: "Share with your family or society",
    shareWhatsApp: "Share on WhatsApp",
    copy: "Copy text",
    copied: "Copied",
    formTitle: "Your household",
    update: "Update my plan",
    updating: "Updating…",
    household: "Who lives here",
    adults: "Adults",
    children: "Children",
    elders: "Older adults (60+)",
    respiratory: "Asthma or lung disease",
    heart: "Heart disease",
    pregnant: "Someone is pregnant",
    commute: "Daily travel",
    mode: { car: "Car", bike: "Two-wheeler", bus: "Bus", metro: "Metro", walk: "On foot", wfh: "Work from home" },
    km: "Distance each way (km)",
    home: "At home",
    cookingLabel: "Cooking fuel",
    cooking: { lpg: "LPG", png: "Piped gas", induction: "Induction", biomass: "Wood, dung or crop waste" },
    heatingLabel: "Winter heating",
    heating: { none: "None", electric: "Electric heater", biomass: "Wood or coal fire" },
    purifier: "We have an air purifier",
    windows: "Windows",
    windowHabit: { open: "Often open", "mostly-closed": "Mostly closed" },
    exercise: "Exercise",
    exerciseOutdoor: "Someone exercises outdoors",
    minutes: "Minutes per session",
    disclaimer:
      "These are estimates to help you choose, not medical advice. If anyone has trouble breathing, chest pain or severe symptoms, contact a doctor or emergency service.",
    privacy:
      "Your household details stay in this browser. When you ask for a plan they are sent to our server and, if AI is on, to the AI provider (OpenAI or Google Gemini) to write the explanation. We do not store them.",
    sources:
      "Air data, in order of preference: station readings from OpenAQ (CPCB and state pollution boards), then the nearest WAQI station, then Open-Meteo (CAMS satellite and chemistry model, roughly 40 km grid). The line under the AQI says which one you are seeing. A model estimate can differ from your local station, especially on the coast, and stations can be far away or offline. AQI follows India's CPCB scale, applied to hourly PM2.5 and PM10 only (no ozone). Emission and exposure factors are rounded published values; each step shows its assumptions.",
    aiOn: "Explanations written by AI. Every number comes from the app's own calculations.",
    aiOff: "Basic mode: explanations come from built-in rules.",
    aiOffHint: "Add an OpenAI or Gemini API key to turn on personalised AI explanations.",
    tipsTitle: "Also worth doing",
    language: "Language",
    pickPlaceFirst: "Choose a place first.",
    editHousehold: "Change household details",
    buildPlan: "Build my plan",
    useTypical: "Or use a typical household",
    formLead: "A minute of answers makes the plan fit your home.",
    healthPrompt: "Does anyone here live with:",
    cancel: "Cancel",
    stepsTitle: "How it works",
    steps: [
      { title: "Pick your place", text: "Search your city or use your location to see how clean the air is right now." },
      { title: "Tell us about your home", text: "Who lives there, how you travel, what you cook on. It takes under a minute." },
      { title: "Get a plan that fits", text: "The cleanest hours, steps ranked for your family, and what each one saves in PM2.5 and CO₂." },
    ],
    locFound: (a) => `Location found, accurate to about ${a}. Air data comes from the stations nearest to you.`,
    locApprox: (a) =>
      `Your device shared only an approximate location (about ${a}). For a closer match, search your area by name.`,
    locDenied:
      "Location access is blocked for this site. Click the lock icon in the address bar and allow Location, or search for your city.",
    locUnavailable:
      "Your device could not work out where you are. Turn on Location in your device settings (on Windows: Settings, Privacy and security, Location; in Brave also allow Google location services under Settings, Privacy and security), or search for your city.",
    locTimeout: "Finding your location took too long. Try again, or search for your city.",
    locUnsupported: "Your browser cannot share its location. Search for your city instead.",
    locYours: "Your location",
    units: { km: "km", min: "min", kg: "kg" },
    lessBreathed: "less breathed in",
    lessEmitted: "less emitted",
    aiWriting: "Writing a personalised explanation…",
    errors: {
      rate_limited: "Too many requests. Wait a minute and try again.",
      too_large: "That request was too large.",
      bad_json: "Something went wrong sending your details. Try again.",
      invalid: "Some details are not valid. Check them and try again.",
      air_unavailable: "Air quality data is not available for this place right now. Try again in a minute.",
      lookup_unavailable: "This lookup is unavailable right now. Try again shortly.",
      not_found: "Nothing was found.",
      outside_india: "Only places in India are supported.",
      ai_unavailable: "AI explanations are unavailable right now.",
      network: "Could not reach the server. Check your connection and try again.",
    },
  },
  hi: {
    tagline: "आपके परिवार के लिए स्मॉग प्लान",
    heroTitle: "आज की हवा जानें। और जानें क्या करना है।",
    heroLead:
      "अपना शहर चुनें और घर के बारे में थोड़ा बताएँ। आपको आज का प्लान मिलेगा: कब बाहर जाएँ, घर की हवा साफ़ कैसे रखें, और हर चुनाव से क्या फ़ायदा होगा।",
    searchLabel: "शहर या इलाक़ा",
    searchPlaceholder: "शहर खोजें, जैसे Delhi",
    useLocation: "मेरी लोकेशन इस्तेमाल करें",
    locating: "लोकेशन खोज रहे हैं…",
    noPlaces: "कोई नतीजा नहीं। पास का बड़ा शहर आज़माएँ।",
    tryThese: "आज़माएँ",
    checking: (p) => `${p} की हवा देख रहे हैं…`,
    retry: "फिर कोशिश करें",
    skip: "सीधे अपने प्लान पर जाएँ",
    aqiNow: "अभी AQI",
    srcModel: "मॉडल का अनुमान (स्टेशन डेटा नहीं), स्थानीय रीडिंग से अलग हो सकता है",
    srcStation: (name, km) => `स्टेशन: ${name}, ${km} किमी दूर`,
    srcStations: (n, km) => `${km} किमी के भीतर ${n} स्टेशनों का मध्यमान`,
    srcUncertain: "आसपास स्टेशन कम हैं या उनकी रीडिंग अलग-अलग है, इसलिए इस संख्या को अनुमान मानें।",
    cigarettes: (n) => `आज की हवा में साँस लेना लगभग ${n} सिगरेट पीने जैसा है।`,
    cleanest: "सबसे साफ़ घंटा",
    worst: "सबसे खराब समय",
    allDay: "दिन का ज़्यादातर हिस्सा",
    hourlyTitle: "अगले 24 घंटे",
    hourlyHint: "ऊँची और गहरी पट्टी का मतलब ज़्यादा गंदी हवा। बाहर का काम कम पट्टियों के समय रखें।",
    startHere: "यहाँ से शुरू करें",
    more: "एक्सपोज़र घटाने के और तरीके",
    groups: {
      health: "सबसे संवेदनशील लोगों की सुरक्षा",
      move: "आना-जाना",
      outdoor: "बाहर बिताया समय",
      indoor: "घर की हवा",
      kitchen: "रसोई और गर्माहट",
      community: "आपकी गली और सोसायटी",
    },
    forLabel: "किसके लिए",
    forHousehold: "आपके परिवार के लिए",
    howCalculated: "यह कैसे निकाला गया",
    noNumbers: "इसके लिए कोई एक सही संख्या नहीं बनती, इसलिए हम गढ़ते नहीं। कारण ऊपर है।",
    pickOne: "आने-जाने के इन तरीकों में से एक चुनें।",
    didThis: "आज मैंने यह किया",
    inhaled: (ug) => `रोज़ ${ug.toLocaleString("en-IN")} µg कम PM2.5 साँस में`,
    cigEq: (n) => `लगभग ${n} सिगरेट के बराबर`,
    co2: (kg) => `रोज़ ${kg} किग्रा कम CO₂`,
    totalsTitle: "अगर आप आज का प्लान अपनाएँ",
    totalsLead: "नीचे के कदमों का अनुमानित रोज़ का असर, आने-जाने का सिर्फ़ एक विकल्प गिना गया है।",
    trackerTitle: "अब तक का आपका असर",
    trackerEmpty: "जो कदम आप उठाएँ उन पर टिक करें, बचत यहाँ जुड़ती जाएगी।",
    today: "आज",
    streak: (n) => (n > 0 ? `${n} दिन लगातार` : "अभी कोई स्ट्रीक नहीं"),
    last7: "पिछले 7 दिन: आपने जितना PM2.5 साँस में जाने से बचाया",
    askTitle: "अपनी हवा के बारे में पूछें",
    askLead: "जवाब आपके इलाक़े और परिवार के लिए आज के आँकड़ों से दिए जाते हैं।",
    askPlaceholder: "जैसे: क्या आज बच्चे बाहर खेल सकते हैं?",
    askButton: "पूछें",
    asking: "सोच रहे हैं…",
    suggestions: [
      "क्या आज बच्चे बाहर खेल सकते हैं?",
      "क्या खिड़कियाँ खोलना ठीक है?",
      "कौन सा मास्क लें?",
      "क्या मम्मी-पापा सुबह की सैर पर जाएँ?",
    ],
    shareTitle: "परिवार या सोसायटी के साथ साझा करें",
    shareWhatsApp: "WhatsApp पर भेजें",
    copy: "टेक्स्ट कॉपी करें",
    copied: "कॉपी हो गया",
    formTitle: "आपका परिवार",
    update: "मेरा प्लान अपडेट करें",
    updating: "अपडेट हो रहा है…",
    household: "घर में कौन रहता है",
    adults: "वयस्क",
    children: "बच्चे",
    elders: "बुज़ुर्ग (60+)",
    respiratory: "दमा या फेफड़ों की बीमारी",
    heart: "दिल की बीमारी",
    pregnant: "कोई गर्भवती है",
    commute: "रोज़ का सफ़र",
    mode: { car: "कार", bike: "दोपहिया", bus: "बस", metro: "मेट्रो", walk: "पैदल", wfh: "घर से काम" },
    km: "एक तरफ़ की दूरी (किमी)",
    home: "घर में",
    cookingLabel: "खाना पकाने का ईंधन",
    cooking: { lpg: "LPG", png: "पाइप गैस", induction: "इंडक्शन", biomass: "लकड़ी, उपले या फ़सल का कचरा" },
    heatingLabel: "सर्दियों में गर्माहट",
    heating: { none: "कुछ नहीं", electric: "इलेक्ट्रिक हीटर", biomass: "लकड़ी या कोयले की आग" },
    purifier: "हमारे पास एयर प्यूरीफ़ायर है",
    windows: "खिड़कियाँ",
    windowHabit: { open: "अक्सर खुली", "mostly-closed": "ज़्यादातर बंद" },
    exercise: "कसरत",
    exerciseOutdoor: "कोई बाहर कसरत करता है",
    minutes: "हर बार कितने मिनट",
    disclaimer:
      "ये अनुमान चुनाव में मदद के लिए हैं, चिकित्सकीय सलाह नहीं। साँस लेने में तकलीफ़, सीने में दर्द या गंभीर लक्षण हों तो डॉक्टर या आपातकालीन सेवा से संपर्क करें।",
    privacy:
      "आपके परिवार की जानकारी इसी ब्राउज़र में रहती है। प्लान माँगने पर वह हमारे सर्वर को और AI चालू हो तो AI सेवा (OpenAI या Google Gemini) को भेजी जाती है। हम उसे सहेजते नहीं।",
    sources:
      "हवा का डेटा, प्राथमिकता के क्रम में: OpenAQ (CPCB और राज्य प्रदूषण बोर्ड) की स्टेशन रीडिंग, फिर सबसे नज़दीकी WAQI स्टेशन, फिर Open-Meteo (CAMS उपग्रह और रसायन मॉडल, लगभग 40 किमी का ग्रिड)। AQI के नीचे की पंक्ति बताती है कि आप कौन-सा स्रोत देख रहे हैं। मॉडल का अनुमान आपके स्थानीय स्टेशन से अलग हो सकता है, ख़ासकर तटीय इलाक़ों में, और स्टेशन दूर या बंद हो सकते हैं। AQI भारत के CPCB पैमाने पर सिर्फ़ घंटे के PM2.5 और PM10 से निकाला गया है (ओज़ोन शामिल नहीं)। उत्सर्जन और एक्सपोज़र के मान प्रकाशित मानों के पूर्णांक हैं; हर कदम में उसकी मान्यताएँ दिखती हैं।",
    aiOn: "व्याख्याएँ AI ने लिखी हैं। हर संख्या ऐप की अपनी गणना से आती है।",
    aiOff: "बेसिक मोड: व्याख्याएँ बने-बनाए नियमों से आती हैं।",
    aiOffHint: "व्यक्तिगत AI व्याख्या के लिए OpenAI या Gemini API key जोड़ें।",
    tipsTitle: "ये भी करें",
    language: "भाषा",
    pickPlaceFirst: "पहले जगह चुनें।",
    editHousehold: "परिवार की जानकारी बदलें",
    buildPlan: "मेरा प्लान बनाएँ",
    useTypical: "या सामान्य परिवार का प्लान देखें",
    formLead: "एक मिनट के जवाब प्लान को आपके घर के हिसाब से बनाते हैं।",
    healthPrompt: "क्या घर में किसी को है:",
    cancel: "रद्द करें",
    stepsTitle: "यह कैसे काम करता है",
    steps: [
      { title: "अपनी जगह चुनें", text: "अपना शहर खोजें या लोकेशन इस्तेमाल करें और देखें कि अभी हवा कितनी साफ़ है।" },
      { title: "अपने घर के बारे में बताएँ", text: "घर में कौन रहता है, आप कैसे सफ़र करते हैं, खाना किस पर बनता है। एक मिनट से कम लगता है।" },
      { title: "अपने हिसाब का प्लान पाएँ", text: "सबसे साफ़ घंटे, आपके परिवार के लिए क्रम से कदम, और हर कदम से PM2.5 व CO₂ में कितनी बचत।" },
    ],
    locFound: (a) => `लोकेशन मिल गई, लगभग ${a} तक सटीक। हवा का डेटा आपके सबसे नज़दीकी स्टेशनों से आता है।`,
    locApprox: (a) =>
      `आपके डिवाइस ने सिर्फ़ अनुमानित लोकेशन दी (लगभग ${a})। बेहतर नतीजे के लिए अपने इलाक़े का नाम खोजें।`,
    locDenied:
      "इस साइट के लिए लोकेशन की अनुमति बंद है। एड्रेस बार में ताले के निशान पर क्लिक करके Location की अनुमति दें, या अपना शहर खोजें।",
    locUnavailable:
      "आपका डिवाइस आपकी लोकेशन नहीं ढूँढ पाया। डिवाइस की सेटिंग में Location चालू करें (Windows: Settings, Privacy and security, Location; Brave में Settings, Privacy and security के अंदर Google location services भी चालू करें), या अपना शहर खोजें।",
    locTimeout: "लोकेशन ढूँढने में बहुत देर लगी। फिर कोशिश करें, या अपना शहर खोजें।",
    locUnsupported: "आपका ब्राउज़र लोकेशन साझा नहीं कर सकता। अपना शहर खोजें।",
    locYours: "आपकी लोकेशन",
    units: { km: "किमी", min: "मिनट", kg: "किग्रा" },
    lessBreathed: "कम साँस में",
    lessEmitted: "कम उत्सर्जन",
    aiWriting: "आपके लिए व्याख्या लिखी जा रही है…",
    errors: {
      rate_limited: "बहुत ज़्यादा अनुरोध। एक मिनट रुककर फिर कोशिश करें।",
      too_large: "अनुरोध बहुत बड़ा था।",
      bad_json: "आपकी जानकारी भेजने में दिक्कत हुई। फिर कोशिश करें।",
      invalid: "कुछ जानकारी सही नहीं है। जाँचकर फिर कोशिश करें।",
      air_unavailable: "इस जगह का हवा का डेटा अभी उपलब्ध नहीं है। एक मिनट बाद फिर कोशिश करें।",
      lookup_unavailable: "यह खोज अभी उपलब्ध नहीं है। थोड़ी देर बाद कोशिश करें।",
      not_found: "कुछ नहीं मिला।",
      outside_india: "केवल भारत की जगहें समर्थित हैं।",
      ai_unavailable: "AI व्याख्या अभी उपलब्ध नहीं है।",
      network: "सर्वर से संपर्क नहीं हो सका। अपना कनेक्शन जाँचकर फिर कोशिश करें।",
    },
  },
};

export const SAMPLE_PLACES = [
  { name: "Delhi, India", short: "Delhi", lat: 28.6139, lon: 77.209 },
  { name: "Lucknow, Uttar Pradesh, India", short: "Lucknow", lat: 26.8467, lon: 80.9462 },
  { name: "Kolkata, West Bengal, India", short: "Kolkata", lat: 22.5726, lon: 88.3639 },
  { name: "Mumbai, Maharashtra, India", short: "Mumbai", lat: 19.076, lon: 72.8777 },
  { name: "Bengaluru, Karnataka, India", short: "Bengaluru", lat: 12.9716, lon: 77.5946 },
];
