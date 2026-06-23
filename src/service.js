// =========================================================================
// Service-page boot: reuses the design system + FX (masked reveals, custom
// cursor, magnetic buttons, count-up) with smooth scroll, but NO Three.js.
// The DNA identity is carried by a generated 2D double-helix strand plus
// scroll-driven parallax and a timeline that draws in.
// =========================================================================

import './styles.css';
import './service.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initFx } from './fx.js';

gsap.registerPlugin(ScrollTrigger);
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------- smooth scrolling ----
const lenis = new Lenis({
  duration: 1.15,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: !reduce,
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

// --------------------------------------------------------- scroll progress ----
const bar = document.createElement('div');
bar.className = 'progress__bar';
const wrap = document.createElement('div');
wrap.className = 'progress';
wrap.appendChild(bar);
document.body.appendChild(wrap);
ScrollTrigger.create({
  start: 0, end: 'max',
  onUpdate: (self) => (bar.style.transform = `scaleX(${self.progress})`),
});

// --------------------------------------------------------- nav hide / show ----
const nav = document.getElementById('nav');
let lastY = 0;
if (nav) {
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      const down = y > lastY && y > 200;
      nav.classList.toggle('is-hidden', down);
      lastY = y;
    },
  });
}

// --------------------------------------------------- double-helix strand ----
// A depth-shaded double helix: each turn's front face is drawn thicker, larger
// and brighter while the back face thins and dims, and everything is painter's-
// sorted by depth so the front genuinely overlaps the back — a 3D tube read,
// not a flat wave.
function buildStrand() {
  const host = document.querySelector('.svc-strand');
  if (!host) return;
  const W = 220, H = 1000, cx = W / 2, amp = 70, turns = 6, steps = 300;
  const TAU = Math.PI * 2;
  const lerp = (a, b, n) => a + (b - a) * n;
  const sx = (t) => cx + Math.sin(t) * amp;       // screen x
  const dz = (t) => Math.cos(t);                  // depth -1 (back) .. 1 (front)
  const items = [];

  // a rail as depth-shaded short segments
  const rail = (phase, rgb, maxW, maxO) => {
    for (let i = 0; i < steps; i++) {
      const t0 = (i / steps) * TAU * turns + phase;
      const t1 = ((i + 1) / steps) * TAU * turns + phase;
      const y0 = (i / steps) * H, y1 = ((i + 1) / steps) * H;
      const n = (((dz(t0) + dz(t1)) / 2) + 1) / 2; // 0 back .. 1 front
      items.push({
        z: (dz(t0) + dz(t1)) / 2,
        s: `<line x1="${sx(t0).toFixed(1)}" y1="${y0.toFixed(1)}" x2="${sx(t1).toFixed(1)}" y2="${y1.toFixed(1)}" ` +
           `stroke="rgba(${rgb},${lerp(0.08, maxO, n).toFixed(2)})" stroke-width="${lerp(0.7, maxW, n).toFixed(2)}" stroke-linecap="round"/>`,
      });
    }
  };
  rail(0, '224,16,43', 3.6, 1);          // crimson strand
  rail(Math.PI, '244,241,236', 3.0, 0.65); // bone strand

  // base-pair rungs + accent nodes, depth-shaded
  for (let i = 0; i <= steps; i += 7) {
    const t = (i / steps) * TAU * turns;
    const y = (i / steps) * H;
    const xA = sx(t), xB = sx(t + Math.PI);
    const nFront = (Math.max(dz(t), dz(t + Math.PI)) + 1) / 2;
    items.push({
      z: Math.min(dz(t), dz(t + Math.PI)),
      s: `<line x1="${xA.toFixed(1)}" y1="${y.toFixed(1)}" x2="${xB.toFixed(1)}" y2="${y.toFixed(1)}" ` +
         `stroke="rgba(244,241,236,${lerp(0.03, 0.3, nFront).toFixed(2)})" stroke-width="${lerp(0.5, 1.4, nFront).toFixed(2)}"/>`,
    });
    const nA = (dz(t) + 1) / 2;
    items.push({
      z: dz(t),
      s: `<circle cx="${xA.toFixed(1)}" cy="${y.toFixed(1)}" r="${lerp(1, 3.6, nA).toFixed(2)}" fill="rgba(224,16,43,${lerp(0.2, 1, nA).toFixed(2)})"/>`,
    });
  }

  items.sort((p, q) => p.z - q.z); // far → near (painter's algorithm)
  host.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice" aria-hidden="true">${items.map((i) => i.s).join('')}</svg>`;

  if (!reduce) {
    const svg = host.querySelector('svg');
    svg.style.animation = 'strand-drift 26s linear infinite alternate';
    gsap.to(host, { yPercent: -8, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 1 } });
  }
}
buildStrand();

