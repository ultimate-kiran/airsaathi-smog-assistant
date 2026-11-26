import { AQI } from "../constants";
import { L, WHO, makeAction, type Rule } from "../rule";

export const sensitivePlan: Rule = (c) => {
  if (!c.sensitive || c.aqi < AQI.PROTECT_FROM) return null;
  return makeAction(c, {
    id: "sensitive-plan",
    group: "health",
    priority: c.prot + 32,
    title: L("Keep medicines and your doctor's action plan within reach", "दवाइयाँ और डॉक्टर की एक्शन प्लान हाथ के पास रखें"),
    why: L(
      "Smog days are when asthma, COPD and heart conditions flare. Keep the reliever inhaler and regular medicines stocked, avoid hard effort outdoors, and know the warning signs: breathlessness, wheeze, chest tightness or unusual tiredness. If they appear and do not settle with your usual medicine, contact your doctor or an emergency service.",
      "स्मॉग के दिनों में दमा, COPD और दिल की बीमारियाँ बढ़ जाती हैं। रिलीवर इन्हेलर और नियमित दवाइयाँ पर्याप्त रखें, बाहर भारी मेहनत से बचें और चेतावनी के संकेत पहचानें: साँस फूलना, घरघराहट, सीने में जकड़न या असामान्य थकान। ये दिखें और आपकी दवा से न थमें तो डॉक्टर या आपातकालीन सेवा से संपर्क करें।",
    ),
    forWhom: [WHO.sensitive],
  });
};

export const wasteBurning: Rule = (c) => {
  if (c.aqi < AQI.OPEN_BURNING_FROM) return null;
  return makeAction(c, {
    id: "no-open-burning",
    group: "community",
    priority: 30,
    title: L("Do not burn leaves or rubbish, and tell your society to stop it", "पत्ते या कचरा न जलाएँ, और अपनी सोसायटी में भी रुकवाएँ"),
    why: L(
      "Small fires of leaves, plastic and trash smoulder for hours and release fine particles and toxic fumes right where people live. Ask your RWA, school or guards to arrange waste collection instead, and report open burning through your city helpline or the CPCB Sameer app.",
      "पत्तों, प्लास्टिक और कचरे की छोटी आग घंटों सुलगती है और ठीक वहीं महीन कण और ज़हरीला धुआँ छोड़ती है जहाँ लोग रहते हैं। RWA, स्कूल या गार्ड से कचरा उठवाने को कहें और खुले में जलाने की शिकायत शहर की हेल्पलाइन या CPCB के समीर ऐप पर करें।",
    ),
    forWhom: [WHO.everyone],
  });
};
