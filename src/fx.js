// =========================================================================
// Microinteractions + motion polish that lift the page toward award-tier:
//   · masked word / line reveals on headings
//   · parallax ghost numerals per section
//   · custom cursor + magnetic buttons
//   · stat count-up
//   · 3D tilt on cards
// All progressive-enhancement: guarded for reduced-motion / touch.
// =========================================================================

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

// ---------------------------------------------------------------- reveals ---
// Split headings into masked words (and whole-line masks for the hero) that
// slide up from behind a clip. Returns once observed.
function makeWord(text, isEm) {
  const wrap = document.createElement('span');
  wrap.className = 'word';
  const inner = document.createElement('span');
  inner.className = 'word__i' + (isEm ? ' is-em' : '');
  inner.textContent = text;
  wrap.appendChild(inner);
  return { wrap, inner };
}

export function splitReveal() {
  const heads = document.querySelectorAll(
    '.hero__title, .display, .showcase__title, .svc-hero__title, .adrow__title, .timeline__what'
  );
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('is-revealed');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.25, rootMargin: '0px 0px -10% 0px' }
  );

  heads.forEach((h) => {
    if (h.classList.contains('split')) return;       // don't re-split
    if (h.querySelector('a')) return;                // preserve headings with links
    const inners = [];
    const frag = document.createDocumentFragment();

    h.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        node.textContent.split(/\s+/).forEach((w) => {
          if (!w) return;
          const { wrap, inner } = makeWord(w, false);
          frag.appendChild(wrap);
          inners.push(inner);
        });
      } else if (node.nodeName === 'BR') {
        frag.appendChild(document.createElement('br'));
      } else if (node.nodeType === 1 && node.classList.contains('line')) {
        // hero line → whole-line block mask
        const line = document.createElement('span');
        line.className = node.className + ' mask-line';
        const inner = document.createElement('span');
        inner.className = 'word__i word__i--block';
        if (node.classList.contains('line--accent')) inner.classList.add('is-em');
        inner.textContent = node.textContent;
        line.appendChild(inner);
        frag.appendChild(line);
        inners.push(inner);
      } else if (node.nodeType === 1) {
        const { wrap, inner } = makeWord(node.textContent, node.nodeName === 'EM');
        frag.appendChild(wrap);
        inners.push(inner);
      }
    });

    h.textContent = '';
    h.appendChild(frag);
    h.classList.add('split');
    if (reduce) { h.classList.add('is-revealed'); return; }
    inners.forEach((el, i) => (el.style.transitionDelay = `${i * 0.055}s`));
    io.observe(h);
  });
}

// -------------------------------------------------------------- parallax ----
// Giant faint index numerals that drift against the scroll for editorial depth.
export function ghostNumerals() {
  const sections = document.querySelectorAll('main > section[data-scene]');
  sections.forEach((sec, i) => {
    const g = document.createElement('span');
    g.className = 'ghost-num';
    g.setAttribute('aria-hidden', 'true');
    g.textContent = String(i + 1).padStart(2, '0');
    sec.appendChild(g);
    if (reduce) return;
    gsap.fromTo(
      g,
      { yPercent: 18 },
      {
        yPercent: -18,
        ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true },
      }
    );
  });
}