// ------------------------------------------------------------- reveals ----
// mirror the home page: [data-reveal] + .block fade/slide in on intersection
function reveal(el) { el.classList.add('is-in'); }
if (reduce) {
  document.querySelectorAll('[data-reveal], .block').forEach(reveal);
} else {
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); }
    }),
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  document.querySelectorAll('[data-reveal], .block').forEach((el) => io.observe(el));
}

// ------------------------------- scroll-reading: words brighten on scroll ----
document.querySelectorAll('[data-scroll-text]').forEach((el) => {
  if (el.children.length) return; // only split plain-text blocks (preserve inner markup)
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  const spans = words.map((w) => {
    const s = document.createElement('span');
    s.className = 'stw';
    s.textContent = w;
    el.appendChild(s);
    el.appendChild(document.createTextNode(' '));
    return s;
  });
  if (reduce) { spans.forEach((s) => (s.style.opacity = '1')); return; }
  gsap.to(spans, {
    opacity: 1, ease: 'none', stagger: 1,
    scrollTrigger: { trigger: el, start: 'top 82%', end: 'top 40%', scrub: true },
  });
});

// ------------------------------------------ image reveal (clip + settle) ----
if (!reduce) {
  const imgs = [...document.querySelectorAll('[data-img]')];
  imgs.forEach((el) => el.classList.add('img-pre'));
  const iio = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.remove('img-pre'); iio.unobserve(e.target); }
    }),
    { threshold: 0.2 }
  );
  imgs.forEach((el) => iio.observe(el));
  setTimeout(() => imgs.forEach((el) => el.classList.remove('img-pre')), 5000);
}

// ----------------------------------------- parallax on big index numerals ----
if (!reduce) {
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    const dist = parseFloat(el.dataset.parallax) || 22;
    gsap.fromTo(el, { yPercent: dist }, {
      yPercent: -dist, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
    });
  });
}

// ------------------------------------------------------------- timeline ----
const timeline = document.querySelector('.timeline');
if (timeline && !reduce) {
  const steps = [...timeline.querySelectorAll('.timeline__step')];
  gsap.to(timeline, {
    '--tl': 1, ease: 'none',
    scrollTrigger: {
      trigger: timeline, start: 'top 70%', end: 'bottom 75%', scrub: true,
      onUpdate: (self) => {
        const lit = Math.round(self.progress * steps.length);
        steps.forEach((s, i) => s.classList.toggle('is-live', i < lit));
      },
    },
  });
} else if (timeline) {
  timeline.style.setProperty('--tl', '1');
  timeline.querySelectorAll('.timeline__step').forEach((s) => s.classList.add('is-live'));
}

// ------------------------------------------------------- contact form ----
const cf = document.getElementById('contactForm');
if (cf) {
  const noteEl = document.getElementById('formNote');
  const note = (t, isError) => {
    if (!noteEl) return;
    noteEl.hidden = false;
    noteEl.textContent = t;
    noteEl.setAttribute('role', isError ? 'alert' : 'status');
  };
  const required = ['firstName', 'lastName', 'email', 'company'];
  cf.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = new FormData(cf);
    const val = (k) => (d.get(k) || '').toString().trim();
    if (val('bot-field')) return; // honeypot tripped — silently drop

    cf.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
    let firstBad = null;
    for (const k of required) {
      if (!val(k)) { const el = cf.querySelector(`[name="${k}"]`); if (el) { el.setAttribute('aria-invalid', 'true'); firstBad = firstBad || el; } }
    }
    const email = val('email');
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      const el = cf.querySelector('[name="email"]'); if (el) { el.setAttribute('aria-invalid', 'true'); firstBad = firstBad || el; }
    }
    if (firstBad) { note('Please complete the required fields with a valid email address.', true); firstBad.focus(); return; }

    try {
      const body = new URLSearchParams();
      for (const [k, v] of d.entries()) body.append(k, v);
      const res = await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
      if (!res.ok) throw new Error('status ' + res.status);
      cf.reset();
      note("Thanks — we've got it. We'll be in touch shortly.", false);
    } catch (err) {
      console.warn('[contact] submit failed:', err);
      note('Something went wrong. Email content@digitalnicheagency.com or call 310.496.5880.', true);
    }
  });
}

