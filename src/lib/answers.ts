import { formatRange } from "./format";
import type { Bilingual, Lang, PlanResponse } from "./types";

/**
 * Answers without AI. A question is matched to a topic; the answer is that topic's action from
 * today's plan when there is one, otherwise the topic's general advice. It never answers a mask
 * question with advice about something else.
 */
interface Topic {
  words: RegExp;
  ids: string[];
  general: (aqi: number) => Bilingual;
}

const TOPICS: Topic[] = [
  {
    words: /mask|n95|ffp|मास्क/i,
    ids: ["commute-mask"],
    general: (aqi) => ({
      en: `If you need to be out in smoky air, a fitted N95 or FFP2 mask filters fine particles; cloth and surgical masks barely do. Check the fit: it should seal around the nose and chin. Today's AQI is ${aqi}.`,
      hi: `धुएँ वाली हवा में बाहर जाना हो तो फ़िट N95 या FFP2 मास्क महीन कणों को रोकता है; कपड़े या सर्जिकल मास्क लगभग नहीं रोकते। देखें कि मास्क नाक और ठुड्डी पर ठीक से बैठे। आज AQI ${aqi} है।`,
    }),
  },
  {
    words: /kid|child|school|play|बच्च|स्कूल|खेल/i,
    ids: ["kids-play-window", "kids-play-indoors"],
    general: (aqi) => ({
      en: `Today's AQI is ${aqi}. Children can play outside as usual on clean days; on smoggy days keep hard running for the cleanest hour or indoors.`,
      hi: `आज AQI ${aqi} है। साफ़ दिनों में बच्चे सामान्य रूप से बाहर खेल सकते हैं; स्मॉग वाले दिन तेज़ दौड़-भाग सबसे साफ़ घंटे में या घर के अंदर रखें।`,
    }),
  },
  {
    words: /walk|exercise|run|gym|yoga|सैर|कसरत|दौड़/i,
    ids: ["exercise-window", "exercise-indoors", "elders-walk-window", "elders-walk-indoors"],
    general: (aqi) => ({
      en: `Today's AQI is ${aqi}. Exercise makes you breathe several times more air, so on smoggy days pick the cleanest hour or move it indoors.`,
      hi: `आज AQI ${aqi} है। कसरत में कई गुना ज़्यादा हवा साँस में जाती है, इसलिए स्मॉग वाले दिन सबसे साफ़ घंटा चुनें या घर के अंदर करें।`,
    }),
  },
  {
    words: /window|ventilat|open|air out|खिड़की|हवा/i,
    ids: ["smart-ventilation", "air-out"],
    general: (aqi) => ({
      en: `Today's AQI is ${aqi}. Air the house in the cleanest hour and keep windows mostly shut when the air outside is worse.`,
      hi: `आज AQI ${aqi} है। सबसे साफ़ घंटे में घर में हवा आने दें और बाहर हवा खराब हो तो खिड़कियाँ ज़्यादातर बंद रखें।`,
    }),
  },
  {
    words: /purifier|hepa|filter|प्यूरीफ़|फ़िल्टर/i,
    ids: ["bedroom-purifier"],
    general: (aqi) => ({
      en: `Today's AQI is ${aqi}. If you run one purifier, put it in the bedroom with the door shut.`,
      hi: `आज AQI ${aqi} है। एक ही प्यूरीफ़ायर हो तो उसे बेडरूम में दरवाज़ा बंद करके चलाएँ।`,
    }),
  },
  {
    words: /cook|stove|kitchen|gas|lpg|चूल्हा|रसोई|खाना/i,
    ids: ["clean-cooking", "kitchen-exhaust"],
    general: () => ({
      en: "Cook with the exhaust fan or chimney on, or a window open a little, to take fumes out at the source.",
      hi: "धुएँ को स्रोत पर ही निकालने के लिए चिमनी या एग्ज़ॉस्ट फ़ैन चलाकर, या खिड़की थोड़ी खोलकर खाना बनाएँ।",
    }),
  },
  {
    words: /heat|fire|coal|wood|हीटर|अँगीठी|आग/i,
    ids: ["stop-indoor-burning"],
    general: () => ({
      en: "Avoid burning wood or coal indoors; warm layers and an electric heater keep you warm without smoke.",
      hi: "घर के अंदर लकड़ी या कोयला न जलाएँ; गर्म कपड़े और इलेक्ट्रिक हीटर बिना धुएँ के गर्म रखते हैं।",
    }),
  },
  {
    words: /asthma|inhaler|breath|doctor|pregnan|दमा|साँस|डॉक्टर|गर्भ/i,
    ids: ["sensitive-plan"],
    general: () => ({
      en: "For breathing trouble, chest pain or symptoms that do not settle, contact a doctor or an emergency service.",
      hi: "साँस में तकलीफ़, सीने में दर्द या न थमने वाले लक्षण हों तो डॉक्टर या आपातकालीन सेवा से संपर्क करें।",
    }),
  },
  {
    words: /car|metro|bus|commute|drive|office|कार|मेट्रो|बस|दफ़्तर/i,
    ids: ["wfh-severe", "car-to-transit", "carpool", "commute-mask"],
    general: (aqi) => ({
      en: `Today's AQI is ${aqi}. Shared transit cuts emissions per person, and a fitted N95 helps if you are out in traffic.`,
      hi: `आज AQI ${aqi} है। साझा परिवहन से प्रति व्यक्ति उत्सर्जन घटता है, और ट्रैफ़िक में फ़िट N95 मदद करता है।`,
    }),
  },
];

export function ruleAnswer(question: string, plan: PlanResponse, lang: Lang): string {
  const topic = TOPICS.find((t) => t.words.test(question));
  const window = plan.bestWindow ? formatRange(plan.bestWindow, lang) : null;
  const windowLine = window
    ? lang === "hi"
      ? ` सबसे साफ़ समय ${window} है।`
      : ` The cleanest hours today are ${window}.`
    : "";

  if (topic) {
    const action = plan.actions.find((a) => topic.ids.includes(a.id));
    if (action) return `${action.title}. ${action.why}${windowLine}`;
    return `${topic.general(plan.aqi.value)[lang]}${windowLine}`;
  }
  const top = plan.actions[0];
  if (top) return `${top.title}. ${top.why}${windowLine}`;
  return lang === "hi"
    ? "आज हवा ठीक है। सामान्य सावधानियाँ काफ़ी हैं।"
    : "The air looks fine today, so normal routines are fine.";
}
