---
paths:
  - "src/**/*.tsx"
  - "src/**/*.css"
---

# Styling

Tailwind CSS 4 through `@tailwindcss/vite`. `src/styles/app.css` imports
Tailwind, `tokens.css`, `fonts.css`, `landscape.css`, `play.css`, `chat.css`, `cow.css`, `entrance.css`, `contact.css`, `transitions.css` and `how.css`;
`src/routes/__root.tsx` links `app.css`.

## Fonts live only in `src/styles/fonts.css`

- Bricolage Grotesque and Inter, self-hosted from `@fontsource-variable/*`, never from Google Fonts. Only the Latin subset, declared by hand there because Fontsource's own stylesheets declare every subset.
- `font-sans` (Inter) is the default; `font-display` (Bricolage Grotesque) is for the name, the role, titles and buttons with text. Sizes and weights follow `DESIGN.md` section 3.
- `src/routes/__root.tsx` preloads the same two `.woff2` files with `?url` imports. A font file changed in one place changes in the other.

## Colours live only in `src/styles/tokens.css`

- Each colour is a CSS variable, defined twice: light on `:root` and dark on `:root[data-theme="dark"]`. The server always renders `<html data-theme>`, from the `theme` cookie or Glasgow's sun (`src/components/theme/Theme.tsx`), so the OS setting plays no part and there is no `prefers-color-scheme` block.
- Each variable is also registered with `@property` as a `<color>`, so a theme change can transition it. `app.css` transitions every token on `:root` only while `<html data-theme-change>` is set: 0.6s for the toggle, 6s when Glasgow's dusk or dawn arrives, 0.3s under reduced motion. Colours never animate on load or hydration.
- `@theme inline` exposes each variable as a Tailwind colour (`bg-background`, `text-foreground`, `text-muted`). A new colour is a new variable in both blocks, an `@property`, a name in `app.css`'s `transition-property` list and a line in `@theme inline`.
- **No colour literals in components**: no hex, `oklch()` or Tailwind palette colours like `text-gray-500`. Use the token utilities.
- **No `dark:` variants.** Dark mode is the tokens' job; a colour that differs in dark mode is a token.
- Values are hex (`rgb()` for the translucent `glass`), matching the table in `DESIGN.md` section 2.
- **Contrast is tested.** `tests/unit/tokens.test.ts` reads `tokens.css` and checks each pair on screen against WCAG AA in both themes (4.5:1 for text, 3:1 for field borders), and that every token is registered and transitioned. A new pair gets a line in its `pairs` list; a failing pair changes the value, and the `DESIGN.md` table with it.
- Fields (the composer, form inputs) are outlined in `field-border`, which reaches 3:1; `border` is for chips and dividers only.

## The one exception: the illustrations' palette

- The colours of the illustrations (the landscape and the cows) are part of the artwork, not UI, so they are data in `src/lib/scene/palette.ts`, copied from `docs/design/landscape-palettes.json` (`DESIGN.md` section 2): the assistant cow, the five sky moments, the land per season, the herd, the particles, and `sceneFixed` for the few colours the reference SVGs' own stylesheets hold. `tests/unit/assistant-cow.test.ts` and `tests/unit/scene.test.ts` keep it equal to the JSON.
- Only illustration components read it, and only for their drawing's fills and strokes; the compact bar's strip of hills (`src/components/bar/CompactBar.tsx`) is one. A bubble, chip or button on top of an illustration uses tokens like any other UI.

## The gear's panel styles live in `src/styles/play.css`

- The third exception to "Tailwind utilities only": the `<dialog>`'s sheet and popover layout and its clear backdrop, the range inputs' gradient tracks and two-tone thumbs, and the gear's entrance. Colours are tokens only (the `track-*` tokens for the tracks); `tests/unit/tokens.test.ts` checks the thumbs reach 3:1 against every track and the panel. Everything that moves sits inside `prefers-reduced-motion: no-preference`.

## The contact form's dialog lives in `src/styles/contact.css`

- Like the gear's panel, a `<dialog>` whose layout has no Tailwind utilities: a bottom sheet below 1024px and a centred 480px dialog from 1024px, over a backdrop that mixes `background` at 70%. Colours are tokens only. The sheet's rise and the dialog's fade sit inside `prefers-reduced-motion: no-preference`.

## The chat's motion lives in `src/styles/chat.css`

- Each word fading in as an answer types itself out (the pace is in `src/components/chat/reveal.ts`), source chips rising, a claim opening, the visitor's bubble popping in, the status pill's sweep and the wait's fade as the first word comes, all inside `prefers-reduced-motion: no-preference` (`DESIGN.md` section 11), plus the citation numbers' 24px hit area, a pseudo-element that doesn't change the line. The sweep moves a window and a copy of the line in opposite directions with `transform` only, never `background-position`; `WaitStatus.tsx` gives both one delay from `performance.now()`, so a remounted pill carries on in phase. `src/components/chat/` sets the classes; a FLIP from a suggestion chip runs with the Web Animations API in `MessageList.tsx`, skipped with reduced motion.