// --------------------------------------------- shared microinteractions ----
initFx();
ScrollTrigger.refresh();

// ------------------------------------------------------- Wix blog data ----
// Only loads the Wix SDK on pages that need it; degrades to the static
// placeholder markup when no client id is configured.
const blogList = document.querySelector('[data-blog-list]');
const blogIndex = document.querySelector('[data-blog-index]');
const blogPost = document.querySelector('[data-blog-post]');
// pre-rendered post pages already contain the article (static gen) — no fetch
const postPrerendered = blogPost && blogPost.hasAttribute('data-prerendered');

if (blogList || blogIndex || (blogPost && !postPrerendered)) {
  const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  import('./lib/wix.js').then(async (wix) => {
    if (!wix.wixEnabled) return; // keep placeholders until a client id is set

    const card = (p) => {
      const href = `/blog/${p.slug || ''}`;
      const cover = wix.coverUrl(p);
      const thumb = cover
        ? `<span class="bcard__thumb" style="background-image:url('${cover.replace(/["')\\]/g, '')}')"></span>`
        : `<span class="bcard__thumb"><span class="bcard__mark">DNA</span></span>`;
      return `<a class="bcard" href="${href}">${thumb}<span class="bcard__body">` +
        `<span class="bcard__meta">${esc(wix.formatDate(p)) || 'Article'}</span>` +
        `<span class="bcard__title">${esc(p.title || '')}</span>` +
        `<span class="bcard__excerpt">${esc(wix.postExcerpt(p))}</span>` +
        `<span class="bcard__more">Read Article &rarr;</span></span></a>`;
    };

    if (blogList) {
      const n = parseInt(blogList.dataset.blogList, 10) || 3;
      const items = await wix.listPosts(n);
      if (items && items.length) blogList.innerHTML = items.map(card).join('');
    }

    if (blogIndex) {
      const items = await wix.listPosts(30);
      if (items && items.length) {
        blogIndex.innerHTML = items.map(card).join('');
      } else {
        blogIndex.innerHTML = '<p class="svc-lede"><em>No posts found.</em></p>';
      }
    }

    if (blogPost && !postPrerendered) {
      let slug =
        (location.pathname.match(/\/blog\/([^/]+)/) || [])[1] ||
        new URLSearchParams(location.search).get('slug');
      try { slug = slug ? decodeURIComponent(slug) : slug; } catch { /* malformed URL — use raw */ }
      const post = slug ? await wix.getPostBySlug(slug) : null;
      if (post) {
        document.title = `${post.title} — Digital Niche Agency`;
        const cover = wix.coverUrl(post, 1600, 900);
        blogPost.innerHTML =
          `<p class="kicker">${esc(wix.formatDate(post)) || 'Article'}</p>` +
          `<h1 class="post__title">${esc(post.title || '')}</h1>` +
          (cover ? `<div class="post__cover"><img src="${esc(cover)}" alt="" /></div>` : '') +
          `<div class="post__body">${wix.richContentToHtml(post)}</div>`;
      } else {
        blogPost.innerHTML =
          '<p class="kicker">Not found</p><h1 class="post__title">Post Not Found</h1>' +
          '<p class="post__body">This article may have moved. <a href="/blog.html">Back to all articles</a>.</p>';
      }
    }

    ScrollTrigger.refresh();
  }).catch((e) => console.warn('[wix] blog module failed to load', e));
}
