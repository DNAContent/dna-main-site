// =========================================================================
// Boot: smooth scroll (Lenis) + scroll choreography (GSAP ScrollTrigger) +
// the DNA helix render loop + projected callouts.
// =========================================================================

import './styles.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

import { Helix } from './helix.js';
import { SCENES, CALLOUTS } from './scenes.js';
import { initFx } from './fx.js';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ----------------------------------------------------------------- helix ----
const helix = new Helix(document.getElementById('helix-canvas'));

// ------------------------------------------------------- smooth scrolling ----
const lenis = new Lenis({
  duration: 1.15,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: !reduceMotion,
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
// NOTE: lagSmoothing stays at the default during the intro so the initial
// shader-compile hitch is clamped (not applied as one huge delta that would
// fast-forward the intro timeline). We switch it to 0 in finishIntro().

// ------------------------------------------------------------- scrim ref ----
const scrim = document.getElementById('scrim');

// scroll-progress bar
const progressBar = document.createElement('div');
progressBar.className = 'progress__bar';
const progressWrap = document.createElement('div');
progressWrap.className = 'progress';
progressWrap.appendChild(progressBar);
document.body.appendChild(progressWrap);

// act-transition screen flash
const flashEl = document.createElement('div');
flashEl.className = 'flash';
document.body.appendChild(flashEl);
function flashScreen() {
  flashEl.classList.remove('is-on');
  void flashEl.offsetWidth; // restart the animation
  flashEl.classList.add('is-on');
}

// ---------------------------------------------- side dot-nav + HUD readout ---
const SECTION_LABELS = {
  hero: 'Start', overview: 'Overview', clients: 'Clients', services: 'Services',
  midcta: 'Scale', about: 'About', team: 'Team', testimonials: 'Praise',
  reel: 'Work', media: 'Media', insights: 'Insights', finalcta: 'Contact', footer: 'Footer',
};
const sceneOrder = [...document.querySelectorAll('[data-scene]')].map((s) => s.dataset.scene);

const dotnav = document.createElement('nav');
dotnav.className = 'dotnav';
dotnav.setAttribute('aria-label', 'Section navigation');
sceneOrder.forEach((name) => {
  const item = document.createElement('button');
  item.className = 'dotnav__item';
  item.dataset.go = name;
  item.innerHTML = `<span class="dotnav__label">${SECTION_LABELS[name] || name}</span><span class="dotnav__dot"></span>`;
  item.addEventListener('click', () => {
    const t = document.getElementById(name);
    if (t) lenis.scrollTo(t, { offset: 0 });
  });
  dotnav.appendChild(item);
});
document.body.appendChild(dotnav);
const dotItems = [...dotnav.children];

const hud = document.createElement('div');
hud.className = 'hud';
hud.innerHTML = `<span class="hud__idx">01</span><span class="hud__sep"></span><span class="hud__label">Start</span>`;
document.body.appendChild(hud);
const hudIdx = hud.querySelector('.hud__idx');
const hudLabel = hud.querySelector('.hud__label');

function setChrome(name) {
  dotItems.forEach((it) => it.classList.toggle('is-active', it.dataset.go === name));
  const i = sceneOrder.indexOf(name);
  if (i < 0) return;
  hudIdx.textContent = String(i + 1).padStart(2, '0');
  hudLabel.textContent = SECTION_LABELS[name] || name;
  hud.classList.remove('is-tick');
  void hud.offsetWidth;
  hud.classList.add('is-tick');
}

// ---------------------------------------------------- scene application ----
let activeScene = null;

const SHOWCASE = new Set(['midcta', 'finalcta']);

function applyScene(name) {
  if (!SCENES[name] || name === activeScene) return;
  const prev = activeScene;
  activeScene = name;

  // drive the helix target (Helix.render eases current -> target every frame)
  Object.assign(helix.target, SCENES[name].helix);

  // act transition — entering a showcase beat blooms the strand + flashes
  if (SHOWCASE.has(name) && prev !== null) {
    helix.flash(1.1);
    flashScreen();
  }

  // global readability scrim
  scrim.style.opacity = SCENES[name].scrim;

  // side dot-nav + HUD readout
  setChrome(name);

  // toggle callouts + the content element each one belongs to
  callouts.forEach((c) => {
    const on = c.def.scene === name;
    c.label.classList.toggle('is-on', on);
    const owner = document.querySelector(`[data-callout="${c.def.id}"]`);
    if (owner) owner.classList.toggle('is-active', on);
  });
}

// ------------------------------------------------------ build callout DOM ----
const layer = document.getElementById('callout-layer');
const svg = document.getElementById('callout-svg');
const svgNS = 'http://www.w3.org/2000/svg';

const callouts = CALLOUTS.map((def) => {
  const line = document.createElementNS(svgNS, 'line');
  svg.appendChild(line);

  const node = document.createElement('span');
  node.className = 'callout__node';
  node.style.opacity = '0';
  layer.appendChild(node);

  const label = document.createElement('div');
  label.className = 'callout';
  label.innerHTML = `<div class="callout__inner">
      <span class="callout__tag">${def.tag}</span>
      <span class="callout__txt">${def.text}</span>
    </div>`;
  layer.appendChild(label);

  return { def, line, node, label };
});

// ------------------------------------------------- per-section triggers ----
document.querySelectorAll('[data-scene]').forEach((section) => {
  const name = section.dataset.scene;
  ScrollTrigger.create({
    trigger: section,
    start: 'top 55%',
    end: 'bottom 45%',
    onEnter: () => applyScene(name),
    onEnterBack: () => applyScene(name),
  });
});

// ---------------------------------------------------------- reveals ----
function reveal(el) { el.classList.add('is-in'); }

if (reduceMotion) {
  document.querySelectorAll('[data-reveal], .block').forEach(reveal);
} else {
  // stagger the hero on load
  document.querySelectorAll('.section--hero [data-reveal]').forEach((el, i) => {
    el.style.transitionDelay = `${0.15 + i * 0.09}s`;
  });

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
      });
    },
    { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
  );
  document.querySelectorAll('[data-reveal], .block').forEach((el) => io.observe(el));
}

