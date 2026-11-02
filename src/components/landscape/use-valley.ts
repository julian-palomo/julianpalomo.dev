import { type RefObject, useEffect, useRef, useState } from "react";
import { NEAR_HERD } from "../../lib/scene/herd";
import {
  type Chase,
  calfStep,
  chaseOffset,
  cowNear,
  headLook,
  NESSIE,
  NESSIE_ASLEEP,
  type NessieWatch,
  nessieX,
  nextChase,
  overCottage,
  type Point,
  pineAt,
  scenePoint,
  shootingStarAllowed,
  unitPx,
  visibleSpan,
  watchTap,
  windowsLit,
} from "../../lib/scene/valley";
import {
  atRest,
  type Curve,
  kick,
  type SpringState,
  settle,
  springs,
  stepSpring,
} from "../../lib/spring";
import { isMouseHover, motionReduced } from "../ui/boop";

/** Something drawn where the pointer was, in scene units, with an id for its key. */
export type Spot = { id: number; x: number; y: number };

export type Reactions = {
  star: Spot | null;
  nessie: Spot | null;
  /** Counts up with each puff of the cottage's chimney; 0 before the first. */
  puff: number;
  /** The near cow looking at the pointer, by its index in NEAR_HERD. */
  noticed: number | null;
};

export const NO_REACTIONS: Reactions = {
  star: null,
  nessie: null,
  puff: 0,
  noticed: null,
};

/** What the scene shows now, which decides the shooting star and the candle. */
type Scene = { elevation: number; clouds: number; rain: number };

const STAR_MS = 900;
// A pointer resting this long near a cow gets its attention; it lets go this long after.
const NOTICE_MS = 400;
const RELEASE_MS = 1500;
// A pine sways again only after this long, and this far, in degrees.
const BRUSH_MS = 1000;
const BRUSH_DEGREES = 4;
// The candle being lit: a window's opacity, flickering then steady.
const FLICKER: Keyframe[] = [1, 0.35, 0.9, 0.5, 1, 0.7, 1].map((opacity) => ({ opacity }));
const FLICKER_MS = 800;

const brushCurve: Curve = kick(springs.shake);
const lookCurve: Curve = settle(springs.follow);

/** Rotation in degrees of an element's computed transform, 0 when it has none. */
function angleOf(element: Element): number {
  const { transform } = getComputedStyle(element);
  if (!transform || transform === "none") return 0;
  const { a, b } = new DOMMatrix(transform);
  return (Math.atan2(b, a) * 180) / Math.PI;
}

/** Moves `element` with a settling spring from `from` to `to`, holding there. */
function settleTo(element: Element, from: number, to: number, frame: (value: number) => Keyframe) {
  for (const animation of element.getAnimations()) animation.cancel();
  return element.animate(
    lookCurve.values.map((value) => frame(from + (to - from) * value)),
    { duration: lookCurve.durationMs, easing: "linear", fill: "forwards" },
  );
}

/**
 * The valley noticing the pointer (DESIGN.md section 7): listens on `layer`,
 * the hero's landscape under its controls, and says what to draw. Taps on
 * the loch and the sky are `click`s, which only fire when a finger didn't
 * move, so scrolling past the hero never counts as a tap. Everything else answers
 * only a mouse. Nothing at all with reduced motion.
 */
