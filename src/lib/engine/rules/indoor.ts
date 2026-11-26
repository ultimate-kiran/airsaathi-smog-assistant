import { AQI, K, TIME } from "../constants";
import { L, WHO, makeAction, pct, r0, range, type Rule } from "../rule";

export const purifier: Rule = (c) => {
  if (c.aqi < AQI.PROTECT_FROM) return null;
  const before = c.avg.night * (c.p.windows === "open" ? K.F_OPEN : K.F_CLOSED);
  const avoided = before * K.PURIFIER_CUT * K.VENT.sleep * TIME.SLEEP_H;
  const has = c.p.hasPurifier;
  return makeAction(c, {
    id: "bedroom-purifier",
    group: "indoor",
    priority: c.prot + 14,
    title: has
      ? L("Run your purifier in the bedroom all night, door shut", "प्यूरीफ़ायर को पूरी रात बेडरूम में, दरवाज़ा बंद करके चलाएँ")
      : L("Set up one HEPA purifier in the bedroom", "बेडरूम में एक HEPA प्यूरीफ़ायर लगाएँ"),
    why: has
      ? L(
          "You spend about a third of your life asleep in one room, so that is the best place for the machine. Keep the door and windows closed, choose auto mode, and clean the pre-filter every two weeks.",
          "आप अपना लगभग एक-तिहाई जीवन एक कमरे में सोते हुए बिताते हैं, इसलिए मशीन के लिए यही सबसे अच्छी जगह है। दरवाज़ा-खिड़कियाँ बंद रखें, ऑटो मोड चुनें और प्री-फ़िल्टर हर दो हफ़्ते में साफ़ करें।",
        )
      : L(
          "You spend about a third of your life asleep in one room, so one purifier there does the most good. No budget? Tape four MERV-13 furnace filters around a box fan (a Corsi–Rosenthal box); tests show it cleans a room about as well as a mid-range purifier.",
          "आप अपना लगभग एक-तिहाई जीवन एक कमरे में सोकर बिताते हैं, इसलिए वहाँ एक प्यूरीफ़ायर सबसे ज़्यादा फ़ायदा देता है। बजट कम है? बॉक्स फ़ैन के चारों ओर चार MERV-13 फ़िल्टर लगाएँ (कॉर्सी–रोज़ेंथल बॉक्स); यह औसत प्यूरीफ़ायर जितना कमरा साफ़ करता है।",
        ),
    impact: { inhaledPm25Ug: avoided },
    assumption: L(
      `A right-sized HEPA purifier cuts indoor PM2.5 by about ${pct(K.PURIFIER_CUT)}% with doors and windows closed. ${TIME.SLEEP_H} hours of sleep at ${K.VENT.sleep} m³/h; night-time outdoor PM2.5 about ${r0(c.avg.night)} µg/m³.`,
      `सही आकार का HEPA प्यूरीफ़ायर बंद दरवाज़े-खिड़कियों में अंदर के PM2.5 को लगभग ${pct(K.PURIFIER_CUT)}% घटाता है। ${TIME.SLEEP_H} घंटे की नींद, ${K.VENT.sleep} m³/घंटा; रात का बाहरी PM2.5 लगभग ${r0(c.avg.night)} µg/m³।`,
    ),
    forWhom: [WHO.everyone],
  });
};

export const smartVentilation: Rule = (c) => {
  if (c.p.windows !== "open" || c.aqi < AQI.PROTECT_FROM) return null;
  const saved = c.avg.day * (K.F_OPEN - K.F_CLOSED) * K.VENT.rest * TIME.AWAKE_AT_HOME_H;
  const w = c.bestHour;
  const r = w ? range(w) : null;
  return makeAction(c, {
    id: "smart-ventilation",
    group: "indoor",
    priority: c.prot + 8,
    title: r
      ? L(`Keep windows shut, and air the house for 10 minutes at ${r.en}`, `खिड़कियाँ बंद रखें, और ${r.hi} 10 मिनट घर में हवा आने दें`)
      : L("Keep windows shut and air the house briefly", "खिड़कियाँ बंद रखें और थोड़ी देर के लिए हवा आने दें"),
    why: L(
      "Open windows let most of the outdoor smoke straight in. Sealing gaps with draught strips and airing once, in the cleanest hour, keeps stale indoor air from building up without inviting the worst of the smog.",
      "खुली खिड़कियाँ बाहर का ज़्यादातर धुआँ सीधे अंदर आने देती हैं। दरारें बंद करके और सबसे साफ़ घंटे में एक बार हवा देने से बासी हवा भी नहीं जमती और खराब हवा भी कम आती है।",
    ),
    impact: { inhaledPm25Ug: saved },
    assumption: L(
      `Indoor PM2.5 is about ${pct(K.F_OPEN)}% of outdoor with windows open and ${pct(K.F_CLOSED)}% when mostly closed. ${TIME.AWAKE_AT_HOME_H} hours at home at ${K.VENT.rest} m³/h; 24-hour outdoor PM2.5 about ${r0(c.avg.day)} µg/m³.`,
      `खिड़कियाँ खुली होने पर अंदर का PM2.5 बाहर का लगभग ${pct(K.F_OPEN)}% और ज़्यादातर बंद होने पर ${pct(K.F_CLOSED)}%। घर पर ${TIME.AWAKE_AT_HOME_H} घंटे, ${K.VENT.rest} m³/घंटा; 24 घंटे का बाहरी PM2.5 लगभग ${r0(c.avg.day)} µg/m³।`,
    ),
    window: w ?? undefined,
    forWhom: [WHO.everyone],
  });
};

export const airOutWhenClean: Rule = (c) => {
  if (c.aqi >= AQI.PROTECT_FROM) return null;
  return makeAction(c, {
    id: "air-out",
    group: "indoor",
    priority: 50,
    title: L("The air is fine right now: open the windows for 30 minutes", "अभी हवा ठीक है: 30 मिनट खिड़कियाँ खोलें"),
    why: L(
      "Clean outdoor air dilutes the cooking fumes, dust and carbon dioxide that collect inside. Do it now, before the evening haze settles.",
      "साफ़ बाहरी हवा घर में जमा खाना पकाने के धुएँ, धूल और कार्बन डाइऑक्साइड को हल्का करती है। शाम की धुंध से पहले अभी कर लें।",
    ),
    forWhom: [WHO.everyone],
  });
};
