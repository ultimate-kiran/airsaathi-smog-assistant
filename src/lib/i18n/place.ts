import type { Lang } from "../types";

/** The hero: choosing a place, using the location, and the current reading. */
export interface PlaceStrings {
  heroTitle: string;
  heroLead: string;
  searchLabel: string;
  searchPlaceholder: string;
  useLocation: string;
  locating: string;
  noPlaces: string;
  tryThese: string;
  checking: (place: string) => string;
  aqiNow: string;
  srcModel: string;
  srcStation: (name: string, km: number) => string;
  /** median of several stations; km is the farthest one used */
  srcStations: (count: number, km: number) => string;
  srcUncertain: string;
  cigarettes: (n: number) => string;
  stepsTitle: string;
  steps: { title: string; text: string }[];
  locFound: (accuracy: string) => string;
  locApprox: (accuracy: string) => string;
  locDenied: string;
  locUnavailable: string;
  locTimeout: string;
  locUnsupported: string;
  locYours: string;
}

export const place: Record<Lang, PlaceStrings> = {
  en: {
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
    aqiNow: "AQI now",
    srcModel: "Model estimate (no station data), may differ from local readings",
    srcStation: (name, km) => `Station: ${name}, ${km} km away`,
    srcStations: (n, km) => `Median of ${n} stations within ${km} km`,
    srcUncertain: "Few or conflicting stations nearby, so treat this number as approximate.",
    cigarettes: (n) => `Breathing today's air is roughly like smoking ${n} cigarette${n === 1 ? "" : "s"}.`,
    stepsTitle: "How it works",
    steps: [
      {
        title: "Pick your place",
        text: "Search your city or use your location to see how clean the air is right now.",
      },
      {
        title: "Tell us about your home",
        text: "Who lives there, how you travel, what you cook on. It takes under a minute.",
      },
      {
        title: "Get a plan that fits",
        text: "The cleanest hours, steps ranked for your family, and what each one saves in PM2.5 and CO₂.",
      },
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
  },
  hi: {
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
    aqiNow: "अभी AQI",
    srcModel: "मॉडल का अनुमान (स्टेशन डेटा नहीं), स्थानीय रीडिंग से अलग हो सकता है",
    srcStation: (name, km) => `स्टेशन: ${name}, ${km} किमी दूर`,
    srcStations: (n, km) => `${km} किमी के भीतर ${n} स्टेशनों का मध्यमान`,
    srcUncertain: "आसपास स्टेशन कम हैं या उनकी रीडिंग अलग-अलग है, इसलिए इस संख्या को अनुमान मानें।",
    cigarettes: (n) => `आज की हवा में साँस लेना लगभग ${n} सिगरेट पीने जैसा है।`,
    stepsTitle: "यह कैसे काम करता है",
    steps: [
      { title: "अपनी जगह चुनें", text: "अपना शहर खोजें या लोकेशन इस्तेमाल करें और देखें कि अभी हवा कितनी साफ़ है।" },
      {
        title: "अपने घर के बारे में बताएँ",
        text: "घर में कौन रहता है, आप कैसे सफ़र करते हैं, खाना किस पर बनता है। एक मिनट से कम लगता है।",
      },
      {
        title: "अपने हिसाब का प्लान पाएँ",
        text: "सबसे साफ़ घंटे, आपके परिवार के लिए क्रम से कदम, और हर कदम से PM2.5 व CO₂ में कितनी बचत।",
      },
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
  },
};
