import type { ActionGroup, Lang } from "../types";

/** The plan: hourly chart, actions, totals, AI note and sharing. */
export interface PlanStrings {
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
  lessBreathed: string;
  lessEmitted: string;
  tipsTitle: string;
  aiOn: string;
  aiOff: string;
  aiOffHint: string;
  aiWriting: string;
  shareTitle: string;
  shareWhatsApp: string;
  copy: string;
  copied: string;
}

export const plan: Record<Lang, PlanStrings> = {
  en: {
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
    lessBreathed: "less breathed in",
    lessEmitted: "less emitted",
    tipsTitle: "Also worth doing",
    aiOn: "Explanations written by AI. Every number comes from the app's own calculations.",
    aiOff: "Basic mode: explanations come from built-in rules.",
    aiOffHint: "Add an OpenAI or Gemini API key to turn on personalised AI explanations.",
    aiWriting: "Writing a personalised explanation…",
    shareTitle: "Share with your family or society",
    shareWhatsApp: "Share on WhatsApp",
    copy: "Copy text",
    copied: "Copied",
  },
  hi: {
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
    lessBreathed: "कम साँस में",
    lessEmitted: "कम उत्सर्जन",
    tipsTitle: "ये भी करें",
    aiOn: "व्याख्याएँ AI ने लिखी हैं। हर संख्या ऐप की अपनी गणना से आती है।",
    aiOff: "बेसिक मोड: व्याख्याएँ बने-बनाए नियमों से आती हैं।",
    aiOffHint: "व्यक्तिगत AI व्याख्या के लिए OpenAI या Gemini API key जोड़ें।",
    aiWriting: "आपके लिए व्याख्या लिखी जा रही है…",
    shareTitle: "परिवार या सोसायटी के साथ साझा करें",
    shareWhatsApp: "WhatsApp पर भेजें",
    copy: "टेक्स्ट कॉपी करें",
    copied: "कॉपी हो गया",
  },
};
