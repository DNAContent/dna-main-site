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
function buildStrand() {
  const host = document.querySelector('.svc-strand');
  if (!host) return;
  const W = 200, H = 1000, cx = W / 2, amp = 64, turns = 6, steps = 240;
  const a = [], b = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const y = (i / steps) * H;
    a.push(`${(cx + Math.sin(t) * amp).toFixed(1)},${y.toFixed(1)}`);
    b.push(`${(cx + Math.sin(t + Math.PI) * amp).toFixed(1)},${y.toFixed(1)}`);
  }
  let rungs = '';
  for (let i = 0; i <= steps; i += 6) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const y = (i / steps) * H;
    const x1 = cx + Math.sin(t) * amp;
    const x2 = cx + Math.sin(t + Math.PI) * amp;
    const front = Math.cos(t) > 0;
    rungs += `<line class="strand-rung" x1="${x1.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y.toFixed(1)}" opacity="${front ? 0.9 : 0.3}"/>`;
    rungs += `<circle class="strand-node" cx="${x1.toFixed(1)}" cy="${y.toFixed(1)}" r="${front ? 3 : 1.8}"/>`;
  }
  host.innerHTML =
    `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMin slice" aria-hidden="true">` +
    rungs +
    `<polyline class="strand-rail" points="${a.join(' ')}"/>` +
    `<polyline class="strand-rail strand-rail--b" points="${b.join(' ')}"/>` +
    `</svg>`;
  if (!reduce) {
    const svg = host.querySelector('svg');
    svg.style.animation = 'strand-drift 26s linear infinite alternate';
    // gentle parallax: the strand counter-scrolls a touch
    gsap.to(host, {
      yPercent: -8, ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: 1 },
    });
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
  const note = (t) => {
    const n = document.getElementById('formNote');
    if (n) { n.hidden = false; n.textContent = t; }
  };
  cf.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = new FormData(cf);
    const f = (k) => (d.get(k) || '').toString().trim();
    if (!f('firstName') || !f('lastName') || !f('email') || !f('company')) {
      note('Please fill in the required fields (name, email, company).');
      return;
    }
    const subject = encodeURIComponent(`New inquiry from ${f('firstName')} ${f('lastName')}`);
    const body = encodeURIComponent(
      `Name: ${f('firstName')} ${f('lastName')}\nEmail: ${f('email')}\nPhone: ${f('phone')}\nCompany: ${f('company')}\n\n${f('message')}`
    );
    window.location.href = `mailto:content@digitalnicheagency.com?subject=${subject}&body=${body}`;
    note('Thanks — your email client should open. Prefer to talk? Call 310.496.5880.');
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

if (blogList || blogIndex || blogPost) {
  const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  import('./lib/wix.js').then(async (wix) => {
    if (!wix.wixEnabled) return; // keep placeholders until a client id is set

    const card = (p) => {
      const href = `/post.html?slug=${encodeURIComponent(p.slug || '')}`;
      const cover = wix.coverUrl(p);
      const thumb = cover
        ? `<span class="bcard__thumb" style="background-image:url('${cover}')"></span>`
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

    if (blogPost) {
      const slug = new URLSearchParams(location.search).get('slug');
      const post = slug ? await wix.getPostBySlug(slug) : null;
      if (post) {
        document.title = `${post.title} — Digital Niche Agency`;
        const cover = wix.coverUrl(post, 1600, 900);
        blogPost.innerHTML =
          `<p class="kicker">${esc(wix.formatDate(post)) || 'Article'}</p>` +
          `<h1 class="post__title">${esc(post.title || '')}</h1>` +
          (cover ? `<div class="post__cover"><img src="${cover}" alt="" /></div>` : '') +
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
