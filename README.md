# AirSaathi: a smog plan for your family

PromptWars Virtual, Challenge 06. A GenAI assistant that turns today's air quality into a plan for one household: when to go out, how to keep indoor air clean, what to swap, and what each choice saves in PM2.5 breathed and CO₂ emitted.

Built with Google Antigravity.

**Live demo:** https://airsaathi-smog-assistant.vercel.app

## Chosen vertical and user

**Challenge 06: helping families and communities handle severe winter smog in India.** The user is a household in an Indian city (a parent with children, older relatives, someone with asthma) who wants to know today, in their own place and routine, what to do and why it helps. The app asks about the household, commute, cooking fuel, heating, purifier, windows and exercise habits, then builds a low-emission, indoor-air and sustainable-alternatives plan from that context.

## Approach and logic

1. **Get the air reading for the place.** Real station data where it exists (OpenAQ, then WAQI), otherwise the Open-Meteo model. The app states which source it used and flags readings that are approximate.
2. **Score it on India's scale.** PM2.5 and PM10 become a CPCB National AQI and a category, plus a 24-hour curve that gives the cleanest and worst hours.
3. **Decide with rules, not with the LLM.** `src/lib/engine.ts` filters an action library by household and conditions (for example: a fitted N95 for bike, walk and bus commuters from AQI 150; work from home for car and bike commuters from AQI 300; metro or carpool instead of driving; exercise, children's play and older adults' walks moved to the cleanest hours or indoors; a bedroom purifier; smart window opening; cleaner cooking and no indoor burning; a separate plan for asthma, heart conditions and pregnancy). It ranks the steps that apply and keeps one commute choice at a time.
4. **Quantify every choice.** Each step shows PM2.5 avoided (`PM2.5 × breathing rate × hours`) and CO₂ avoided, with the assumptions listed. Where no defensible number exists, it says so.
5. **Let the LLM explain, nothing else.** It writes the headline, summary and per-household notes from numbers already computed, and its output is validated and checked for invented numbers (see below).

## Assumptions

- Users are in India. Place search is limited to Indian locations and AQI uses India's CPCB breakpoints, applied to PM2.5 and PM10 only (no ozone). CPCB defines them on 24-hour averages, so hourly values make the AQI indicative.
- Breathing rates, purifier and mask effectiveness, indoor/outdoor ratios and emission factors are rounded published ranges, labelled as estimates in the UI. Wood and dung burning figures are indicative.
- A station reading is trusted only if it is recent (OpenAQ under 3 hours, WAQI under 6 hours) and near (25 km and 40 km). Beyond that the model is used.
- Household answers are coarse flags, not medical records. The app is not medical advice.
- Nothing is stored on the server. Profile and progress stay in the browser.

## What it does

- **Live, local air data.** Real station readings where they exist (OpenAQ, then WAQI), otherwise the Open-Meteo CAMS model, converted to India's CPCB AQI scale. The app says which source you are seeing and flags readings that rest on one station or on stations that disagree.
- **A plan for this household.** Children, older adults, asthma, heart conditions, pregnancy, commute, cooking fuel, heating, purifier, windows and exercise habits all change the advice.
- **Impact in numbers.** Each step shows micrograms of PM2.5 you avoid breathing and kilograms of CO₂, with a "How this is calculated" note listing its assumptions. Steps with no defensible number say so instead of inventing one.
- **Best and worst hours.** A 24-hour strip shows the cleanest hour and the worst stretch.
- **Ask about your air.** Questions are answered from today's numbers for that household.
- **Track and share.** Tick steps off to build a daily tally and streak (stored in the browser only). Share the plan on WhatsApp or copy it.
- **English and Hindi.**

## How the AI is used (and kept honest)

```
profile + location ─► air data (src/lib/airsource.ts):
                      OpenAQ stations ► WAQI station ► Open-Meteo model
                      (24 h curve always comes from the model)
                         │
                         ▼
              rules engine (src/lib/engine.ts)
      action library · exposure maths · household filters
                         │  all numbers are computed here
                         ▼
     LLM (src/lib/ai.ts, OpenAI or Gemini): writes the explanations
   JSON-schema output · validated with zod · numbers checked
   against the context · falls back to rule-based text on failure
```

The model never calculates. It receives a shortlist of actions with their figures and writes the plain-language briefing and per-household notes. Any output that contains a large number not present in its context is discarded. With no API key, or if the provider fails, the app shows the rules-based text and everything else still works.

Exposure maths: `inhaled µg = PM2.5 (µg/m³) × breathing volume (m³/h) × hours`. Constants (breathing rates, purifier and mask effectiveness, indoor/outdoor ratios, emission factors) are in `K` at the top of `src/lib/engine.ts`. They are rounded published ranges and are labelled as estimates in the UI.

## Run it

```bash
npm install
cp .env.example .env.local   # optional: add OPENAI_API_KEY or GEMINI_API_KEY
npm run dev                  # http://localhost:3000
npm run check                # lint + typecheck + 108 tests
npm run build
```

