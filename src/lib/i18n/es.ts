import { site } from "../site";
import type { Messages } from "./en";

const numbers = new Intl.NumberFormat("es");

/** Every visible string on the site, in Spanish from Spain. Same keys as `en.ts`. */
export const es: Messages = {
  name: "Julián Palomo",
  // Deliberately the English role from site.ts: a Spanish one needs Julian's approval.
  role: site.role,
  intro:
    "Pregúntame por mi experiencia. Respondo solo con datos que he confirmado, con sus fuentes.",
  portraitAlt: "Retrato en pixel art de Julián Palomo",
  ogBubble: "Pregúntame por la experiencia de Julián",
  ogImageAlt:
    "Retrato en pixel art de Julián Palomo sobre un valle de las Highlands en una tarde de otoño, con una vaca de las Highlands que te invita a preguntar por su experiencia",
  metaDescription:
    "Pregunta por la experiencia de Julián Palomo. Las respuestas salen solo de datos que él ha confirmado, con sus fuentes.",

  switchLanguage: { short: "EN", label: "View in English" },
  themeToDark: "Cambiar al tema oscuro",
  themeToLight: "Cambiar al tema claro",
  muteSounds: "Silenciar sonidos",
  turnSoundsOn: "Activar sonidos",

  chatLabel: "Chat",
  chatHeading: "Pregúntame por Julián",
  chatReady: "Cuando quieras",
  heroCowHello: "¡Hola! Soy la vaca de las Highlands",
  greeting:
    "¡Hola! Pregúntame por la experiencia de Julián. Solo respondo con datos que él ha confirmado, y te enseño de dónde salen.",
  suggestionsLabel: "Preguntas sugeridas",
  suggestions: [
    "¿Qué hizo Julián en Cazoo?",
    "¿Qué es Form:at?",
    "¿Está Julián abierto a trabajar en remoto?",
    "¿Qué idiomas habla Julián?",
    "¿Necesita Julián patrocinio de visado?",
    "¿Cómo actualizó Julián React en Cazoo?",
  ],
  conversationLabel: "Conversación",
  keepAsking: "Sigue preguntando",
  copy: "Copiar",
  copied: "Copiado",
  couldntCopy: "No se pudo copiar",
  sourcesHeading: "Fuentes:",
  citationLabel: (number, label) => `Fuente ${number}: ${label}`,
  confirmedBy: (date, from) => `Confirmado por Julián el ${date} · ${from}`,
  fromCv: "de su CV",
  fromJulian: "de Julián",
  newAnswer: "Nueva respuesta ↓",
  composerHint: "Intro para enviar · Mayús+Intro para una línea nueva",
  questionsKept:
    "Las preguntas se guardan de forma anónima durante 90 días para mejorar el asistente.",
  answering: "Respondiendo…",
  answerLabel: "Respuesta",
  sourcesLabel: "Fuentes",
  checkSources: (count) => `Ver fuentes (${count})`,
  hideSources: "Ocultar fuentes",
  sourceNames: { cv: "CV", julian: "Julián" },
  demo: "Demo",
  lookingUpClaims: "Buscando en los datos confirmados…",
  checkingTopics: "Mirando qué temas hay…",

  questionLabel: "Tu pregunta",
  send: "Enviar",
  stop: "Parar",
  counter: (length, limit) => `${numbers.format(length)} / ${numbers.format(limit)}`,
  counterOver: (over, limit) =>
    `${numbers.format(over)} ${over === 1 ? "carácter" : "caracteres"} de más (máximo ${numbers.format(limit)})`,

  errorUnavailable: "El asistente no está disponible ahora mismo.",
  errorVisitorLimit:
    "Has llegado al límite de preguntas de hoy. Vuelve mañana o escribe a Julián directamente: lee todos los mensajes.",
  errorDailyBudget:
    "El asistente ha agotado el presupuesto de hoy. Vuelve mañana o escribe a Julián directamente: lee todos los mensajes.",
  errorGeneric: "Algo ha salido mal por mi parte. Vuelve a intentarlo en un momento.",
  questionsBackTomorrow: "Las preguntas vuelven mañana",
  contact: {
    before: "Aún puedes",
    writeToMe: "escribirme",
    reach: " o encontrarme en",
    between: "o",
    after: ".",
  },

  patTheCow: "Acaricia a la vaca",
  moo: "¡Muu!",

  glasgow: "Glasgow",
  weatherClouds: [
    "Despejado",
    "Despejado",
    "Algunas nubes",
    "Algunas nubes",
    "Nubes y claros",
    "Nublado",
    "Nublado",
    "Muy nublado",
    "Muy nublado",
    "Cubierto",
    "Cubierto",
  ],
  weatherRain: [
    "Seco",
    "Llovizna",
    "Llovizna",
    "Lluvia débil",
    "Lluvia débil",
    "Lluvia",
    "Lluvia",
    "Lluvia fuerte",
    "Lluvia fuerte",
    "Aguacero",
    "Aguacero",
  ],
  weatherSnow: "Nieve",
  weatherHaar: "Bruma",
  weatherCredit: { before: "Datos meteorológicos de", link: "Open-Meteo.com" },
  chipLiveName: (weather) => `El tiempo en Glasgow: ${weather}. Juega con el cielo`,
  chipPlayingName: (time) => `Tu cielo, ${time}. Volver a Glasgow en directo`,
  yourSky: "Tu cielo",
  tapToReset: "toca para volver",

  playWithTheSky: "Juega con el cielo",
  playSubtitle: "Solo en tu pantalla, todo el tiempo que quieras.",
  playBubble: "Psst… puedes cambiar el tiempo",
  close: "Cerrar",
  seasonLabel: "Estación",
  seasons: { spring: "Primavera", summer: "Verano", autumn: "Otoño", winter: "Invierno" },
  timeOfDay: "Hora del día",
  moments: {
    night: "noche",
    blue: "hora azul",
    golden: "hora dorada",
    morning: "mañana",
    day: "día",
  },
  cloudsLabel: "Nubes",
  rainLabel: "Lluvia",
  snowLabel: "Nieve",
  windLabel: "Viento",
  weatherSnowLevels: [
    "Sin nieve",
    "Copos",
    "Copos",
    "Nieve débil",
    "Nieve débil",
    "Nieve",
    "Nieve",
    "Nevada fuerte",
    "Nevada fuerte",
    "Ventisca",
    "Ventisca",
  ],
  weatherWind: [
    "Calma",
    "Brisa",
    "Brisa",
    "Fresco",
    "Fresco",
    "Ventoso",
    "Ventoso",
    "Fuerte",
    "Fuerte",
    "Temporal",
    "Temporal",
  ],
  snowInsteadOfRain: "Nieve en vez de lluvia",
  backToLive: "Volver a Glasgow en directo",

  downloadCv: "Descargar CV",
  contactOpen: "Contacto",
  contactTitle: "Escribe a Julián",
  contactSubtitle: "Lee todos los mensajes y responde por email.",
  contactName: "Nombre",
  contactEmail: "Email",
  contactEmailHint: "Para que Julián pueda responderte.",
  contactMessage: "Mensaje",
  contactWebsite: "Sitio web",
  contactSend: "Enviar mensaje",
  contactSending: "Enviando…",
  contactSent: "¡Gracias! Julián te responderá pronto.",
  contactFieldErrors: {
    name: "Escribe tu nombre.",
    email: "Eso no parece una dirección de email.",
    message: (min) => `Escribe al menos ${min} caracteres.`,
  },
  contactErrors: {
    verification:
      "No hemos podido comprobar que eres una persona. Espera a la comprobación de abajo y vuelve a intentarlo.",
    limit: "Ya has enviado los mensajes de hoy. Vuelve a intentarlo mañana, o búscalo en LinkedIn.",
    unavailable:
      "El formulario no funciona ahora mismo. Aún puedes encontrar a Julián en LinkedIn o GitHub.",
    send: "Tu mensaje no se ha enviado. Sigue aquí: vuelve a intentarlo en un momento.",
  },

  pagesLabel: "Páginas",
  projectsTitle: "Proyectos",
  askTheCow: "← Pregunta a la vaca",
  anythingElse: "¿Algo más? Pregúntame",
  // Las líneas "why" son las palabras de Julián, tal cual.
  projects: [
    {
      id: "format",
      name: "Form:at",
      meta: "Proyecto personal, hecho en solitario · mayo de 2026 – actualidad",
      why: "Teniendo una afinidad con el colectivo de música Form:at, para salir del monopolio de las plataformas más usadas y de pago como SoundCloud, YouTube, Mixcloud etc, decidimos que sería una idea genial tener un reproductor propio, a partir de ahí le fui añadiendo funcionalidades que en el resto de plataformas son de pago, y en esa es gratis.",
      points: [
        {
          claim: "format-offline",
          text: "Guarda sesiones de 90 minutos (100–220 MB cada una) para escucharlas sin cobertura: IndexedDB con una comprobación previa del espacio, un service worker que atiende peticiones Range para avanzar y retroceder, y reproducción desde la pantalla de bloqueo.",
        },
        {
          claim: "format-cloudflare",
          text: "Todo en Cloudflare: TanStack Start en Pages/Workers, D1 para el catálogo y la analítica, R2 para el audio, subidas prefirmadas directas a R2 para archivos de 220 MB y Web Push desde Workers.",
        },
        {
          claim: "format-admin",
          text: "Un panel de administración tras Cloudflare Access, con verificación JWT en el servidor en cada escritura.",
        },
        {
          claim: "format-tooling",
          text: "Un monorepo con pnpm y Turborepo, con un sistema de diseño compartido (Storybook, Chromatic), Vitest y Playwright en Chromium y WebKit, y CI/CD en GitHub Actions; hecho con Claude Code.",
        },
      ],
      links: [
        { label: "formatglasgow.com", href: "https://formatglasgow.com/" },
        { label: "Código en GitHub", href: "https://github.com/julian-palomo/form-at" },
      ],
    },
    {
      id: "site",
      name: "julianpalomo.dev",
      meta: "Proyecto personal · octubre de 2026 – actualidad",
      why: "Estuve pensando en una forma de fusionar en un proyecto mi currículum y que se viera que sé utilizar y aplicar inteligencia artificial al funcionamiento y al proceso de implementación. Así que un CV bot era una idea que cuadraba perfectamente con lo que buscaba. El paisaje de las Highlands es perfecto en referencia y como agradecimiento a la tierra que tan bien me ha acogido y en la que vivo y disfruto.",
      points: [
        {
          claim: "site-assistant",
          text: "Un asistente sobre Claude, con el Vercel AI SDK, cuyas herramientas de solo lectura devuelven únicamente datos que he confirmado; cada dato que cita tiene que haberlo consultado.",
        },
        {
          claim: "site-limits",
          text: "Límites diarios en Cloudflare D1: 30 preguntas por visitante y un tope de gasto, contando a los visitantes por un hash que cambia cada día, nunca por su IP.",
        },
        {
          claim: "site-evals",
          text: "Evals de LLM en CI: el asistente real responde a los casos y un segundo modelo, calibrado antes de cada ejecución, juzga cada frase.",
        },
        {
          claim: "site-agent-setup",
          text: "Hecho con Claude Code bajo una configuración de agentes escrita: AGENTS.md, reglas, hooks, skills y subagentes revisores.",
        },
        {
          claim: "site-landscape",
          text: "Un valle de las Highlands en directo: la estación sigue la fecha, el cielo el sol sobre Glasgow, y el tiempo es el de Glasgow.",
        },
      ],
      links: [
        { label: "Código en GitHub", href: "https://github.com/julian-palomo/julianpalomo.dev" },
      ],
    },
  ],
};
