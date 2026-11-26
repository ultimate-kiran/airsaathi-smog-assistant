import type { ErrorCode, Lang } from "../types";

/** Shared across the app: header, footer, units and error messages. */
export interface CommonStrings {
  tagline: string;
  skip: string;
  language: string;
  disclaimer: string;
  privacy: string;
  sources: string;
  units: { km: string; min: string; kg: string };
  errors: Record<ErrorCode, string>;
  retry: string;
  cancel: string;
}

export const common: Record<Lang, CommonStrings> = {
  en: {
    tagline: "Smog plans for your family",
    skip: "Skip to your plan",
    language: "Language",
    disclaimer:
      "These are estimates to help you choose, not medical advice. If anyone has trouble breathing, chest pain or severe symptoms, contact a doctor or emergency service.",
    privacy:
      "Your household details stay in this browser. When you ask for a plan they are sent to our server and, if AI is on, to the AI provider (OpenAI or Google Gemini) to write the explanation. We do not store them.",
    sources:
      "Air data, in order of preference: station readings from OpenAQ (CPCB and state pollution boards), then the nearest WAQI station, then Open-Meteo (CAMS satellite and chemistry model, roughly 40 km grid). The line under the AQI says which one you are seeing. A model estimate can differ from your local station, especially on the coast, and stations can be far away or offline. AQI follows India's CPCB scale, applied to hourly PM2.5 and PM10 only (no ozone). Emission and exposure factors are rounded published values; each step shows its assumptions.",
    units: { km: "km", min: "min", kg: "kg" },
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
      stale: "The air data has just been updated. Loading the new plan…",
      internal: "Something went wrong on our side. Try again in a moment.",
      network: "Could not reach the server. Check your connection and try again.",
    },
    retry: "Try again",
    cancel: "Cancel",
  },
  hi: {
    tagline: "आपके परिवार के लिए स्मॉग प्लान",
    skip: "सीधे अपने प्लान पर जाएँ",
    language: "भाषा",
    disclaimer:
      "ये अनुमान चुनाव में मदद के लिए हैं, चिकित्सकीय सलाह नहीं। साँस लेने में तकलीफ़, सीने में दर्द या गंभीर लक्षण हों तो डॉक्टर या आपातकालीन सेवा से संपर्क करें।",
    privacy:
      "आपके परिवार की जानकारी इसी ब्राउज़र में रहती है। प्लान माँगने पर वह हमारे सर्वर को और AI चालू हो तो AI सेवा (OpenAI या Google Gemini) को भेजी जाती है। हम उसे सहेजते नहीं।",
    sources:
      "हवा का डेटा, प्राथमिकता के क्रम में: OpenAQ (CPCB और राज्य प्रदूषण बोर्ड) की स्टेशन रीडिंग, फिर सबसे नज़दीकी WAQI स्टेशन, फिर Open-Meteo (CAMS उपग्रह और रसायन मॉडल, लगभग 40 किमी का ग्रिड)। AQI के नीचे की पंक्ति बताती है कि आप कौन-सा स्रोत देख रहे हैं। मॉडल का अनुमान आपके स्थानीय स्टेशन से अलग हो सकता है, ख़ासकर तटीय इलाक़ों में, और स्टेशन दूर या बंद हो सकते हैं। AQI भारत के CPCB पैमाने पर सिर्फ़ घंटे के PM2.5 और PM10 से निकाला गया है (ओज़ोन शामिल नहीं)। उत्सर्जन और एक्सपोज़र के मान प्रकाशित मानों के पूर्णांक हैं; हर कदम में उसकी मान्यताएँ दिखती हैं।",
    units: { km: "किमी", min: "मिनट", kg: "किग्रा" },
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
      stale: "हवा का डेटा अभी अपडेट हुआ है। नया प्लान लोड हो रहा है…",
      internal: "हमारी ओर से कुछ गड़बड़ हुई। थोड़ी देर में फिर कोशिश करें।",
      network: "सर्वर से संपर्क नहीं हो सका। अपना कनेक्शन जाँचकर फिर कोशिश करें।",
    },
    retry: "फिर कोशिश करें",
    cancel: "रद्द करें",
  },
};
