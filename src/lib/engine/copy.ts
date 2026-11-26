import { formatRange, round1 } from "../format";
import type { Bilingual, HourRange } from "../types";
import { HOURS, K, TIME } from "./constants";
import type { ActionId } from "./priorities";

/**
 * Every sentence the engine shows, in English and Hindi, keyed by action id. Rules compute the
 * numbers and pass them in; nothing here decides anything. Translators and editors work in this
 * file only, and the "how this is calculated" text quotes the same constants the maths uses.
 */
export interface ActionText {
  title: Bilingual;
  why: Bilingual;
  assumption?: Bilingual;
}

const L = (en: string, hi: string): Bilingual => ({ en, hi });
const r0 = (n: number) => Math.round(n);
const pct = (fraction: number) => Math.round(fraction * 100);
const range = (w: HourRange): Bilingual => ({ en: formatRange(w, "en"), hi: formatRange(w, "hi") });

const EARLY = range({ start: HOURS.EARLY[0], end: HOURS.EARLY[HOURS.EARLY.length - 1] + 1 });
const EVENING = range({ start: HOURS.EVENING[0], end: HOURS.EVENING[HOURS.EVENING.length - 1] + 1 });

export const WHO = {
  everyone: L("Everyone", "सभी"),
  kids: L("Children", "बच्चे"),
  elders: L("Older adults", "बुज़ुर्ग"),
  sensitive: L("Anyone with asthma, heart disease or pregnancy", "दमा, दिल की बीमारी या गर्भावस्था वाले"),
  commuter: L("Commuter", "आने-जाने वाले"),
  exerciser: L("Whoever exercises outdoors", "बाहर कसरत करने वाले"),
  cook: L("Whoever cooks", "खाना बनाने वाले"),
};

interface IndoorsParams {
  bestAqi: number;
  outdoor: number;
  inside: number;
}