// ------------------------------------------------- nav auto-hide ----
const nav = document.getElementById('nav');
lenis.on('scroll', ({ scroll, direction, velocity }) => {
  if (scroll > 240 && direction === 1) nav.classList.add('is-hidden');
  else nav.classList.remove('is-hidden');
  // scroll momentum spins the strand — fast flicks whip it, slow drags ease it
  helix.addSpin((velocity || 0) * 0.0016);
  if (progressBar) progressBar.style.transform = `scaleX(${pageProgress()})`;
});

function pageProgress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
}

// anchor links → lenis
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: 0 });
  });
});

// ------------------------------------------------- callout projection ----
const cx = () => window.innerWidth / 2;

function updateCallouts() {
  // callouts are hidden on mobile (see #callout-layer in styles) — skip the work
  if (window.innerWidth <= 820) return;
  for (const c of callouts) {
    const on = c.def.scene === activeScene;
    if (!on) {
      c.node.style.opacity = '0';
      c.line.style.opacity = '0';
      c.label.style.opacity = '0';
      continue;
    }
    const p = helix.anchorToScreen(c.def.anchor);
    if (!p || !p.visible) {
      c.node.style.opacity = '0';
      c.line.style.opacity = '0';
      c.label.style.opacity = '0';
      continue;
    }

    // push the label off the strand, toward the text column (away from helix)
    const dir = p.x > cx() ? -1 : 1;
    let lx = p.x + dir * 168;
    let ly = p.y - 6;
    lx = Math.max(96, Math.min(window.innerWidth - 96, lx));

    c.node.style.left = `${p.x}px`;
    c.node.style.top = `${p.y}px`;
    c.node.style.opacity = '1';

    c.label.style.left = `${lx}px`;
    c.label.style.top = `${ly}px`;
    c.label.style.opacity = '1';

    c.line.setAttribute('x1', p.x);
    c.line.setAttribute('y1', p.y);
    c.line.setAttribute('x2', lx + (dir < 0 ? 70 : -70));
    c.line.setAttribute('y2', ly);
    c.line.style.opacity = '1';
  }
}

// ----------------------------------------------------- master render loop ----
gsap.ticker.add(() => {
  helix.render(reduceMotion ? 0.12 : 0.06);
  updateCallouts();
});

// ============================================================ intro ====
// Preloader: the helix assembles from scattered parts while a brand counter
// runs; the overlay then wipes up to reveal the hero (which animates in).

function finishIntro() {
  gsap.ticker.lagSmoothing(0); // now prioritize smooth scroll feel
  applyScene('hero');
  scrim.style.opacity = SCENES.hero.scrim;
  // make sure the hero's masked reveals play now, after the wipe
  document.querySelectorAll('.section--hero .split').forEach((h) => h.classList.add('is-revealed'));
  document.querySelectorAll('.section--hero [data-reveal]').forEach((el) => el.classList.add('is-in'));
}

function buildIntroOverlay() {
  const el = document.createElement('div');
  el.className = 'intro';
  el.innerHTML = `
    <div class="intro__center">
      <span class="intro__brand">DNA</span>
      <span class="intro__sub">Digital Niche Agency</span>
    </div>
    <div class="intro__foot">
      <span class="intro__count">00</span>
      <span class="intro__label">Assembling the helix</span>
    </div>
    <div class="intro__track"><span class="intro__bar"></span></div>`;
  document.body.appendChild(el);
  return el;
}

function runIntro() {
  // park the strand centered while it assembles
  Object.assign(helix.current, { x: 0, y: 0, z: 0, scale: 1.0, bloom: 0.7, tilt: 0, orient: 0 });
  Object.assign(helix.target, { x: 0, y: 0, z: 0, scale: 1.0, bloom: 0.7, spin: 0.16, tilt: 0, orient: 0 });

  if (reduceMotion) {
    helix.setAssemble(1);
    document.body.classList.remove('is-intro');
    finishIntro();
    return;
  }

  helix.setAssemble(0);
  helix.spinBoost = 1.1; // initial whip that decays as it forms
  helix.render(1);       // warm up shaders now so the hitch isn't in the timeline
  lenis.stop();

  const intro = buildIntroOverlay();
  const counter = intro.querySelector('.intro__count');
  const bar = intro.querySelector('.intro__bar');
  const prog = { p: 0 };

  const tl = gsap.timeline({ onComplete: () => intro.remove() });
  tl.to(prog, {
      p: 1, duration: 2.0, ease: 'power2.inOut',
      onUpdate: () => {
        helix.setAssemble(prog.p);
        counter.textContent = String(Math.round(prog.p * 100)).padStart(2, '0');
        bar.style.transform = `scaleX(${prog.p})`;
      },
    }, 0)
    .fromTo('.intro__brand', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, 0.2)
    .to('.intro__center', { opacity: 0, y: -22, duration: 0.5, ease: 'power2.in' }, 1.75)
    .add(() => {                       // overlay begins to lift → reveal hero
      lenis.start();
      document.body.classList.remove('is-intro');
      helix.flash(0.9);
      finishIntro();
    }, 1.95)
    .to(intro, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, 1.95);
}

// microinteractions + reveals (splits headings, builds cursor, etc.)
document.body.classList.add('is-intro');
initFx();
runIntro();