## The landscape's SVG styles live in `src/styles/landscape.css`

- The second exception to "Tailwind utilities only": SVG parts, keyframes and `transform-box` rules, ported from the `<style>` of `docs/design/highland-scene.svg` and `herd-cow.svg`, with keyframes prefixed `landscape-`. It has no colour literals: `src/components/landscape/Landscape.tsx` puts every colour and level on the SVG root as a custom property, computed by `src/lib/scene/`, and switches parts with `data-` attributes (`data-season`, `data-snowy`, `data-haar`, `data-aurora`, `data-choreography`, `data-paused`).
- Every animation and transition sits inside `prefers-reduced-motion: no-preference`, so with reduced motion nothing in the hero moves and colours change instantly. Loops animate only `transform` and `opacity`; colours transition over 1.1s, and with the timings of `DESIGN.md` section 6 during a theme toggle.
- `tests/unit/landscape-drawing.test.ts` renders the landscape and checks every shape against the reference, in order. Never redraw a part: copy it from the reference.
- The valley's answers to the pointer (`DESIGN.md` section 7, `src/components/landscape/use-valley.ts`) live there too: the chimney's extra puff, the shooting star and Nessie, each drawn only while it plays, so the still drawing never has them; and the groups the springs move, `brush` around each pine and `hc-lift` and `hc-step` inside each herd cow, nested in the parts' own groups so they add to the loops instead of replacing them.
- The particles (`src/components/landscape/Particles.tsx`) live there too: HTML elements in a size container over the hero, so `cqh` is the hero's height and a scene coordinate x sits at `50% + (x − 600) × 100cqh / 320`. Each particle's position, size, timing and colour arrive as custom properties computed by `src/lib/scene/particles.ts`. With reduced motion the layer isn't shown at all.

## The assistant cow's motion lives in `src/styles/cow.css`

- Its keyframes come from the `<style>` of `docs/design/assistant-cow.svg`, prefixed `cow-`, and are keyed by the `data-state` and `data-pat` that `src/components/cow/AssistantCow.tsx` sets. Only the chat's cow has `.cow-live`, so the link preview card's stays still. Its 8px rise over the chat's edge (`.edge-lift`, `src/components/chat/ChatEdge.tsx`) lives here too.
- Every rule that moves it sits inside `prefers-reduced-motion: no-preference`, so with reduced motion it's the still drawing in every state. Only `transform` and `opacity` animate.
- The lick lasts 1.6s here and in `LICK_MS` (`src/lib/cow-state.ts`); keep the two in step.
- The `reading` state, after a long wait, is the one shown outside `no-preference`: the glasses, the notebook held in front and the head lowered 5 units say what the cow is doing, so with reduced motion they show, still. The notebook's rise, the glasses' fade and the head's sweep along the lines sit inside `no-preference`, like the rest. The notebook sits outside `.tilt`, so it stays put while the head moves; the glasses sit inside it, so they move with the head.
- Its tilt towards the pointer arrives as `--cow-follow` from `src/components/cow/use-cow-follow.ts` and is applied with the `rotate` property on the drawing, which composes with the `transform` its states animate.

## The page's entrance lives in `src/styles/entrance.css`

- Every beat of both entrances (`DESIGN.md` section 11, "Entrance") as a CSS animation, keyed by the `data-entrance` the server renders on the page's root and timed from the first paint, inside `prefers-reduced-motion: no-preference`. Keyframes, prefixed `entrance-`, name only where they start, so each part ends as it is without the entrance: never give one a `to` that would override a part's own state, like a haar that's off. It targets `enter-*` classes (in the landscape, groups that wrap its parts, so a part's own animation is never replaced) and the chat's `edge-cow`, `chat-frame` and `chat-line`.
- `src/components/entrance/Entrance.tsx` reads the time from the root's `entrance-clock` animation and removes `data-entrance` to end the entrance; the cow's flight runs with the Web Animations API in `ChatEdge.tsx`, over the CSS. `src/lib/entrance.ts` holds the same beats; change a time in both.

## The change of page lives in `src/styles/transitions.css`

- The view transition between pages (`DESIGN.md` sections 11 and 18): the timing of every `::view-transition-*` pseudo-element, the hero's snapshots anchored at the bottom, and `animation: none` under reduced motion. The router decides when a transition runs (`src/router.tsx`, `src/lib/page-transition.ts`).
- The names live in `src/components/page/transition-names.ts`, as Tailwind classes. A name may be on one element per page only; the hero's is set only while it's on screen.

