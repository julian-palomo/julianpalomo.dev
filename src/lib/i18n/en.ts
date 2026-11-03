/**
 * Every visible string on the site, in English. `es.ts` has the same keys:
 * its type is this object's, so a missing or extra key fails `tsc`. Text
 * that holds a number is a function, so each language orders and pluralises
 * it in its own way.
 */

import type { Doc } from "../how/docs";
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
  questionsKept: (days: number) =>
    `Questions are kept anonymously for ${days} days to improve the assistant.`,
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
  // The pill's line from sending to the first word (DESIGN.md section 10).
  readingQuestion: "Reading your question…",
  readingFacts: (count: number) =>
    count === 1 ? "Reading 1 confirmed fact…" : `Reading ${count} confirmed facts…`,
  writingAnswer: "Writing the answer…",
  chewingItOver: "Chewing it over properly…",
  waitChipsLabel: "Reading",
  moreFacts: (count: number) => `+${count} more`,

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
  howItsBuiltTitle: "How it's built",
  // The inner pages' cards at the end of the home page.
  projectsCard: "This site and Form:at, with screenshots and why I made each one.",
  howItsBuiltCard: "How the cow is built so it can't make up my experience.",
  // The How it's built page (DESIGN.md section 18), for readers who don't
  // program. Every sentence is true to the code and the docs; the numbers
  // come from the code.
  howItsBuilt: {
    lead: "AI assistants sometimes make things up, and say them with great confidence. This one is built so it can't make up my experience. Here's how, in plain words.",
    whatItDoes: "What it does",
    cow: {
      title: "A cow that only knows what I've checked",
      body: "This site has an assistant: a Highland cow you can ask about my experience. It doesn't search the internet. It can only read a list of facts about me that I've written and checked one by one, like a CV with my signature next to every line.",
    },
    sources: {
      title: "It always shows where it got it from",
      body: "Under an answer you can open its sources: the exact facts it used, and the day I confirmed each one. If it tries to cite a fact it didn't look up for that answer, the site doesn't accept it, and no source is shown for it.",
    },
    exam: {
      title: "It takes an exam before every change",
      body: 'I keep a set of questions, some of them tricky, like "so he was the engineering manager?" when I was the technical lead. Whenever I change how it answers, the cow takes the exam, and another AI marks its answers sentence by sentence. A few questions are ones it must always get right: if it gets one of those wrong, I don\'t accept the change.',
    },
    limits: {
      title: "With limits, and with respect",
      body: (questions: number, days: number) =>
        `Each visitor can ask ${questions} questions a day, and the whole site has a daily spending cap, so costs can't run away. To count your questions, the site doesn't keep your IP address, only a code made from it that changes every day. The visit counts don't use even that. Questions are kept anonymously for ${days} days to improve the assistant.`,
    },
    valley: {
      title: "A real valley",
      body: "The landscape at the top is live. The season follows the calendar, the sun sits at the height it really has over Glasgow right now, and the weather is Glasgow's, from the last half hour. If it's raining there, it's raining here.",
    },
    // The ring: how a question is answered (src/lib/how/ring.ts). The numbers
    // the code sets arrive as arguments; the names that live in model.ts and
    // tools.ts are written out, and tests/unit/how-its-built.test.ts checks them.
    howAnswered: "How a question is answered",
    ring: {
      pause: "Pause",
      play: "Play the journey",
      technical: "The technical side",
      question: {
        name: "Your question",
        plain: "Your question goes to this site's server first, never straight to the AI.",
        technical: (characters: number, messages: number) =>
          `POST /api/chat. At most ${numbers.format(characters)} characters, and only the latest ${messages} messages, starting with a question.`,
      },
      limits: {
        name: "Daily limits",
        plain: (questions: number) =>
          `Each visitor can ask ${questions} questions a day, and the whole site has a daily spending cap. Over a limit, the AI isn't even called.`,
        technical:
          "Counts in Cloudflare D1. A visitor is a SHA-256 of the IP (for IPv6, its /64 network), the UTC date and a secret salt, so no IP is kept. Over a limit, the answer is a 429.",
      },
      claude: {
        name: "Claude",
        plain:
          "Claude, an AI made by the company Anthropic, writes the answer. It can't search the internet: it can only look things up in the facts I've confirmed, in the middle of the circle.",
        technical:
          "Claude Sonnet 5.5 with three read-only tools: list_topics, get_claims and search_claims. Up to 5 steps per answer.",
      },
      check: {
        name: "Citation check",
        plain:
          "Every fact the answer cites must be one Claude looked up for this answer. If it isn't, no source is shown for it.",
        technical:
          "citations.ts reads the [[claim-id]] markers. An id that no tool returned gets no chip, and the server logs it.",
      },
      answer: {
        name: "Answer + sources",
        plain:
          "The answer types itself out with numbered sources. Open one to see the fact and the day I confirmed it.",
        technical:
          "Streamed. Each claim a tool returns is sent at once, as a data-sources part, before the text that cites it; the text then types itself out word by word in the browser.",
      },
      facts: {
        name: "Confirmed facts",
        plain:
          "A list of facts about me, each written and checked by me, with the day I confirmed it. Claude can read it, never change it.",
        // Not the field's own name: tests/e2e/bundle.spec.ts fails if it reaches the browser.
        technical:
          "src/content/claims.json. Only claims with a confirmation date reach the tools, and only Julian sets that date.",
      },
      shortcut: {
        name: "Shortcut",
        plain: (questions: number) =>
          `The suggested questions keep a stored answer, so asking one again replays it at once, with no AI call. It still counts as one of your ${questions}.`,
        technical:
          "cached_answers in D1, keyed by a hash of the model, its settings, the prompt, the tools and the claims: any change starts a fresh set.",
      },
    },
    howIBuiltIt: "How I built it",
    // The cycle: how a change goes round (src/lib/how/cycle.ts), one entry per step.
    cycle: {
      actors: {
        me: { name: "Me", role: "I decide" },
        claudeCode: { name: "Claude Code", role: "one session per task" },
        github: { name: "GitHub", role: "tasks and mailboxes" },
        supervisor: { name: "Supervisor", role: "Claude, in the app" },
      },
      previous: "Previous step",
      next: "Next step",
      again: "Start again",
      position: (step: number, steps: number) => `${step} of ${steps}`,
      views: "How to tell it",
      plain: "In plain words",
      developers: "For developers",
      steps: [
        {
          plain:
            "I give a task to a programming session of Claude Code, an AI assistant for writing code. Each one works in its own copy of the code.",
          technical: "/implement-issue 87, in its own git worktree.",
        },
        {
          plain:
            "Before any code, it writes its plan on the task and leaves a note in its mailbox.",
          technical: 'A plan comment on issue #87, then the pointer "plan: #87" on the mailbox PR.',
        },
        {
          plain: "The note wakes the supervisor.",
          technical: "A comment on the mailbox PR wakes the cloud thread subscribed to it.",
        },
        {
          plain:
            "The supervisor reviews the plan with the whole project in mind. Sometimes I OK it myself.",
          technical: "An owner comment on the issue, posted after the plan: the OK.",
        },
        {
          plain: "The session sees the OK and builds it.",
          technical: "wait-for-reply.sh checks every 2 minutes; then it implements.",
        },
        {
          plain:
            "Two AI reviewers read the change: one checks the rules are kept, the other that the docs still tell the truth.",
          technical:
            "/handoff: pnpm check, tests, then constraint-reviewer and docs-truth-checker.",
        },
        {
          plain: "It sends the change to GitHub and leaves another note.",
          technical: '/ship-pr, CI green, then "ready: PR #N" on the mailbox PR.',
        },
        {
          plain: "The supervisor reviews the change and tries it on a preview of the site.",
          technical:
            "A review on the PR, a test on its Workers preview, and the run-evals label if it touches the bot.",
        },
        {
          plain: "It tells me what it found, in plain words.",
          technical: "A message in the Claude app, never a merge.",
        },
        {
          plain: "I decide. Only I accept a change into the site.",
          technical: "Julian merges; Cloudflare Workers Builds deploys main.",
        },
      ],
    },
    // Each document's name, on the link that opens it (src/lib/how/docs.ts).
    docNames: {
      "docs/architecture.md": "How a question is answered",
      ".claude/rules/claims.md": "The rules for claims",
      "docs/adr/2026-11-02-cached-suggestion-answers.md": "The decision on stored answers",
      ".claude/skills/implement-issue/SKILL.md": "The implement-issue skill",
      "AGENTS.md#2-workflow": "AGENTS.md: the workflow",
      ".claude/README.md": "The Claude Code setup",
      ".claude/skills/ship-pr/SKILL.md": "The ship-pr skill",
      "docs/evals.md": "The evals",
      "AGENTS.md#1-hard-constraints": "AGENTS.md: the hard constraints",
      "docs/adr/README.md": "The decisions (ADRs)",
    } satisfies Record<Doc, string>,
    // Said after each document's name, for screen readers.
    newTab: ", on GitHub, opens in a new tab",
  },
  askTheCow: "← Ask the cow",
  anythingElse: "Anything else? Ask me",
  // What each screenshot on the Projects page shows (src/components/projects/shots.ts).
  projectShots: {
    "format-player":
      "Form:at's player on a phone: the set's artwork, its waveform and the play controls",
    "format-sets":
      "Form:at's sets on a phone, each with buttons to save it for listening offline, share it and play it",
    "format-events": "Form:at's events on a phone: the next one, then the past ones",
    "format-home": "Form:at's home page on a desktop",
    "site-home":
      "This site's home page on a desktop: the Highland landscape, the portrait and the chat with the cow",
    "site-home-phone": "This site's home page on a phone, at night",
  },
  // One card per project. Each point is taken from the confirmed claim it
  // names, shortened and adding nothing (tests/unit/projects.test.ts). The
  // "why" lines are Julian's own words.
  projects: [
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
  ],
};

export type Messages = typeof en;
