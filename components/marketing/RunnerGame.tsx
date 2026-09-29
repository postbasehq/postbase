"use client";

import { useEffect, useRef, useState } from "react";
import { BRANDS } from "@/components/BrandTile";

/*
 * The 404 page's Chrome-dino homage: the Postbase icon runs along a ground
 * line, jumps network tiles, lands on floating platforms and picks up a
 * double-jump power-up. Canvas, no dependencies. Space / up arrow / click /
 * tap to jump; it never starts on its own.
 */

// Tall enough for the highest possible reach: top platform (85) + jump (~120) + double
// jump (~70) + the runner and its ring (~38) = ~313px above the ground line.
const H = 370; // canvas height in CSS px; width follows the container
const GROUND = 340; // y of the ground line
const RUNNER = 34; // runner size
const RX = 48; // runner's fixed x
const GRAVITY = 2400; // px/s²
const JUMP = 760; // px/s: first jump (peaks ~120px up)
const DOUBLE = 580; // px/s: the mid-air jump (~70px more)
const START_SPEED = 360; // px/s
const MAX_SPEED = 900;
const POWER_SECONDS = 10;

// Postbase blue, amber and red (solid, same in light and dark).
const TONES = ["#2b59d9", "#e3a72c", "#d14a3e"];
const AMBER = "#e3a72c";

// Solid-colour networks only (Instagram's gradient doesn't suit a canvas fill).
const NETWORKS = ["x", "linkedin", "tiktok", "youtube", "bluesky", "mastodon", "threads", "facebook"];

type Obstacle = { x: number; size: number; stack: number; brand: string };
type Platform = { x: number; w: number; h: number; tone: string };
type Power = { x: number; h: number; taken: boolean };
type State = "idle" | "running" | "over";