export function useValley(layer: RefObject<HTMLElement | null>, scene: Scene): Reactions {
  const [star, setStar] = useState<Spot | null>(null);
  const [nessie, setNessie] = useState<Spot | null>(null);
  const [puff, setPuff] = useState(0);
  const [noticed, setNoticed] = useState<number | null>(null);

  // The listeners read the scene as it is when they fire.
  const sceneNow = useRef(scene);
  useEffect(() => {
    sceneNow.current = scene;
  });

  useEffect(() => {
    const root = layer.current;
    if (!root) return;
    const box = () => root.getBoundingClientRect();
    const svg = () => root.querySelector("svg.landscape");
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const later = (run: () => void, ms: number) => {
      const timer = setTimeout(() => {
        timers.delete(timer);
        run();
      }, ms);
      timers.add(timer);
      return timer;
    };
    let ids = 0;
    // Where the mouse is in the scene, or null while it's off the hero.
    let latest: Point | null = null;

    /** Whether the drawing's `selector` shapes cover the point. */
    function covers(selector: string, { x, y }: Point): boolean {
      const shapes = svg()?.querySelectorAll(selector) ?? [];
      return [...shapes].some(
        (shape) => shape instanceof SVGGeometryElement && shape.isPointInFill(new DOMPoint(x, y)),
      );
    }
    const onLoch = (point: Point) => covers(".loch", point);
    // The sky: above the meadow, and on no hill or mountain.
    const onSky = (point: Point) => point.y < 230 && !covers(".land", point);

    // ── Nessie: taps on the water show nothing until she rises ──
    let watch: NessieWatch = NESSIE_ASLEEP;
    function tapLoch() {
      const next = watchTap(watch, performance.now());
      watch = next.watch;
      if (!next.rise) return;
      setNessie({ id: ids++, x: nessieX(visibleSpan(box())), y: NESSIE.y });
      later(() => setNessie(null), NESSIE.ms + 200);
    }

    // ── The shooting star ──
    let starUp = false;
    function shootingStar(point: Point) {
      if (starUp || !shootingStarAllowed(sceneNow.current)) return;
      starUp = true;
      setStar({ id: ids++, ...point });
      later(() => {
        starUp = false;
        setStar(null);
      }, STAR_MS);
    }

    function click(event: MouseEvent) {
      if (motionReduced()) return;
      const point = scenePoint(box(), event.clientX, event.clientY);
      if (onLoch(point)) tapLoch();
      else if (onSky(point)) shootingStar(point);
    }

    // ── The cottage ──
    let inCottage = false;
    function cottage(point: Point) {
      const over = overCottage(point);
      if (over && !inCottage) {
        setPuff((count) => count + 1);
        const pane = svg()?.querySelector(".cottage .window");
        if (pane && windowsLit(sceneNow.current.elevation)) {
          pane.animate(FLICKER, { duration: FLICKER_MS, easing: "ease-in-out" });
        }
      }
      inCottage = over;
    }

    // ── The pines ──
    let inPine: number | null = null;
    const brushedAt = new Map<number, number>();
    function pines(point: Point, movingRight: boolean) {
      const pine = pineAt(point);
      const now = performance.now();
      if (
        pine !== null &&
        pine !== inPine &&
        now - (brushedAt.get(pine) ?? -BRUSH_MS) >= BRUSH_MS
      ) {
        brushedAt.set(pine, now);
        const brush = svg()?.querySelectorAll(".brush")[pine];
        const lean = movingRight ? BRUSH_DEGREES : -BRUSH_DEGREES;
        brush?.animate(
          brushCurve.values.map((value) => ({ transform: `rotate(${lean * value}deg)` })),
          { duration: brushCurve.durationMs, easing: "linear" },
        );
      }
      inPine = pine;
    }

    // ── The herd ──
    let candidate: number | null = null;
    let looking: number | null = null;
    let noticeTimer: ReturnType<typeof setTimeout> | null = null;
    let releaseTimer: ReturnType<typeof setTimeout> | null = null;
    // The head's turn and the calf's step now, so a release starts from them.
    let lift = 0;
    let step = 0;
    const cowElement = (index: number) => svg()?.querySelector(`[data-cow="${index}"]`);

    function notice(index: number, point: Point) {
      const cow = NEAR_HERD[index];
      const element = cowElement(index);
      if (!cow || !element) return;
      looking = index;
      setNoticed(index);
      const head = element.querySelector(".hc-head");
      const lifter = element.querySelector(".hc-lift");
      if (head && lifter) {
        // Its grazing holds where it is; the lift turns the head the rest of the way.
        const to = headLook(cow, point) - angleOf(head);
        settleTo(lifter, lift, to, (value) => ({ transform: `rotate(${value}deg)` }));
        lift = to;
      }
      const stepper = element.querySelector(".hc-step");
      if (cow.calf && stepper) {
        const to = calfStep(cow, point);
        settleTo(stepper, step, to, (value) => ({ transform: `translateX(${value}px)` }));
        step = to;
      }
    }

    function release() {
      const index = looking;
      if (index === null) return;
      looking = null;
      const element = cowElement(index);
      const lifter = element?.querySelector(".hc-lift");
      const stepper = element?.querySelector(".hc-step");
      const back = lifter
        ? settleTo(lifter, lift, 0, (value) => ({ transform: `rotate(${value}deg)` }))
        : null;
      if (stepper && step !== 0) {
        settleTo(stepper, step, 0, (value) => ({ transform: `translateX(${value}px)` }));
      }
      lift = 0;
      step = 0;
      const resume = () => {
        for (const part of [lifter, stepper]) {
          for (const animation of part?.getAnimations() ?? []) animation.cancel();
        }
        // Another cow may have its attention by now.
        if (looking === null) setNoticed(null);
      };
      if (back) back.onfinish = resume;
      else resume();
    }

    function herd(point: Point | null) {
      const near = point ? cowNear(point) : null;
      if (near === looking && near !== null) {
        if (releaseTimer) clearTimeout(releaseTimer);
        releaseTimer = null;
      }
      if (near === candidate) return;
      candidate = near;
      if (noticeTimer) clearTimeout(noticeTimer);
      noticeTimer = null;
      if (near !== null && near !== looking) {
        noticeTimer = later(() => {
          if (looking !== null) release();
          if (latest) notice(near, latest);
        }, NOTICE_MS);
      }
      if (near === null && looking !== null && !releaseTimer) {
        releaseTimer = later(() => {
          releaseTimer = null;
          release();
        }, RELEASE_MS);
      }
    }

    // ── The midges ──
    let chase: Chase = { status: "home" };
    let swarmX: SpringState = { value: 0, velocity: 0 };
    let swarmY: SpringState = { value: 0, velocity: 0 };
    let swarmFrame = 0;
    let swarmLast = 0;
    function swarm(time: number) {
      const cloud = root?.querySelector<HTMLElement>(".midge-cloud");
      if (!cloud) {
        swarmFrame = 0;
        return;
      }
      const seconds = swarmLast ? Math.min(0.05, (time - swarmLast) / 1000) : 1 / 60;
      swarmLast = time;
      chase = nextChase(chase, latest, performance.now());
      const target = chaseOffset(chase, latest);
      swarmX = stepSpring(swarmX, target.x, springs.swarm, seconds);
      swarmY = stepSpring(swarmY, target.y, springs.swarm, seconds);
      const px = unitPx(box());
      cloud.style.transform = `translate(${(swarmX.value * px).toFixed(1)}px, ${(swarmY.value * px).toFixed(1)}px)`;
      const still = chase.status === "home" && atRest(swarmX, 0) && atRest(swarmY, 0);
      if (still) {
        cloud.style.transform = "";
        swarmFrame = 0;
        swarmLast = 0;
      } else {
        swarmFrame = requestAnimationFrame(swarm);
      }
    }
    function midges() {
      if (!swarmFrame && root?.querySelector(".midge-cloud")) {
        swarmFrame = requestAnimationFrame(swarm);
      }
    }

    // ── The mouse, one frame at a time ──
    let movingRight = true;
    let moveFrame = 0;
    function onFrame() {
      moveFrame = 0;
      const point = latest;
      if (!point) return;
      cottage(point);
      pines(point, movingRight);
      herd(point);
      midges();
    }
    function move(event: PointerEvent) {
      if (!isMouseHover(event) || motionReduced()) return;
      latest = scenePoint(box(), event.clientX, event.clientY);
      if (event.movementX !== 0) movingRight = event.movementX > 0;
      if (!moveFrame) moveFrame = requestAnimationFrame(onFrame);
    }
    function leave(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      latest = null;
      inCottage = false;
      inPine = null;
      herd(null);
    }

    // The springs' animations hold while the tab is hidden, like the CSS ones.
    function visibility() {
      const hidden = document.visibilityState === "hidden";
      for (const animation of root?.getAnimations({ subtree: true }) ?? []) {
        if (animation instanceof CSSAnimation || animation instanceof CSSTransition) continue;
        if (hidden) animation.pause();
        else if (animation.playState === "paused") animation.play();
      }
    }

    root.addEventListener("click", click);
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      root.removeEventListener("click", click);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", visibility);
      for (const timer of timers) clearTimeout(timer);
      cancelAnimationFrame(moveFrame);
      cancelAnimationFrame(swarmFrame);
    };
  }, [layer]);

  return { star, nessie, puff, noticed };
}
