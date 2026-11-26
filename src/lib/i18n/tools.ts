import type { Lang } from "../types";

/** The impact tracker and the question box. */
export interface ToolsStrings {
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
}

export const tools: Record<Lang, ToolsStrings> = {
  en: {
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
  },
  hi: {
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
  },
};