The project's `.npmrc` disables dependency install scripts. GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, tests, build and `npm audit` on every push.

### Environment

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Turns on AI explanations with OpenAI. Model via `OPENAI_MODEL` (default `gpt-4.1-mini`) |
| `GEMINI_API_KEY` | Turns on AI explanations with Gemini. Get one at https://aistudio.google.com/apikey |
| `AI_PROVIDER` | Optional. `openai` or `gemini`, used only when both keys are set (default: Gemini) |
| `OPENAQ_API_KEY` | Optional, recommended. Uses fresh stations within 25 km (under 3 h old, median of up to 5 nearest, reference monitors preferred over low-cost sensors). Raw µg/m³, no conversion. Free key at https://explore.openaq.org/register |
| `WAQI_TOKEN` | Optional. Fallback when OpenAQ has nothing: the nearest WAQI station (within 40 km, under 6 h old). Free token at https://aqicn.org/data-platform/token/ |
| `GEMINI_MODEL` | Optional. Defaults to `gemini-flash-latest` |

## Deploy (Vercel)

1. Push this folder to a public GitHub repo (`main` branch).
2. Import it at https://vercel.com/new. No build settings needed.
3. Add `OPENAI_API_KEY` (or `GEMINI_API_KEY`) and, optionally, `OPENAQ_API_KEY` and `WAQI_TOKEN` under Settings, Environment Variables, then redeploy.

## Security and privacy

- All external input is validated with zod at the API boundary (shape, ranges, lengths); bodies are size-capped.
- The server calls only fixed hosts (Open-Meteo, OpenAQ, WAQI, OpenAI, Google). Coordinates are rounded to about 1 km before leaving the server.
- The AI model gets coarse household flags and the city name only: no personal names, no coordinates, no free text except the user's question, which is passed as quoted data.
- API keys are read from the environment on the server and sent in a header, never in a URL or to the browser.
- Model output is parsed against a schema and rendered as text, never as HTML.
- Rate limiting is per IP and in memory. On serverless each instance keeps its own counter, so use a shared store (Upstash, Vercel KV) for real traffic.
- Security headers are set in `next.config.ts`.
- Nothing is stored server-side. Profile and progress live in `localStorage`.

## Testing

108 tests (Vitest) cover the AQI maths and breakpoints, exposure and impact calculations, plan logic for different households, English and Hindi output, the API routes (validation, size limits, rate limiting, upstream failure, coordinate rounding), the AI layer for both OpenAI and Gemini (provider choice, request format, schema validation, invented-number guard, prompt-injection framing, no coordinates sent, fallbacks), the station-data sources (OpenAQ freshness, units, plausibility, median, low-cost vs reference, uncertainty flag; WAQI conversion; source priority and fallbacks) and local storage handling. The AI providers and data sources are mocked, so the suite runs offline.

## Accessibility

- Checked with axe-core (WCAG 2.0, 2.1, 2.2 AA and best-practice rules) on desktop, mobile and Hindi views: 0 violations.
- Skip link, one `main` landmark, visible focus rings, labelled form controls, live regions for loading and errors, and reduced-motion support.
- Colour pairs were checked against WCAG AA (4.5:1 for text). Every number is also written in text, so nothing relies on colour alone.
- English and Hindi (`lang` is set on the page and switches with the language toggle).

## Limits worth knowing

- AQI is computed from hourly values with CPCB breakpoints, which are defined on 24-hour averages, so it is indicative.
- Without station keys, or where no station is nearby, the air data is a model estimate on a roughly 40 km grid and can differ from local monitors. Station coverage is uneven: Delhi, Jaipur and Chennai have several stations within 11 km, while Kochi has one fresh reference monitor (Eloor, about 16 km away) and a low-cost sensor that reads several times higher, so Kochi is shown as "approximate".
- OpenAQ readings can lag by one to three hours. WAQI values arrive as US AQI sub-indices and are converted back to µg/m³; against OpenAQ at 11 paired stations that conversion averaged about 13% error, so treat WAQI-derived PM2.5 as roughly ±15%.
- Estimates for wood and dung burning are indicative; real indoor concentrations vary widely.
- This is not medical advice.

## Layout

```
src/lib/engine.ts     action library, impact maths, plan builder
src/lib/aqi.ts        CPCB AQI and categories
src/lib/airdata.ts    Open-Meteo client and normalisation
src/lib/airsource.ts  picks the air source: OpenAQ, then WAQI, then model
src/lib/openaq.ts     OpenAQ v3 stations: freshness, units, median, uncertainty
src/lib/station.ts    WAQI station readings and applying a station to the 24 h curve
src/lib/ai.ts         LLM layer: OpenAI or Gemini, prompts, validation, number guard
src/app/api/*         plan, ask, geocode routes
src/components/*      UI (skyline hero, hour strip, actions, tracker, ask)
tests/                maths, plan logic, API routes, AI guard, storage
```