export const COPY = {
  "wfh-severe": (p: { aqi: number; kmDay: number; co2: number }) => ({
    title: L("Work from home today if you can", "हो सके तो आज घर से काम करें"),
    why: L(
      `AQI is ${p.aqi} today. Skipping the ${p.kmDay} km round trip avoids both your own exposure in traffic and about ${round1(p.co2)} kg of CO₂.`,
      `आज AQI ${p.aqi} है। ${p.kmDay} किमी का आना-जाना बचाने से ट्रैफ़िक में आपका एक्सपोज़र और लगभग ${round1(p.co2)} किग्रा CO₂ दोनों बचते हैं।`,
    ),
    assumption: L(
      `Emissions at ${K.EF.car} kg CO₂e per km (car) or ${K.EF.bike} (two-wheeler). Exposure counted for two-wheeler riders only, at ${TIME.BIKE_KMH} km/h.`,
      `कार ${K.EF.car} और दोपहिया ${K.EF.bike} किग्रा CO₂e/किमी। एक्सपोज़र केवल दोपहिया सवारों के लिए, ${TIME.BIKE_KMH} किमी/घंटा पर।`,
    ),
  }),

  "car-to-transit": (p: { km: number; kmDay: number }) => ({
    title: L("Take the metro or a bus instead of driving", "गाड़ी की जगह मेट्रो या बस लें"),
    why: L(
      `Your ${p.km} km each way by car puts about ${round1(p.kmDay * K.EF.car)} kg of CO₂ into the air every day. Shared transit brings that to about ${round1(p.kmDay * K.EF.transit)} kg per person, and takes one more engine off your street.`,
      `आपका हर तरफ़ ${p.km} किमी का कार सफ़र रोज़ लगभग ${round1(p.kmDay * K.EF.car)} किग्रा CO₂ छोड़ता है। मेट्रो/बस में यह प्रति व्यक्ति लगभग ${round1(p.kmDay * K.EF.transit)} किग्रा रह जाता है।`,
    ),
    assumption: L(
      `Car ${K.EF.car} kg CO₂e per km; metro or bus about ${K.EF.transit} kg per passenger-km. Typical published averages; your vehicle may differ.`,
      `कार ${K.EF.car} किग्रा CO₂e/किमी; मेट्रो या बस लगभग ${K.EF.transit} किग्रा प्रति यात्री-किमी। ये औसत मान हैं।`,
    ),
  }),

  carpool: (p: { kmDay: number }) => ({
    title: L("Share the ride with one more person", "एक और व्यक्ति के साथ कार शेयर करें"),
    why: L(
      "Two people in one car halve the exhaust per person. On days the metro is not an option, this is the next best step.",
      "एक कार में दो लोग होने से प्रति व्यक्ति धुआँ आधा हो जाता है। जिस दिन मेट्रो संभव न हो, यह अगला बेहतर कदम है।",
    ),
    assumption: L(
      `${p.kmDay} km a day at ${K.EF.car} kg CO₂e per km, split across two people.`,
      `रोज़ ${p.kmDay} किमी, ${K.EF.car} किग्रा CO₂e/किमी, दो लोगों में बँटा हुआ।`,
    ),
  }),

  "commute-mask": (p: { minutesOut: number; rushPm25: number }) => ({
    title: L("Wear a fitted N95 or FFP2 mask on your commute", "आने-जाने में फ़िट होने वाला N95 या FFP2 मास्क पहनें"),
    why: L(
      `You are in the open for about ${r0(p.minutesOut)} minutes a day at rush-hour PM2.5 near ${r0(p.rushPm25)} µg/m³. A cloth or surgical mask barely filters fine particles; a fitted N95 does.`,
      `आप रोज़ लगभग ${r0(p.minutesOut)} मिनट खुले में रहते हैं, जब PM2.5 लगभग ${r0(p.rushPm25)} µg/m³ होता है। कपड़े या सर्जिकल मास्क महीन कणों को लगभग नहीं रोकते; फ़िट N95 रोकता है।`,
    ),
    assumption: L(
      `Inhaled dose = PM2.5 × breathing volume × time. A well-fitted N95 blocks about ${pct(K.MASK_EFFECT)}% in daily use (lab rating is 95%). Beards and loose straps lower this.`,
      `साँस में गया डोज़ = PM2.5 × साँस की मात्रा × समय। अच्छी तरह फ़िट N95 रोज़मर्रा में लगभग ${pct(K.MASK_EFFECT)}% रोकता है (लैब रेटिंग 95%)।`,
    ),
  }),

  "exercise-window": (p: { minutes: number; window: HourRange; aqi: number; earlyPm25: number }) => {
    const w = range(p.window);
    return {
      title: L(`Exercise outdoors at ${w.en}`, `बाहर कसरत ${w.hi} करें`),
      why: L(
        `The cleanest stretch for a ${p.minutes}-minute workout today is ${w.en}, AQI about ${p.aqi}. Around dawn, cold still air traps smoke near the ground, so a ${EARLY.en} run often means more exposure, not less.`,
        `आज ${p.minutes} मिनट की कसरत के लिए सबसे साफ़ समय ${w.hi} है, AQI लगभग ${p.aqi}। सुबह-सुबह ठंडी, ठहरी हवा धुएँ को ज़मीन के पास रोक लेती है।`,
      ),
      assumption: L(
        `Compared with a ${EARLY.en} workout (PM2.5 about ${r0(p.earlyPm25)} µg/m³) at a hard-exercise breathing rate of ${K.VENT.moderate} m³/h for ${p.minutes} minutes.`,
        `${EARLY.hi} की कसरत (PM2.5 लगभग ${r0(p.earlyPm25)} µg/m³) की तुलना में, ${p.minutes} मिनट, ${K.VENT.moderate} m³/घंटा साँस की दर पर।`,
      ),
    };
  },

  "exercise-indoors": (p: IndoorsParams & { minutes: number }) => ({
    title: L("Move today's workout indoors", "आज की कसरत घर के अंदर करें"),
    why: L(
      `Even the cleanest hours today sit at AQI ${p.bestAqi}. When you exercise you breathe about five times the air you do at rest, so you pull in far more PM2.5 per minute. Yoga, skipping or stairs indoors keep the benefit without the dose.`,
      `आज सबसे साफ़ घंटों में भी AQI ${p.bestAqi} है। कसरत में आप आराम की तुलना में लगभग पाँच गुना हवा लेते हैं, इसलिए PM2.5 कहीं ज़्यादा अंदर जाता है। घर में योग, रस्सी कूद या सीढ़ियाँ अपनाएँ।`,
    ),
    assumption: L(
      `${p.minutes} minutes at ${K.VENT.moderate} m³/h. Outdoor PM2.5 ${r0(p.outdoor)} µg/m³ versus about ${r0(p.inside)} µg/m³ indoors with your current windows and purifier setup.`,
      `${p.minutes} मिनट, ${K.VENT.moderate} m³/घंटा। बाहर PM2.5 ${r0(p.outdoor)} µg/m³ बनाम आपके मौजूदा खिड़की/प्यूरीफ़ायर सेटअप में घर के अंदर लगभग ${r0(p.inside)} µg/m³।`,
    ),
  }),

  "kids-play-window": (p: { window: HourRange; aqi: number; eveningPm25: number }) => {
    const w = range(p.window);
    const mins = r0(TIME.KIDS_PLAY_H * 60);
    return {
      title: L(`Let children play outside at ${w.en}, not after school`, `बच्चों को स्कूल के बाद नहीं, ${w.hi} खेलने दें`),
      why: L(
        `Children breathe faster for their size and their lungs are still growing. ${w.en} is today's cleanest hour (AQI about ${p.aqi}); late afternoon and evening are usually worse as traffic builds and the air cools.`,
        `बच्चे अपने आकार के हिसाब से तेज़ साँस लेते हैं और उनके फेफड़े अभी बढ़ रहे हैं। ${w.hi} आज का सबसे साफ़ समय है (AQI लगभग ${p.aqi}); शाम को ट्रैफ़िक और ठंड से हवा आम तौर पर बिगड़ती है।`,
      ),
      assumption: L(
        `${mins} minutes of play at ${K.VENT.light} m³/h, compared with playing at ${EVENING.en} (PM2.5 about ${r0(p.eveningPm25)} µg/m³).`,
        `${mins} मिनट का खेल, ${K.VENT.light} m³/घंटा, ${EVENING.hi} (PM2.5 लगभग ${r0(p.eveningPm25)} µg/m³) की तुलना में।`,
      ),
    };
  },

  "kids-play-indoors": (p: IndoorsParams) => {
    const mins = r0(TIME.KIDS_PLAY_H * 60);
    return {
      title: L("Keep children's play indoors today", "आज बच्चों का खेल घर के अंदर रखें"),
      why: L(
        `Even the cleanest hour today is AQI ${p.bestAqi}. Indoor games, a corridor race or a dance session give the same energy burn with much cleaner air. Check with the school about outdoor sports and assembly.`,
        `आज सबसे साफ़ घंटे में भी AQI ${p.bestAqi} है। घर में खेल, डांस या दौड़ वही ऊर्जा खर्च कराते हैं और हवा कहीं साफ़ होती है। स्कूल से आउटडोर खेल और असेंबली के बारे में पूछें।`,
      ),
      assumption: L(
        `${mins} minutes at ${K.VENT.light} m³/h: outdoor PM2.5 ${r0(p.outdoor)} µg/m³ versus about ${r0(p.inside)} µg/m³ indoors.`,
        `${mins} मिनट, ${K.VENT.light} m³/घंटा: बाहर PM2.5 ${r0(p.outdoor)} µg/m³ बनाम घर के अंदर लगभग ${r0(p.inside)} µg/m³।`,
      ),
    };
  },

  "elders-walk-window": (p: { window: HourRange; aqi: number; earlyPm25: number }) => {
    const w = range(p.window);
    const mins = r0(TIME.ELDER_WALK_H * 60);
    return {
      title: L(`Move the morning walk to ${w.en}`, `सुबह की सैर ${w.hi} करें`),
      why: L(
        `Older lungs and hearts cope less well with fine particles. The usual dawn walk is often the most polluted hour of a winter day; ${w.en} is cleaner today (AQI about ${p.aqi}). Dress warm, as midday is also the mildest time.`,
        `बुज़ुर्गों के फेफड़े और दिल महीन कणों को कम सह पाते हैं। सर्दियों में सुबह की सैर अक्सर दिन का सबसे प्रदूषित समय होती है; आज ${w.hi} साफ़ है (AQI लगभग ${p.aqi})।`,
      ),
      assumption: L(
        `${mins}-minute walk at ${K.VENT.walk} m³/h compared with a ${EARLY.en} walk (PM2.5 about ${r0(p.earlyPm25)} µg/m³).`,
        `${mins} मिनट की सैर, ${K.VENT.walk} m³/घंटा, ${EARLY.hi} (PM2.5 लगभग ${r0(p.earlyPm25)} µg/m³) की तुलना में।`,
      ),
    };
  },

  "elders-walk-indoors": (p: IndoorsParams) => {
    const mins = r0(TIME.ELDER_WALK_H * 60);
    return {
      title: L("Walk indoors today instead of outside", "आज बाहर की जगह घर के अंदर टहलें"),
      why: L(
        `Air is poor at every hour today (best hour AQI ${p.bestAqi}). Walking up and down a hallway, or light stretching, keeps joints moving without extra particles in the lungs.`,
        `आज हर घंटे हवा खराब है (सबसे अच्छे घंटे में AQI ${p.bestAqi})। घर में टहलना या हल्की स्ट्रेचिंग फेफड़ों में अतिरिक्त कण डाले बिना शरीर चलाती है।`,
      ),
      assumption: L(
        `${mins} minutes at ${K.VENT.walk} m³/h: outdoor ${r0(p.outdoor)} µg/m³ versus about ${r0(p.inside)} µg/m³ indoors.`,
        `${mins} मिनट, ${K.VENT.walk} m³/घंटा: बाहर ${r0(p.outdoor)} µg/m³ बनाम घर के अंदर लगभग ${r0(p.inside)} µg/m³।`,
      ),
    };
  },

  "bedroom-purifier": (p: { has: boolean; nightPm25: number }) => ({
    title: p.has
      ? L("Run your purifier in the bedroom all night, door shut", "प्यूरीफ़ायर को पूरी रात बेडरूम में, दरवाज़ा बंद करके चलाएँ")
      : L("Set up one HEPA purifier in the bedroom", "बेडरूम में एक HEPA प्यूरीफ़ायर लगाएँ"),
    why: p.has
      ? L(
          "You spend about a third of your life asleep in one room, so that is the best place for the machine. Keep the door and windows closed, choose auto mode, and clean the pre-filter every two weeks.",
          "आप अपना लगभग एक-तिहाई जीवन एक कमरे में सोते हुए बिताते हैं, इसलिए मशीन के लिए यही सबसे अच्छी जगह है। दरवाज़ा-खिड़कियाँ बंद रखें, ऑटो मोड चुनें और प्री-फ़िल्टर हर दो हफ़्ते में साफ़ करें।",
        )
      : L(
          "You spend about a third of your life asleep in one room, so one purifier there does the most good. No budget? Tape four MERV-13 furnace filters around a box fan (a Corsi–Rosenthal box); tests show it cleans a room about as well as a mid-range purifier.",
          "आप अपना लगभग एक-तिहाई जीवन एक कमरे में सोकर बिताते हैं, इसलिए वहाँ एक प्यूरीफ़ायर सबसे ज़्यादा फ़ायदा देता है। बजट कम है? बॉक्स फ़ैन के चारों ओर चार MERV-13 फ़िल्टर लगाएँ (कॉर्सी–रोज़ेंथल बॉक्स); यह औसत प्यूरीफ़ायर जितना कमरा साफ़ करता है।",
        ),
    assumption: L(
      `A right-sized HEPA purifier cuts indoor PM2.5 by about ${pct(K.PURIFIER_CUT)}% with doors and windows closed. ${TIME.SLEEP_H} hours of sleep at ${K.VENT.sleep} m³/h; night-time outdoor PM2.5 about ${r0(p.nightPm25)} µg/m³.`,
      `सही आकार का HEPA प्यूरीफ़ायर बंद दरवाज़े-खिड़कियों में अंदर के PM2.5 को लगभग ${pct(K.PURIFIER_CUT)}% घटाता है। ${TIME.SLEEP_H} घंटे की नींद, ${K.VENT.sleep} m³/घंटा; रात का बाहरी PM2.5 लगभग ${r0(p.nightPm25)} µg/m³।`,
    ),
  }),

  "smart-ventilation": (p: { window: HourRange | null; dayPm25: number }) => {
    const w = p.window ? range(p.window) : null;
    return {
      title: w
        ? L(`Keep windows shut, and air the house for 10 minutes at ${w.en}`, `खिड़कियाँ बंद रखें, और ${w.hi} 10 मिनट घर में हवा आने दें`)
        : L("Keep windows shut and air the house briefly", "खिड़कियाँ बंद रखें और थोड़ी देर के लिए हवा आने दें"),
      why: L(
        "Open windows let most of the outdoor smoke straight in. Sealing gaps with draught strips and airing once, in the cleanest hour, keeps stale indoor air from building up without inviting the worst of the smog.",
        "खुली खिड़कियाँ बाहर का ज़्यादातर धुआँ सीधे अंदर आने देती हैं। दरारें बंद करके और सबसे साफ़ घंटे में एक बार हवा देने से बासी हवा भी नहीं जमती और खराब हवा भी कम आती है।",
      ),
      assumption: L(
        `Indoor PM2.5 is about ${pct(K.F_OPEN)}% of outdoor with windows open and ${pct(K.F_CLOSED)}% when mostly closed. ${TIME.AWAKE_AT_HOME_H} hours at home at ${K.VENT.rest} m³/h; 24-hour outdoor PM2.5 about ${r0(p.dayPm25)} µg/m³.`,
        `खिड़कियाँ खुली होने पर अंदर का PM2.5 बाहर का लगभग ${pct(K.F_OPEN)}% और ज़्यादातर बंद होने पर ${pct(K.F_CLOSED)}%। घर पर ${TIME.AWAKE_AT_HOME_H} घंटे, ${K.VENT.rest} m³/घंटा; 24 घंटे का बाहरी PM2.5 लगभग ${r0(p.dayPm25)} µg/m³।`,
      ),
    };
  },

  "air-out": () => ({
    title: L("The air is fine right now: open the windows for 30 minutes", "अभी हवा ठीक है: 30 मिनट खिड़कियाँ खोलें"),
    why: L(
      "Clean outdoor air dilutes the cooking fumes, dust and carbon dioxide that collect inside. Do it now, before the evening haze settles.",
      "साफ़ बाहरी हवा घर में जमा खाना पकाने के धुएँ, धूल और कार्बन डाइऑक्साइड को हल्का करती है। शाम की धुंध से पहले अभी कर लें।",
    ),
  }),

  "stop-indoor-burning": () => ({
    title: L("Swap the wood or coal fire for layers and an electric heater", "लकड़ी या कोयले की अँगीठी की जगह गर्म कपड़े और इलेक्ट्रिक हीटर लें"),
    why: L(
      "A wood or coal fire in a closed room fills it with fine smoke and carbon monoxide, and it pours more into the neighbourhood air at night. A low-wattage oil-filled heater, a hot-water bottle, and warm layers do the job without the smoke.",
      "बंद कमरे में लकड़ी या कोयले की आग महीन धुआँ और कार्बन मोनोऑक्साइड भर देती है, और रात में आस-पड़ोस की हवा भी बिगाड़ती है। कम वॉट का ऑयल हीटर, गर्म पानी की बोतल और गर्म कपड़े बिना धुएँ के काम करते हैं।",
    ),
    assumption: L(
      `Indicative only: assumes the fire adds about ${K.BIOMASS_HEAT_UG} µg/m³ indoors for ${TIME.HEATING_FIRE_H} hours. Measured values vary widely with fuel, room size and ventilation.`,
      `केवल अनुमान: मानकर चला है कि आग ${TIME.HEATING_FIRE_H} घंटे घर में लगभग ${K.BIOMASS_HEAT_UG} µg/m³ जोड़ती है। असली मान ईंधन, कमरे और हवा-आवाजाही के साथ काफ़ी बदलते हैं।`,
    ),
  }),

  "clean-cooking": () => ({
    title: L("Move cooking to LPG, PNG or induction", "खाना LPG, PNG या इंडक्शन पर बनाएँ"),
    why: L(
      "Cooking on wood, dung or crop waste is one of the biggest sources of indoor fine particles, and the person cooking breathes the most of it. If cost is the barrier, check eligibility for the government's PM Ujjwala LPG connection.",
      "लकड़ी, उपले या फ़सल के कचरे पर खाना पकाना घर के अंदर महीन कणों का सबसे बड़ा स्रोत है, और पकाने वाला सबसे ज़्यादा साँस लेता है। खर्च बाधा हो तो प्रधानमंत्री उज्ज्वला योजना के LPG कनेक्शन की पात्रता देखें।",
    ),
    assumption: L(
      `Indicative only: assumes a biomass stove adds about ${K.BIOMASS_COOK_UG} µg/m³ in the kitchen for ${TIME.COOKING_H} hours, breathed at ${K.VENT.cooking} m³/h while cooking.`,
      `केवल अनुमान: मानकर चला है कि चूल्हा रसोई में ${TIME.COOKING_H} घंटे लगभग ${K.BIOMASS_COOK_UG} µg/m³ जोड़ता है, खाना पकाते समय ${K.VENT.cooking} m³/घंटा साँस पर।`,
    ),
  }),

  "kitchen-exhaust": () => ({
    title: L("Cook with the chimney or exhaust fan on", "खाना बनाते समय चिमनी या एग्ज़ॉस्ट फ़ैन चलाएँ"),
    why: L(
      "Gas burners release fine particles and nitrogen dioxide into the kitchen, and frying adds more. An exhaust fan removes them at the source. No fan? Open the kitchen window a hand's width and shut the door to the rest of the house.",
      "गैस बर्नर रसोई में महीन कण और नाइट्रोजन डाइऑक्साइड छोड़ते हैं, और तलने से और बढ़ते हैं। एग्ज़ॉस्ट फ़ैन इन्हें स्रोत पर ही निकाल देता है। फ़ैन नहीं है? रसोई की खिड़की थोड़ी खोलें और बाकी घर का दरवाज़ा बंद रखें।",
    ),
  }),

  "sensitive-plan": () => ({
    title: L("Keep medicines and your doctor's action plan within reach", "दवाइयाँ और डॉक्टर की एक्शन प्लान हाथ के पास रखें"),
    why: L(
      "Smog days are when asthma, COPD and heart conditions flare. Keep the reliever inhaler and regular medicines stocked, avoid hard effort outdoors, and know the warning signs: breathlessness, wheeze, chest tightness or unusual tiredness. If they appear and do not settle with your usual medicine, contact your doctor or an emergency service.",
      "स्मॉग के दिनों में दमा, COPD और दिल की बीमारियाँ बढ़ जाती हैं। रिलीवर इन्हेलर और नियमित दवाइयाँ पर्याप्त रखें, बाहर भारी मेहनत से बचें और चेतावनी के संकेत पहचानें: साँस फूलना, घरघराहट, सीने में जकड़न या असामान्य थकान। ये दिखें और आपकी दवा से न थमें तो डॉक्टर या आपातकालीन सेवा से संपर्क करें।",
    ),
  }),

  "no-open-burning": () => ({
    title: L("Do not burn leaves or rubbish, and tell your society to stop it", "पत्ते या कचरा न जलाएँ, और अपनी सोसायटी में भी रुकवाएँ"),
    why: L(
      "Small fires of leaves, plastic and trash smoulder for hours and release fine particles and toxic fumes right where people live. Ask your RWA, school or guards to arrange waste collection instead, and report open burning through your city helpline or the CPCB Sameer app.",
      "पत्तों, प्लास्टिक और कचरे की छोटी आग घंटों सुलगती है और ठीक वहीं महीन कण और ज़हरीला धुआँ छोड़ती है जहाँ लोग रहते हैं। RWA, स्कूल या गार्ड से कचरा उठवाने को कहें और खुले में जलाने की शिकायत शहर की हेल्पलाइन या CPCB के समीर ऐप पर करें।",
    ),
  }),
} satisfies Record<ActionId, (p: never) => ActionText>;