## How it's built's diagrams' motion lives in `src/styles/how.css`

- The ring's dot turning and Claude's fetch with the facts' glow, the cycle's dot, marching line and pulse, and a ring card rising in (`DESIGN.md` sections 11 and 18). `src/components/how/` sets the classes, and the dots' positions as inline transforms. Everything that moves sits inside `prefers-reduced-motion: no-preference`, and only `transform` and `opacity` animate: the marching line moves a dashed line along itself, never its `stroke-dashoffset`.

## Focus

- `app.css` gives every `:focus-visible` element a 3px `accent` outline 2px away (`DESIGN.md` section 15). Never remove it without a replacement.
- `app.css`'s `@layer base` also gives the hand cursor to every button that isn't disabled or `aria-disabled`, `[role="button"]`, `summary`, and a `label` that wraps a radio or checkbox (`DESIGN.md` section 4). Never add `cursor-pointer` to one element at a time: a pressable element that lacks the hand belongs in that rule. The sliders' thumbs get `grab` and `grabbing` in `play.css`.
- A field shows focus on its box instead: the border turns `accent` with a 4px `ring-accent/22` glow, and the field keeps a transparent 2px outline, which is what Windows high-contrast mode paints when it drops the glow. `src/components/chat/Composer.tsx` is the exemplar.

## Shared pieces live in `src/components/ui/`

- Small, typed and feature-free. `IconButton` is a round, flat, 44px icon-only button with a required `label` (its accessible name) and a `look`: `accent`, `glass` (`bg-glass` with a 6px blur) for buttons on the landscape, or `tint` for buttons on a panel. Its press scale (0.92 over 80ms) runs only under `motion-safe`; `aria-disabled` dims it to 50% and stops the press, while it keeps focus (How it's built's Previous step).
- `BubbleTail` is a speech bubble's comic-style tail (`DESIGN.md` section 4), on the bubble's `left`, `top` or `bottom` edge, in `field` and `border`. Its callers place it so its joining edge covers the bubble's 1.5px border: the hero's hello, the cow's "Moo!" and the gear's hint.
- `CloseIcon` is the cross on a dialog's or panel's Close button: the gear's panel and the contact form.
- `boop.ts` plays a button's gesture on hover (`DESIGN.md` sections 4 and 11): `boopOnHover` takes the parts to move, by their `data-boop` name, and keyframes as a function of the spring in `src/lib/spring.ts`, and plays them with the Web Animations API. Only with a mouse and without reduced motion, checked at the moment of hovering. A part that already has a CSS transform of its own (the theme toggle's sun and moon) moves in a group of its own inside it, so the two never fight.
- `looks.ts` holds the class strings several components share: `chip` (the suggestions' and source chips' outlined pill), `card` (the chat card's 2px border and 20px radius) and `textLink`. A caller adds its own size and type to them.
- `motion.ts` reads what the device allows at the moment it's needed: `motionReduced()` for every JavaScript animation, autoplay and view transition, and `isMouseHover()` for the hover gestures and what follows the pointer. No other script reads `prefers-reduced-motion` itself; stylesheets keep their own `@media` blocks.
- `Button` is the wide, flat, fully round button (`DESIGN.md` section 4), with a `look` (`primary` today) and a 0.97 press scale under `motion-safe`. "Back to live Glasgow" is its first caller.
- `OutsideLink` is every link to another site (`DESIGN.md` section 15): a new tab with `rel="noopener"`, and an `aria-label` of its visible text plus `opensInNewTab`, rather than a hidden span, which can leave a stray space in the name. A caller may pass an `icon` before the text, hidden from screen readers, as the GitHub pill does; its own `note`, ending the same way; and an `arrow`: How it's built's `DocLink` says ", on GitHub, opens in a new tab", with a ↗. `tests/e2e/links.spec.ts` checks every link on every page by its origin, so a plain `<a>` to another site fails it.
- A piece, or a new look of one, is added with its first caller, not ahead of it.

## Markup

- Tailwind utilities only. No inline `style` except genuinely dynamic values.
- Readable JSX: hoist nested ternaries and string-building into named consts above the `return`. No value in the markup should take more than a few seconds to understand.
- Semantic elements first (`main`, `h1`, `nav`, `button`); the e2e test finds the page by role (`tests/e2e/home.spec.ts`).
- The layout works at 375px wide (small phone) before anything else.

If `tokens.css`, `fonts.css`, `cow.css`, `landscape.css`, `play.css`, `chat.css`, `entrance.css`, `contact.css`, `transitions.css`, `how.css`, `app.css`, `src/lib/scene/palette.ts` or `src/components/ui/` change shape, update this rule.
