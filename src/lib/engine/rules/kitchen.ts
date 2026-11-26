import { K, TIME } from "../constants";
import { L, WHO, makeAction, type Rule } from "../rule";

export const indoorBurning: Rule = (c) => {
  if (c.p.heating !== "biomass") return null;
  return makeAction(c, {
    id: "stop-indoor-burning",
    group: "kitchen",
    priority: 82,
    title: L("Swap the wood or coal fire for layers and an electric heater", "लकड़ी या कोयले की अँगीठी की जगह गर्म कपड़े और इलेक्ट्रिक हीटर लें"),
    why: L(
      "A wood or coal fire in a closed room fills it with fine smoke and carbon monoxide, and it pours more into the neighbourhood air at night. A low-wattage oil-filled heater, a hot-water bottle, and warm layers do the job without the smoke.",
      "बंद कमरे में लकड़ी या कोयले की आग महीन धुआँ और कार्बन मोनोऑक्साइड भर देती है, और रात में आस-पड़ोस की हवा भी बिगाड़ती है। कम वॉट का ऑयल हीटर, गर्म पानी की बोतल और गर्म कपड़े बिना धुएँ के काम करते हैं।",
    ),
    impact: { inhaledPm25Ug: K.BIOMASS_HEAT_UG * K.VENT.rest * TIME.HEATING_FIRE_H },
    assumption: L(
      `Indicative only: assumes the fire adds about ${K.BIOMASS_HEAT_UG} µg/m³ indoors for ${TIME.HEATING_FIRE_H} hours. Measured values vary widely with fuel, room size and ventilation.`,
      `केवल अनुमान: मानकर चला है कि आग ${TIME.HEATING_FIRE_H} घंटे घर में लगभग ${K.BIOMASS_HEAT_UG} µg/m³ जोड़ती है। असली मान ईंधन, कमरे और हवा-आवाजाही के साथ काफ़ी बदलते हैं।`,
    ),
    forWhom: [WHO.everyone],
  });
};

export const cookingFuel: Rule = (c) => {
  if (c.p.cooking !== "biomass") return null;
  return makeAction(c, {
    id: "clean-cooking",
    group: "kitchen",
    priority: 86,
    title: L("Move cooking to LPG, PNG or induction", "खाना LPG, PNG या इंडक्शन पर बनाएँ"),
    why: L(
      "Cooking on wood, dung or crop waste is one of the biggest sources of indoor fine particles, and the person cooking breathes the most of it. If cost is the barrier, check eligibility for the government's PM Ujjwala LPG connection.",
      "लकड़ी, उपले या फ़सल के कचरे पर खाना पकाना घर के अंदर महीन कणों का सबसे बड़ा स्रोत है, और पकाने वाला सबसे ज़्यादा साँस लेता है। खर्च बाधा हो तो प्रधानमंत्री उज्ज्वला योजना के LPG कनेक्शन की पात्रता देखें।",
    ),
    impact: { inhaledPm25Ug: K.BIOMASS_COOK_UG * K.VENT.cooking * TIME.COOKING_H },
    assumption: L(
      `Indicative only: assumes a biomass stove adds about ${K.BIOMASS_COOK_UG} µg/m³ in the kitchen for ${TIME.COOKING_H} hours, breathed at ${K.VENT.cooking} m³/h while cooking.`,
      `केवल अनुमान: मानकर चला है कि चूल्हा रसोई में ${TIME.COOKING_H} घंटे लगभग ${K.BIOMASS_COOK_UG} µg/m³ जोड़ता है, खाना पकाते समय ${K.VENT.cooking} m³/घंटा साँस पर।`,
    ),
    forWhom: [WHO.cook],
  });
};

export const kitchenExhaust: Rule = (c) => {
  if (c.p.cooking !== "lpg" && c.p.cooking !== "png") return null;
  return makeAction(c, {
    id: "kitchen-exhaust",
    group: "kitchen",
    priority: 36,
    title: L("Cook with the chimney or exhaust fan on", "खाना बनाते समय चिमनी या एग्ज़ॉस्ट फ़ैन चलाएँ"),
    why: L(
      "Gas burners release fine particles and nitrogen dioxide into the kitchen, and frying adds more. An exhaust fan removes them at the source. No fan? Open the kitchen window a hand's width and shut the door to the rest of the house.",
      "गैस बर्नर रसोई में महीन कण और नाइट्रोजन डाइऑक्साइड छोड़ते हैं, और तलने से और बढ़ते हैं। एग्ज़ॉस्ट फ़ैन इन्हें स्रोत पर ही निकाल देता है। फ़ैन नहीं है? रसोई की खिड़की थोड़ी खोलें और बाकी घर का दरवाज़ा बंद रखें।",
    ),
    forWhom: [WHO.cook],
  });
};