const BEST_KEY = "postbase-404-best";

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(n: number) {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {}
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function fresh() {
  return {
    state: "idle" as State,
    y: 0, // runner's feet, in px above the ground line
    vy: 0,
    grounded: true,
    jumps: 0, // jumps used since last touching a surface
    flip: 0, // 0..1 progress of the double-jump flip
    speed: START_SPEED,
    dist: 0,
    bonus: 0,
    t: 0, // seconds since the run started
    powerUntil: 0, // run time the double jump lasts until
    nextObstacle: 600,
    nextPlatform: 900,
    nextPower: 1400,
    obstacles: [] as Obstacle[],
    platforms: [] as Platform[],
    powers: [] as Power[],
    toneIndex: 0,
    width: 600,
  };
}

export function RunnerGame() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<State>("idle");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [power, setPower] = useState(0); // whole seconds of double jump left, for the HUD
  const [touch, setTouch] = useState(false);
  // Everything the loop mutates lives in a ref so re-renders don't reset it.
  const game = useRef(fresh());

  useEffect(() => {
    setBest(readBest());
    setTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext("2d")!;
    const icon = new Image();
    icon.src = "/postbase-icon.png";
    const glyphs = Object.fromEntries(NETWORKS.map((n) => [n, new Path2D(BRANDS[n].path)]));

    const resize = () => {
      const w = wrap.current!.clientWidth;
      const dpr = window.devicePixelRatio || 1;
      cv.width = w * dpr;
      cv.height = H * dpr;
      cv.style.width = `${w}px`;
      cv.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      game.current.width = w;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap.current!);

    const css = () => {
      const s = getComputedStyle(document.documentElement);
      return { line: s.getPropertyValue("--line").trim(), muted: s.getPropertyValue("--muted").trim() };
    };

    let raf = 0;
    let last = performance.now();
    let shownScore = -1;
    let shownPower = -1;

    const end = () => {
      const g = game.current;
      g.state = "over";
      setState("over");
      const final = Math.floor(g.dist / 40) + g.bonus;
      if (final > readBest()) {
        saveBest(final);
        setBest(final);
      }
    };

    const frame = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const g = game.current;
      const W = g.width;
      const { line, muted } = css();

      if (g.state === "running") {
        g.t += dt;
        g.speed = Math.min(MAX_SPEED, g.speed + 12 * dt);
        const dx = g.speed * dt;
        g.dist += dx;

        // Scroll the world
        for (const o of g.obstacles) o.x -= dx;
        for (const p of g.platforms) p.x -= dx;
        for (const p of g.powers) p.x -= dx;
        g.obstacles = g.obstacles.filter((o) => o.x + o.size > -10);
        g.platforms = g.platforms.filter((p) => p.x + p.w > -10);
        g.powers = g.powers.filter((p) => p.x > -30 && !p.taken);

        // Spawn: tiles on the ground, platforms in the air, and now and then a power-up
        g.nextObstacle -= dx;
        if (g.nextObstacle <= 0) {
          const stack = g.speed > 520 && Math.random() < 0.3 ? 2 : 1;
          g.obstacles.push({ x: W + 20, size: Math.round(rand(26, 38)), stack, brand: NETWORKS[Math.floor(Math.random() * NETWORKS.length)] });
          g.nextObstacle = g.speed * rand(0.75, 1.65); // gap grows with speed so it stays jumpable
        }
        g.nextPlatform -= dx;
        if (g.nextPlatform <= 0) {
          const p = { x: W + 20, w: Math.round(rand(90, 180)), h: Math.round(rand(58, 85)), tone: TONES[g.toneIndex++ % 3] };
          g.platforms.push(p);
          // Sometimes the power-up waits on top of (or just above) the platform.
          if (g.nextPower <= 0) {
            g.powers.push({ x: p.x + p.w / 2, h: p.h + rand(28, 60), taken: false });
            g.nextPower = rand(1800, 3200);
          }
          g.nextPlatform = rand(700, 1500);
        }
        g.nextPower -= dx;
        if (g.nextPower <= -1200) {
          // No platform came along in time: float one over the ground instead.
          g.powers.push({ x: W + 20, h: rand(50, 90), taken: false });
          g.nextPower = rand(1800, 3200);
        }

        // Physics, with one-way platforms: land on them from above, pass up through them.
        const prev = g.y;
        g.vy -= GRAVITY * dt;
        g.y += g.vy * dt;
        let floor = 0;
        for (const p of g.platforms) {
          const over = RX + RUNNER - 6 > p.x && RX + 6 < p.x + p.w;
          if (over && prev >= p.h - 0.5 && g.y <= p.h) floor = Math.max(floor, p.h);
        }
        if (g.y <= floor) {
          g.y = floor;
          g.vy = 0;
          g.grounded = true;
          g.jumps = 0;
        } else g.grounded = false;
        // Ceiling: never let the icon leave the top of the canvas.
        const ceiling = GROUND - RUNNER - 30;
        if (g.y > ceiling) {
          g.y = ceiling;
          g.vy = Math.min(g.vy, 0);
        }
        if (g.flip > 0) g.flip = Math.min(1, g.flip + dt / 0.42);
        if (g.flip >= 1) g.flip = 0;

        // Power-up pickup
        const cx = RX + RUNNER / 2;
        const cy = GROUND - g.y - RUNNER / 2;
        for (const p of g.powers) {
          const py = GROUND - p.h;
          if (!p.taken && Math.hypot(p.x - cx, py - cy) < RUNNER / 2 + 14) {
            p.taken = true;
            g.powerUntil = g.t + POWER_SECONDS;
            g.bonus += 25;
          }
        }

        // Tiles only live on the ground, so they only hit you down there.
        const top = GROUND - RUNNER - g.y;
        for (const o of g.obstacles) {
          const oTop = GROUND - o.size * o.stack;
          if (RX + RUNNER - 6 > o.x + 4 && RX + 6 < o.x + o.size - 4 && top + RUNNER - 4 > oTop + 4) {
            end();
            break;
          }
        }

        const s = Math.floor(g.dist / 40) + g.bonus;
        if (s !== shownScore) {
          shownScore = s;
          setScore(s);
        }
        const left = Math.max(0, Math.ceil(g.powerUntil - g.t));
        if (left !== shownPower) {
          shownPower = left;
          setPower(left);
        }
      }

      // ── Draw ──
      ctx.clearRect(0, 0, W, H);

      // Ground: a solid line with passing dashes
      ctx.fillStyle = line;
      ctx.fillRect(0, GROUND, W, 1.5);
      for (let x = -(g.dist % 48); x < W; x += 48) ctx.fillRect(x, GROUND + 8, 14, 1.5);
      for (let x = -((g.dist * 0.6) % 90) + 30; x < W; x += 90) ctx.fillRect(x, GROUND + 16, 6, 1.5);

      // Platforms: solid brand-colour bars with round ends, and a faint post down to the ground
      for (const p of g.platforms) {
        const y = GROUND - p.h;
        ctx.fillStyle = line;
        ctx.fillRect(p.x + p.w / 2 - 0.75, y + 10, 1.5, p.h - 10);
        ctx.fillStyle = p.tone;
        ctx.beginPath();
        ctx.roundRect(p.x, y, p.w, 10, 5);
        ctx.fill();
      }

      // Power-ups: an amber "2×" token, bobbing
      for (const p of g.powers) {
        const y = GROUND - p.h + Math.sin(g.t * 5 + p.x * 0.02) * 3;
        ctx.fillStyle = AMBER;
        ctx.beginPath();
        ctx.arc(p.x, y, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#14161a";
        ctx.font = "600 12px ui-sans-serif, system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("2×", p.x, y + 0.5);
      }

      // Obstacles: network tiles, same look as BrandTile
      for (const o of g.obstacles) {
        const b = BRANDS[o.brand];
        for (let i = 0; i < o.stack; i++) {
          const y = GROUND - o.size * (i + 1);
          ctx.fillStyle = b.bg;
          ctx.beginPath();
          ctx.roundRect(o.x, y + 1, o.size, o.size - 2, o.size * 0.24);
          ctx.fill();
          ctx.save();
          const glyph = o.size * 0.52;
          ctx.translate(o.x + (o.size - glyph) / 2, y + (o.size - glyph) / 2);
          ctx.scale(glyph / 24, glyph / 24);
          ctx.fillStyle = "#ffffff";
          ctx.fill(glyphs[o.brand]);
          ctx.restore();
        }
      }

      // Shadow on whatever surface is under the runner, shrinking as it rises
      let surface = 0;
      for (const p of g.platforms) if (RX + RUNNER - 6 > p.x && RX + 6 < p.x + p.w && p.h <= g.y + 0.5) surface = Math.max(surface, p.h);
      const lift = g.y - surface;
      const shadow = Math.max(0.25, 1 - lift / 160);
      ctx.fillStyle = muted;
      ctx.globalAlpha = 0.25 * shadow;
      ctx.beginPath();
      ctx.ellipse(RX + RUNNER / 2, GROUND - surface + 2, (RUNNER / 2) * shadow, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Runner: the Postbase icon. Leans with its vertical speed; flips on a double jump.
      const powered = g.state === "running" && g.powerUntil > g.t;
      const ry = GROUND - RUNNER - g.y;
      ctx.save();
      ctx.translate(RX + RUNNER / 2, ry + RUNNER / 2);
      const lean = g.grounded ? 0 : Math.max(-0.35, Math.min(0.35, -g.vy / JUMP / 3));
      ctx.rotate(g.flip > 0 ? g.flip * Math.PI * 2 : lean);
      if (powered) {
        // Amber ring while the double jump is active; it blinks in the last two seconds.
        const blink = g.powerUntil - g.t < 2 && Math.floor(g.t * 8) % 2 === 0;
        if (!blink) {
          ctx.strokeStyle = AMBER;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.roundRect(-RUNNER / 2 - 4, -RUNNER / 2 - 4, RUNNER + 8, RUNNER + 8, RUNNER * 0.32);
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.roundRect(-RUNNER / 2, -RUNNER / 2, RUNNER, RUNNER, RUNNER * 0.24);
      ctx.clip();
      if (icon.complete && icon.naturalWidth) ctx.drawImage(icon, -RUNNER / 2, -RUNNER / 2, RUNNER, RUNNER);
      else {
        ctx.fillStyle = "#2b59d9";
        ctx.fill();
      }
      ctx.restore();

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    const jump = () => {
      const g = game.current;
      if (g.state !== "running") {
        const width = g.width;
        game.current = { ...fresh(), width, state: "running", vy: JUMP, grounded: false, jumps: 1 };
        setState("running");
        setScore(0);
        setPower(0);
        return;
      }
      if (g.grounded) {
        g.vy = JUMP;
        g.grounded = false;
        g.jumps = 1;
      } else if (g.powerUntil > g.t && g.jumps < 2) {
        g.vy = DOUBLE;
        g.jumps = 2;
        g.flip = 0.001;
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        // Don't hijack typing in inputs, and don't scroll the page.
        if (e.target instanceof Element && e.target.closest("input, textarea, [contenteditable]")) return;
        e.preventDefault();
        if (!e.repeat) jump();
      }
    };
    const el = wrap.current!;
    const onPointer = (e: PointerEvent) => {
      e.preventDefault();
      jump();
    };
    window.addEventListener("keydown", onKey);
    el.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      el.removeEventListener("pointerdown", onPointer);
    };
  }, []);

  return (
    <div
      ref={wrap}
      className="relative cursor-pointer touch-manipulation select-none"
      role="application"
      aria-label="Runner game: press space or tap to jump over the network tiles"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-4 font-mono text-[13px] tabular-nums text-muted">
        <span>
          {power > 0 ? (
            <span className="rounded-full bg-[#e3a72c] px-2.5 py-1 font-sans text-[12px] font-semibold text-[#14161a]">
              Double jump · {power}s
            </span>
          ) : null}
        </span>
        <span className="flex gap-4">
          {best > 0 ? <span>Best {String(best).padStart(5, "0")}</span> : null}
          <span className="text-ink">{String(score).padStart(5, "0")}</span>
        </span>
      </div>
      <canvas ref={canvas} className="block" />
      {state !== "running" ? (
        <div className="pointer-events-none absolute inset-x-0 top-10 flex flex-col items-center gap-1 text-center">
          <span className="font-display text-[15px] font-semibold text-ink">
            {state === "over" ? "Posted into a wall" : touch ? "Tap to run" : "Press space to run"}
          </span>
          <span className="text-[13px] text-muted">
            {state === "over"
              ? touch
                ? "Tap to try again"
                : "Space to try again"
              : "Jump the networks, land on the ledges, grab 2× for a double jump."}
          </span>
        </div>
      ) : null}
    </div>
  );
}