// ---------------------------------------------------------------- cursor ----
export function customCursor() {
  if (!fine || reduce) return;
  document.body.classList.add('has-cursor');
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  const label = document.createElement('div');
  label.className = 'cursor-label';
  document.body.append(ring, dot, label);

  let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my, rs = 1;
  addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px)`;
  });
  gsap.ticker.add(() => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    const ts = ring.classList.contains('is-grow') ? 2.1 : 1;
    rs += (ts - rs) * 0.2;
    ring.style.transform = `translate(${rx}px, ${ry}px) scale(${rs})`;
    label.style.transform = `translate(${rx}px, ${ry}px)`;
  });

  const grow = () => ring.classList.add('is-grow');
  const shrink = () => { ring.classList.remove('is-grow'); label.classList.remove('is-on'); };
  document.querySelectorAll('a, button, .btn, [data-tilt], .person, .blog-card')
    .forEach((el) => {
      el.addEventListener('mouseenter', grow);
      el.addEventListener('mouseleave', shrink);
    });

  // contextual "VIEW"-style label on richer targets
  const bindLabel = (sel, text) => {
    document.querySelectorAll(sel).forEach((el) => {
      el.addEventListener('mouseenter', () => {
        ring.classList.add('is-grow');
        label.textContent = text;
        label.classList.add('is-on');
      });
      el.addEventListener('mouseleave', shrink);
    });
  };
  bindLabel('.vtile', 'Play');
  bindLabel('.media-card', 'Watch');
  bindLabel('[data-marquee]', 'Explore');
}

// reel videos only play while on screen (saves battery / decode)
export function reelVideos() {
  const vids = [...document.querySelectorAll('[data-reel-video]')];
  if (!vids.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !reduce) e.target.play().catch(() => {});
        else e.target.pause();
      });
    },
    { threshold: 0.25 }
  );
  vids.forEach((v) => io.observe(v));
}

// clip-path wipe reveal on team photos, staggered across each row
export function clipReveal() {
  if (reduce) return;
  const items = [...document.querySelectorAll('.person__photo')];
  items.forEach((el, i) => {
    el.classList.add('clip-pre');
    el.style.transitionDelay = `${(i % 5) * 0.07}s`;
  });
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.remove('clip-pre'); io.unobserve(e.target); }
      });
    },
    { threshold: 0.1 }
  );
  items.forEach((el) => io.observe(el));
  // safety net — never leave a photo stuck hidden
  setTimeout(() => items.forEach((el) => el.classList.remove('clip-pre')), 4500);
}

// -------------------------------------------------------------- magnetic ----
export function magnetic() {
  if (!fine || reduce) return;
  document.querySelectorAll('.btn').forEach((btn) => {
    const strength = 0.35;
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      btn.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    });
    btn.addEventListener('mouseleave', () => (btn.style.transform = ''));
  });
}

// --------------------------------------------------------------- count-up ----
export function countUp() {
  const nums = document.querySelectorAll('.stat__num');
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        const tn = e.target.firstChild; // leading text node, e.g. "900" / "1M" / "1.5M" / "9-Figure"
        if (!tn || tn.nodeType !== 3) return;
        const m = tn.textContent.trim().match(/^(\D*)([\d.,]+)(.*)$/);
        if (!m) return;
        const [, prefix, numStr, suffix] = m;
        const target = parseFloat(numStr.replace(/,/g, ''));
        if (isNaN(target)) return;
        const decimals = (numStr.split('.')[1] || '').length;
        const hasComma = numStr.includes(',');
        const fmt = (v) => {
          const n = decimals ? v.toFixed(decimals) : String(Math.round(v));
          return prefix + (hasComma ? Number(n).toLocaleString('en-US') : n) + suffix;
        };
        if (reduce) { tn.textContent = fmt(target); return; }
        const o = { v: 0 };
        gsap.to(o, { v: target, duration: 1.4, ease: 'power2.out', onUpdate: () => (tn.textContent = fmt(o.v)) });
      });
    },
    { threshold: 0.6 }
  );
  nums.forEach((n) => io.observe(n));
}

// ------------------------------------------------------------------ tilt ----
export function cardTilt() {
  if (!fine || reduce) return;
  document.querySelectorAll('.media-card, .blog-card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateX(${-py * 7}deg) rotateY(${px * 9}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => (card.style.transform = ''));
  });
}

// ------------------------------------------------------ client marquee ----
// Two rows of real client logos scrolling in opposite directions, built from
// the downloaded manifest so the count adapts.
export async function clientMarquee() {
  const host = document.querySelector('[data-marquee]');
  if (!host) return;
  let files = [];
  try {
    files = await (await fetch('/clients/manifest.json')).json();
  } catch { /* assets not present */ }
  if (!files.length) return;

  const makeRow = (cls) => {
    const row = document.createElement('div');
    row.className = 'marquee__row ' + cls;
    for (let dup = 0; dup < 2; dup++) {
      const set = document.createElement('div');
      set.className = 'marquee__set';
      if (dup === 1) set.setAttribute('aria-hidden', 'true');
      files.forEach((f) => {
        const img = document.createElement('img');
        img.className = 'marquee__logo';
        img.src = '/' + f;
        img.alt = 'Client logo';
        img.loading = 'lazy';
        set.appendChild(img);
      });
      row.appendChild(set);
    }
    return row;
  };

  host.appendChild(makeRow('marquee__row--a'));
  host.appendChild(makeRow('marquee__row--b'));
  ScrollTrigger.refresh();
}

// ------------------------------------------------------- mobile nav menu ----
export function navMenu() {
  const nav = document.getElementById('nav');
  const toggle = nav && nav.querySelector('.nav__toggle');
  if (!toggle) return;
  const close = () => {
    nav.classList.remove('is-open');
    document.body.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  const open = () => {
    nav.classList.add('is-open');
    document.body.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    const first = nav.querySelector('.nav__links a');
    if (first) first.focus();
  };
  toggle.addEventListener('click', () => (nav.classList.contains('is-open') ? close() : open()));
  nav.querySelectorAll('.nav__links a').forEach((a) => a.addEventListener('click', close));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { close(); toggle.focus(); }
  });
  // click outside the nav closes the open menu
  document.addEventListener('click', (e) => {
    if (nav.classList.contains('is-open') && !nav.contains(e.target)) close();
  });
}

export function initFx() {
  navMenu();
  splitReveal();
  ghostNumerals();
  customCursor();
  magnetic();
  countUp();
  cardTilt();
  clipReveal();
  reelVideos();
  clientMarquee();
  ScrollTrigger.refresh();
}
