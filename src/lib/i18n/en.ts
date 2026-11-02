/**
 * Every visible string on the site, in English. `es.ts` has the same keys:
 * its type is this object's, so a missing or extra key fails `tsc`. Text
 * that holds a number is a function, so each language orders and pluralises
 * it in its own way.
 */

import { site } from "../site";

const numbers = new Intl.NumberFormat("en");

export const en = {
  name: "Julian Palomo",
  role: site.role,
  intro:
    "Ask about my experience. Answers come only from facts I've confirmed, with their sources.",
  portraitAlt: "Pixel-art portrait of Julian Palomo",
  // The cow's speech bubble on the link preview image (scripts/og/).
  ogBubble: "Ask me about Julian's experience",
  // The link preview image (public/og/), for screen readers on LinkedIn and others.
  ogImageAlt:
    "Julian Palomo's pixel-art portrait over a Highland glen on an autumn afternoon, with a Highland cow asking you to ask about his experience",
  metaDescription:
    "Ask about Julian Palomo's experience. Answers come only from facts he has confirmed, with their sources.",

  // The language toggle, as shown on this language's page: it offers the other one.
  switchLanguage: { short: "ES", label: "Ver en español" },
  themeToDark: "Switch to dark theme",
  themeToLight: "Switch to light theme",
  // The sound toggle, in the hero and the compact bar.
  muteSounds: "Mute sounds",
  turnSoundsOn: "Turn sounds on",

  chatLabel: "Chat",
  // The heading beside the cow on the chat's edge, and its line.
  chatHeading: "Ask me about Julian",
  chatReady: "Ready when you are",
  // The cow's hello in the hero, during a first visit's entrance.
  heroCowHello: "Hi! I'm the Highland cow",
  greeting:
    "Hi! Ask me about Julian's experience. I only answer with facts he has confirmed, and I show where each one comes from.",
  suggestionsLabel: "Suggested questions",
  // The first three start the chat; the rest come back under each answer as
  // "Keep asking". Each one is answered by a confirmed claim.
  suggestions: [
    "What did Julian do at Cazoo?",
    "What is Form:at?",
    "Is Julian open to remote work?",
    "Which languages does Julian speak?",
    "Does Julian need visa sponsorship?",
    "How did Julian upgrade React at Cazoo?",
  ],
  conversationLabel: "Conversation",
  keepAsking: "Keep asking",
  copy: "Copy",
  copied: "Copied",
  couldntCopy: "Couldn't copy",
  // The heading of the sources in a copied answer.
  sourcesHeading: "Sources:",
  citationLabel: (number: number, label: string) => `Source ${number}: ${label}`,
  confirmedBy: (date: string, from: string) => `Confirmed by Julian on ${date} · ${from}`,
  fromCv: "from his CV",
  fromJulian: "from Julian",
  newAnswer: "New answer ↓",
  composerHint: "Enter to send · Shift+Enter for a new line",
  // Under the composer: what happens to a question (docs/analytics.md).
  questionsKept: "Questions are kept anonymously for 90 days to improve the assistant.",
  // Announced to screen readers when an answer starts.
  answering: "Answering…",
  answerLabel: "Answer",
  sourcesLabel: "Sources",
  // The link under a finished answer that shows or hides its source chips.
  checkSources: (count: number) => `Check sources (${count})`,
  hideSources: "Hide sources",
  sourceNames: { cv: "CV", julian: "Julian" },
  demo: "Demo",
  lookingUpClaims: "Looking up claims…",
  checkingTopics: "Checking what topics exist…",

  questionLabel: "Your question",
  send: "Send",
  stop: "Stop",
  counter: (length: number, limit: number) =>
    `${numbers.format(length)} / ${numbers.format(limit)}`,
  counterOver: (over: number, limit: number) =>
    `${numbers.format(over)} ${over === 1 ? "character" : "characters"} over the ${numbers.format(limit)} limit`,

  errorUnavailable: "The assistant isn't available here right now.",
  errorVisitorLimit:
    "You've reached today's limit for questions. Come back tomorrow, or write to Julian directly. He reads every message.",
  errorDailyBudget:
    "The assistant has used up today's budget. Come back tomorrow, or write to Julian directly. He reads every message.",
  errorGeneric: "Something went wrong on my side. Try again in a moment.",
  // The composer's placeholder once no more questions can be asked today.
  questionsBackTomorrow: "Questions are back tomorrow",
  // "You can still write to me, or reach me on LinkedIn or GitHub.": "write
  // to me" opens the contact form, around it and the two links.
  contact: {
    before: "You can still",
    writeToMe: "write to me",
    reach: ", or reach me on",
    between: "or",
    after: ".",
  },

  patTheCow: "Pat the cow",
  moo: "Moo!",

  // The weather chip and the footer's credit. The words follow the levels 0–10 (DESIGN.md section 8).
  glasgow: "Glasgow",
  weatherClouds: [
    "Clear",
    "Clear",
    "A few clouds",
    "A few clouds",
    "Some clouds",
    "Cloudy",
    "Cloudy",
    "Mostly cloudy",
    "Mostly cloudy",
    "Overcast",
    "Overcast",
  ],
  weatherRain: [
    "Dry",
    "Drizzle",
    "Drizzle",
    "Light rain",
    "Light rain",
    "Steady rain",
    "Steady rain",
    "Heavy rain",
    "Heavy rain",
    "Downpour",
    "Downpour",
  ],
  weatherSnow: "Snow",
  weatherHaar: "Haar",
  weatherCredit: { before: "Weather data by", link: "Open-Meteo.com" },
  // The chip's accessible names: what it shows, then what pressing it does.
  chipLiveName: (weather: string) => `Weather in Glasgow: ${weather}. Play with the sky`,
  chipPlayingName: (time: string) => `Your sky, ${time}. Back to live Glasgow`,
  yourSky: "Your sky",
  tapToReset: "tap to reset",

  // The gear and its panel (DESIGN.md section 8).
  playWithTheSky: "Play with the sky",
  playSubtitle: "Only on your screen, for as long as you like.",
  playBubble: "Psst… you can change the weather",
  close: "Close",
  seasonLabel: "Season",
  seasons: { spring: "Spring", summer: "Summer", autumn: "Autumn", winter: "Winter" },
  timeOfDay: "Time of day",
  moments: {
    night: "night",
    blue: "blue hour",
    golden: "golden hour",
    morning: "morning",
    day: "day",
  },
  cloudsLabel: "Clouds",
  rainLabel: "Rain",
  snowLabel: "Snow",
  windLabel: "Wind",
  // Words for snow levels 0–10 when "Snow instead of rain" is on.
  weatherSnowLevels: [
    "None",
    "Flurries",
    "Flurries",
    "Light snow",
    "Light snow",
    "Snow",
    "Snow",
    "Heavy snow",
    "Heavy snow",
    "Blizzard",
    "Blizzard",
  ],
  weatherWind: [
    "Calm",
    "Breeze",
    "Breeze",
    "Fresh",
    "Fresh",
    "Windy",
    "Windy",
    "Strong",
    "Strong",
    "Gale",
    "Gale",
  ],
  snowInsteadOfRain: "Snow instead of rain",
  backToLive: "Back to live Glasgow",

  // The CV and the contact form (DESIGN.md section 14).
  downloadCv: "Download CV",
  contactOpen: "Contact",
  contactTitle: "Write to Julian",
  contactSubtitle: "He reads every message and answers by email.",
  contactName: "Name",
  contactEmail: "Email",
  contactEmailHint: "So Julian can reply.",
  contactMessage: "Message",
  // The hidden field only bots fill in; people never see it.
  contactWebsite: "Website",
  contactSend: "Send message",
  contactSending: "Sending…",
  contactSent: "Thanks! Julian will get back to you.",
  contactFieldErrors: {
    name: "Write your name.",
    email: "That doesn't look like an email address.",
    message: (min: number) => `Write at least ${min} characters.`,
  },
  // A failed send keeps what the visitor wrote; each says what to do next.
  contactErrors: {
    verification: "We couldn't check you're a person. Wait for the check below, then try again.",
    limit: "You've sent today's messages. Try again tomorrow, or find Julian on LinkedIn.",
    unavailable:
      "The form isn't working right now. You can still reach Julian on LinkedIn or GitHub.",
    send: "Your message didn't go through. It's still here, so try again in a moment.",
  },

  // The inner pages (DESIGN.md section 18) and the links to them.
  pagesLabel: "Pages",
  projectsTitle: "Projects",
  askTheCow: "← Ask the cow",
  anythingElse: "Anything else? Ask me",
  // One card per project. Each point is taken from the confirmed claim it
  // names, shortened and adding nothing (tests/unit/projects.test.ts). The
  // "why" lines are Julian's own words.
  projects: [
    {
      id: "format",
      name: "Form:at",
      meta: "Personal project, built solo · May 2026 – present",
      why: "I feel close to Form:at, a Glasgow music collective. To get away from the big platforms, many of them paid, like SoundCloud, YouTube and Mixcloud, we decided it would be great to have our own player. From there I kept adding features that other platforms charge for, and here they're free.",
      points: [
        {
          claim: "format-offline",
          text: "Saves 90-minute mixes (100–220MB each) to play with no signal: IndexedDB with a storage check first, a service worker that serves Range requests for seeking, and lock-screen playback.",
        },
        {
          claim: "format-cloudflare",
          text: "All on Cloudflare: TanStack Start on Pages/Workers, D1 for the catalogue and analytics, R2 for audio, presigned uploads straight to R2 for 220MB files, and Web Push from Workers.",
        },
        {
          claim: "format-admin",
          text: "An admin dashboard behind Cloudflare Access, with server-side JWT checks on every write.",
        },
        {
          claim: "format-tooling",
          text: "A pnpm and Turborepo monorepo with a shared design system (Storybook, Chromatic), Vitest and Playwright on Chromium and WebKit, and CI/CD on GitHub Actions; built with Claude Code.",
        },
      ],
      links: [
        { label: "formatglasgow.com", href: "https://formatglasgow.com/" },
        { label: "Code on GitHub", href: "https://github.com/julian-palomo/form-at" },
      ],
    },
    {
      id: "site",
      name: "julianpalomo.dev",
      meta: "Personal project · October 2026 – present",
      why: "I wanted one project that brought my CV together and showed that I can use and apply AI, both in how the product works and in how it's built. A CV bot fitted exactly what I was looking for. The Highland landscape is a nod, and a thank you, to the country that has welcomed me so well, where I live and which I enjoy.",
      points: [
        {
          claim: "site-assistant",
          text: "An assistant on Claude, through the Vercel AI SDK, whose read-only tools only return facts I've confirmed; every fact it cites must be one it looked up.",
        },
        {
          claim: "site-limits",
          text: "Daily limits in Cloudflare D1: 30 questions a visitor and a spend cap, with visitors counted by a hash that changes every day, never by their IP.",
        },
        {
          claim: "site-evals",
          text: "LLM evals in CI: the real assistant answers the cases, and a second model, calibrated before each run, judges every sentence.",
        },
        {
          claim: "site-agent-setup",
          text: "Built with Claude Code under a written agent setup: AGENTS.md, rules, hooks, skills and reviewer subagents.",
        },
        {
          claim: "site-landscape",
          text: "A live Highland glen whose season follows the date, its sky the sun over Glasgow, and its weather Glasgow's own.",
        },
      ],
      links: [
        { label: "Code on GitHub", href: "https://github.com/julian-palomo/julianpalomo.dev" },
      ],
    },
  ],
};

export type Messages = typeof en;
