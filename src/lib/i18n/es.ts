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
  citationLabel: (number, label) => `Fuente ${number}: ${label}`,
  confirmedBy: (date, from) => `Confirmado por Julián el ${date} · ${from}`,
  fromCv: "de su CV",
  fromJulian: "de Julián",
  newAnswer: "Nueva respuesta ↓",
  composerHint: "Intro para enviar · Mayús+Intro para una línea nueva",
  questionsKept: (days) =>
    `Las preguntas se guardan de forma anónima durante ${days} días para mejorar el asistente.`,
  answering: "Respondiendo…",
  answerLabel: "Respuesta",
  sourcesLabel: "Fuentes",
  checkSources: (count) => `Ver fuentes (${count})`,
  hideSources: "Ocultar fuentes",
  sourceNames: { cv: "CV", julian: "Julián" },
  opensInNewTab: ", se abre en una pestaña nueva",
  demo: "Demo",
  lookingUpClaims: "Buscando en los datos confirmados…",
  checkingTopics: "Mirando qué temas hay…",
  readingQuestion: "Leyendo tu pregunta…",
  readingFacts: (count) =>
    count === 1 ? "Leyendo 1 dato confirmado…" : `Leyendo ${count} datos confirmados…`,
  writingAnswer: "Escribiendo la respuesta…",
  chewingItOver: "Rumiándolo bien…",
  waitChipsLabel: "Leyendo",
  moreFacts: (count) => `+${count} más`,

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
  cvPill: "CV",
  contactOpen: "Contacto",
  contactTitle: "Escribe a Julián",
  contactSubtitle: "Lee todos los mensajes y responde a cada uno él mismo.",
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
  howItsBuiltTitle: "Cómo está hecha",
  projectsCard: "Esta web y Form:at, con capturas y por qué hice cada una.",
  howItsBuiltCard: "Cómo está hecha la vaca para que no pueda inventarse mi experiencia.",
  howItsBuilt: {
    lead: "Los asistentes de IA a veces se inventan cosas, y las dicen con mucha seguridad. Este está hecho para que no pueda inventarse mi experiencia. Te cuento cómo, en palabras sencillas.",
    whatItDoes: "Qué hace",
    cow: {
      title: "Una vaca que solo sabe lo que he comprobado",
      body: "Esta web tiene un asistente: una vaca de las Highlands a la que puedes preguntar por mi experiencia. No busca en internet. Solo puede leer una lista de datos sobre mí que he escrito y comprobado uno a uno, como un currículum con mi firma al lado de cada línea.",
    },
    sources: {
      title: "Siempre enseña de dónde lo ha sacado",
      body: "Debajo de una respuesta puedes abrir sus fuentes: los datos exactos que ha usado y el día en que confirmé cada uno. Si intenta citar un dato que no ha consultado para esa respuesta, la web no lo acepta y no muestra ninguna fuente para él.",
    },
    exam: {
      title: "Hace un examen antes de cada cambio",
      body: 'Tengo una lista de preguntas, algunas con trampa, como "¿entonces era el jefe de ingeniería?" cuando fui el líder técnico. Cada vez que cambio cómo responde, la vaca hace el examen y otra IA corrige sus respuestas frase a frase. Hay unas pocas preguntas que siempre tiene que acertar: si falla una de ellas, no acepto el cambio.',
    },
    limits: {
      title: "Con límites, y con respeto",
      body: (questions, days) =>
        `Cada visitante puede hacer ${questions} preguntas al día, y la web entera tiene un tope de gasto diario, para que los costes no se disparen. Para contar tus preguntas, la web no guarda tu dirección IP, solo un código hecho a partir de ella que cambia cada día. Las estadísticas de visitas no usan ni eso. Las preguntas se guardan de forma anónima durante ${days} días para mejorar el asistente.`,
    },
    valley: {
      title: "Un valle de verdad",
      body: "El paisaje de arriba está en directo. La estación sigue el calendario, el sol está a la altura real que tiene ahora mismo sobre Glasgow, y el tiempo es el de Glasgow de la última media hora. Si allí llueve, aquí también.",
    },
    howAnswered: "Cómo se responde una pregunta",
    ring: {
      pause: "Pausar",
      play: "Reproducir el recorrido",
      technical: "La parte técnica",
      question: {
        name: "Tu pregunta",
        plain: "Tu pregunta va primero al servidor de esta web, nunca directamente a la IA.",
        technical: (characters, messages) =>
          `POST /api/chat. Como mucho ${numbers.format(characters)} caracteres, y solo los últimos ${messages} mensajes, empezando por una pregunta.`,
      },
      limits: {
        name: "Límites diarios",
        plain: (questions) =>
          `Cada visitante puede hacer ${questions} preguntas al día, y la web entera tiene un tope de gasto diario. Si se pasa un límite, ni siquiera se llama a la IA.`,
        technical:
          "Cuentas en Cloudflare D1. Un visitante es un SHA-256 de la IP (en IPv6, su red /64), la fecha UTC y una sal secreta, así que no se guarda ninguna IP. Pasado un límite, la respuesta es un 429.",
      },
      claude: {
        name: "Claude",
        plain:
          "Claude, una IA de la empresa Anthropic, escribe la respuesta. No puede buscar en internet: solo puede consultar los datos que he confirmado, en el centro del círculo.",
        technical:
          "Claude Sonnet 5.5 con tres herramientas de solo lectura: list_topics, get_claims y search_claims. Hasta 5 pasos por respuesta.",
      },
      check: {
        name: "Revisión de citas",
        plain:
          "Cada dato que cita la respuesta tiene que ser uno que Claude haya consultado para esa respuesta. Si no lo es, no se muestra ninguna fuente para él.",
        technical:
          "citations.ts lee las marcas [[claim-id]]. Un id que ninguna herramienta devolvió no tiene chip, y el servidor lo registra.",
      },
      answer: {
        name: "Respuesta + fuentes",
        plain:
          "La respuesta se escribe sola, con fuentes numeradas. Abre una para ver el dato y el día en que lo confirmé.",
        technical:
          "Por streaming. Cada claim que devuelve una herramienta se envía en el momento, como una parte data-sources, antes del texto que lo cita; luego el texto se escribe solo, palabra a palabra, en el navegador.",
      },
      facts: {
        name: "Datos confirmados",
        plain:
          "Una lista de datos sobre mí, cada uno escrito y comprobado por mí, con el día en que lo confirmé. Claude puede leerla, nunca cambiarla.",
        technical:
          "src/content/claims.json. Solo los claims con fecha de confirmación llegan a las herramientas, y solo Julián pone esa fecha.",
      },
      shortcut: {
        name: "Atajo",
        plain: (questions) =>
          `Las preguntas sugeridas guardan una respuesta, así que volver a hacer una la reproduce al momento, sin llamar a la IA. Aun así, cuenta como una de tus ${questions}.`,
        technical:
          "cached_answers en D1, con una clave que es un hash del modelo, sus ajustes, el prompt, las herramientas y los claims: cualquier cambio empieza un juego nuevo.",
      },
    },
    howIBuiltIt: "Cómo la hice",
    cycle: {
      actors: {
        me: { name: "Yo", role: "decido" },
        claudeCode: { name: "Claude Code", role: "una sesión por tarea" },
        github: { name: "GitHub", role: "tareas y buzones" },
        supervisor: { name: "Supervisor", role: "Claude, en la app" },
      },
      previous: "Paso anterior",
      next: "Paso siguiente",
      again: "Empezar de nuevo",
      position: (step, steps) => `${step} de ${steps}`,
      views: "Cómo contarlo",
      plain: "En palabras sencillas",
      developers: "Para desarrolladores",
      steps: [
        {
          plain:
            "Le doy una tarea a una sesión de programación de Claude Code, un asistente de IA para escribir código. Cada una trabaja en su propia copia del código.",
          technical: "/implement-issue 87, en su propio git worktree.",
        },
        {
          plain:
            "Antes de escribir código, escribe su plan en la tarea y deja una nota en su buzón.",
          technical:
            'Un comentario con el plan en el issue #87, y luego el aviso "plan: #87" en el PR del buzón.',
        },
        {
          plain: "La nota despierta al supervisor.",
          technical: "Un comentario en el PR del buzón despierta al hilo en la nube suscrito a él.",
        },
        {
          plain:
            "El supervisor revisa el plan con todo el proyecto en la cabeza. A veces le doy el OK yo.",
          technical: "Un comentario del dueño en el issue, publicado después del plan: el OK.",
        },
        {
          plain: "La sesión ve el OK y lo construye.",
          technical: "wait-for-reply.sh mira cada 2 minutos; luego implementa.",
        },
        {
          plain:
            "Dos revisores de IA leen el cambio: uno comprueba que se cumplen las reglas, y el otro que la documentación sigue diciendo la verdad.",
          technical:
            "/handoff: pnpm check, los tests, y luego constraint-reviewer y docs-truth-checker.",
        },
        {
          plain: "Envía el cambio a GitHub y deja otra nota.",
          technical: '/ship-pr, CI en verde, y luego "ready: PR #N" en el PR del buzón.',
        },
        {
          plain: "El supervisor revisa el cambio y lo prueba en una vista previa de la web.",
          technical:
            "Una revisión en el PR, una prueba en su vista previa de Workers, y la etiqueta run-evals si toca el bot.",
        },
        {
          plain: "Me cuenta lo que ha encontrado, en palabras sencillas.",
          technical: "Un mensaje en la app de Claude, nunca un merge.",
        },
        {
          plain: "Decido yo. Solo yo acepto un cambio en la web.",
          technical: "Julián hace el merge; Cloudflare Workers Builds despliega main.",
        },
      ],
    },
    docNames: {
      "docs/architecture.md": "Cómo se responde una pregunta",
      ".claude/rules/claims.md": "Las reglas de los claims",
      "docs/adr/2026-11-02-cached-suggestion-answers.md": "La decisión de guardar respuestas",
      ".claude/skills/implement-issue/SKILL.md": "La skill implement-issue",
      "AGENTS.md#2-workflow": "AGENTS.md: el flujo de trabajo",
      ".claude/README.md": "La configuración de Claude Code",
      ".claude/skills/ship-pr/SKILL.md": "La skill ship-pr",
      "docs/evals.md": "Las evals",
      "AGENTS.md#1-hard-constraints": "AGENTS.md: las reglas fijas",
      "docs/adr/README.md": "Las decisiones (ADRs)",
    },
    newTab: ", en GitHub, se abre en una pestaña nueva",
  },
  askTheCow: "← Pregunta a la vaca",
  notFound: {
    title: "Página no encontrada",
    line: "He buscado por todas partes: esta página no está en el valle.",
  },
  pageError: {
    title: "Algo ha salido mal",
    line: "Es cosa mía, no tuya. Prueba otra vez en un momento.",
    tryAgain: "Probar otra vez",
  },
  anythingElse: "¿Algo más? Pregúntame",
  projectShots: {
    "format-player":
      "El reproductor de Form:at en un móvil: la portada del set, su forma de onda y los controles",
    "format-sets":
      "Los sets de Form:at en un móvil, cada uno con botones para guardarlo y escucharlo sin conexión, compartirlo y reproducirlo",
    "format-events": "Los eventos de Form:at en un móvil: el próximo y, debajo, los anteriores",
    "format-home": "La página de inicio de Form:at en un ordenador",
    "site-home":
      "La página de inicio de esta web en un ordenador: el paisaje de las Highlands, el retrato y el chat con la vaca",
    "site-home-phone": "La página de inicio de esta web en un móvil, de noche",
  },
  // Las líneas "why" son las palabras de Julián, tal cual.
  projects: [
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
  ],
};
