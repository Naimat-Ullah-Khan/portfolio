/* =========================================================================
   UI & interactions
   ========================================================================= */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const html = document.documentElement;
  const mq = (q) => window.matchMedia(q).matches;
  const REDUCE = mq('(prefers-reduced-motion: reduce)');
  const FINE = mq('(hover: hover) and (pointer: fine)');
  const gsap = window.gsap;
  const Scene = window.Scene3D;
  const D = window.PORTFOLIO;

  // Email is assembled at runtime so it never appears in the page source (stops simple address-harvesting bots).
  const MAIL = atob('bW9jLmxpYW1nQDc4OTBuYWhraGFsbHV0YW1pYW4=').split('').reverse().join('');
  $$('[data-mail]').forEach((a) => {
    a.href = 'mailto:' + MAIL;
    if (a.hasAttribute('data-mail-text')) a.textContent = MAIL;
  });

  if (!gsap) { html.classList.remove('is-loading'); html.classList.add('no-js'); return; }
  if (REDUCE) html.classList.add('reduce');
  html.classList.add('is-booting');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // ---------------------------------------------------------------- icons
  const ICON = {
    shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z M9 12l2 2 4-4',
    card: 'M3 6h18v12H3z M3 10h18 M7 15h4',
    eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    layers: 'M12 2l10 5-10 5L2 7z M2 12l10 5 10-5 M2 17l10 5 10-5',
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    bag: 'M4 7h16l-1.5 13h-13z M8 7V5a4 4 0 0 1 8 0v2',
    spark: 'M12 2l2.6 6.4L21 11l-6.4 2.6L12 20l-2.6-6.4L3 11l6.4-2.6z',
  };
  const svg = (d, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
  const ARROW = 'M5 12h14M13 6l6 6-6 6';
  // escape any text before it is placed in HTML (defence in depth — all content is local/static)
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ---------------------------------------------------------------- render data
  const byId = Object.fromEntries(D.projects.map((p) => [p.id, p]));
  ['ai', 'fs'].forEach((tab) => {
    $(`.proj-grid[data-panel="${tab}"]`).innerHTML = D.projects.filter((p) => p.tab === tab).map((p) => `
      <button class="proj" data-project="${p.id}">
        <span class="proj-ico">${svg(ICON[p.icon])}</span>
        <span class="proj-txt">
          <span class="t">${esc(p.title)}</span>
          <span class="d">${esc(p.short)}</span>
          <span class="more"><span class="scr" data-hover="Open project">View details</span></span>
        </span>
        ${svg(ARROW, 'arrow-in')}
      </button>`).join('');
  });
  $('#car').innerHTML = D.industries.map((c) => `
    <button class="ind" data-project="${c.project}">
      <span class="ind-tags">${esc(c.tags)}</span>
      <span class="ind-mark">${esc(c.mark)}</span>
      <span class="t">${esc(c.title)}</span>
      <small>View project</small>
      ${svg(ARROW, 'arrow-in')}
    </button>`).join('');
  $('#skillGrid').innerHTML = D.skills.map(([name, tools], i) => `
    <div class="skill">
      <button class="skill-btn" aria-expanded="false" aria-controls="sk${i}">
        <span>${esc(name)}</span><em>${String(tools.length).padStart(2, '0')}</em>${svg(ARROW)}
      </button>
      <div class="skill-tools" id="sk${i}"><div>${tools.map((t) => `<span class="chip">${esc(t)}</span>`).join('')}</div></div>
    </div>`).join('');
  // duplicate rail for a seamless loop
  const track = $('.rail-track');
  Array.from(track.children).forEach((n) => { const c = n.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); });

  // ---------------------------------------------------------------- text scramble
  const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=<>/';
  function scramble(el, to, dur = 520) {
    cancelAnimationFrame(el._raf);
    const from = el.textContent;
    const len = Math.max(from.length, to.length);
    const at = Array.from({ length: len }, (_, i) => (i / len) * 0.6 + Math.random() * 0.2);
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      let out = '';
      for (let i = 0; i < len; i++) {
        const target = to[i] ?? '';
        if (target === ' ' || p >= at[i] + 0.2) out += target;
        else if (p >= at[i] * 0.4) out += CH[(Math.random() * CH.length) | 0];
        else out += from[i] ?? '';
      }
      el.textContent = out;
      if (p < 1) el._raf = requestAnimationFrame(step);
      else el.textContent = to;
    };
    el._raf = requestAnimationFrame(step);
  }
  function bindScramble(root = document) {
    $$('.scr', root).forEach((el) => {
      if (el._bound) return;
      el._bound = true;
      const text = el.textContent.trim();
      el.textContent = text;
      const host = el.closest('a, button') || el;
      if (!host.getAttribute('aria-label') && host.textContent.trim() === text) host.setAttribute('aria-label', text);
      if (!FINE || REDUCE) return;
      host.addEventListener('mouseenter', () => scramble(el, el.dataset.hover || el._text || text));
      host.addEventListener('mouseleave', () => scramble(el, el._text || text));
    });
  }
  bindScramble();

  // ---------------------------------------------------------------- split titles
  function split(el) {
    const frag = document.createDocumentFragment();
    (function walk(node, parent) {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/([ \t\n\r]+)/).forEach((part) => {
            if (!part) return;
            if (/^[ \t\n\r]+$/.test(part)) return parent.appendChild(document.createTextNode(' '));
            const w = document.createElement('span'); w.className = 'w';
            const wi = document.createElement('span'); wi.className = 'wi'; wi.textContent = part;
            w.appendChild(wi); parent.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          const c = n.cloneNode(false); parent.appendChild(c); walk(n, c);
        }
      });
    })(el, frag);
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    el.innerHTML = '';
    el.appendChild(frag);
    $$('.w', el).forEach((w) => w.setAttribute('aria-hidden', 'true'));
  }
  const splits = $$('.split');
  splits.forEach(split);
  function reveal(el, delay = 0) {
    if (el._revealed) return;
    el._revealed = true;
    const words = $$('.wi', el);
    if (REDUCE) return gsap.set(words, { yPercent: 0, y: 0 });
    const grad = words.filter((w) => w.closest('.grad'));
    const rest = words.filter((w) => !w.closest('.grad'));
    const tl = gsap.timeline({ delay });
    if (el.classList.contains('hero-title') && grad.length) {
      // the highlighted word arrives first, the rest follow — like the reference
      tl.fromTo(grad, { yPercent: 108, y: 0, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: 'expo.out' })
        .fromTo(rest, { yPercent: 108, y: 0 }, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.045 }, 0.35);
    } else {
      tl.fromTo(words, { yPercent: 108, y: 0 }, { yPercent: 0, duration: 1.15, ease: 'expo.out', stagger: 0.04 });
    }
  }
  const splitIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting && !e.target.classList.contains('hero-title')) { reveal(e.target); splitIO.unobserve(e.target); }
  }), { threshold: 0.25 });

  // ---------------------------------------------------------------- smooth scroll (Lenis)
  let lenis = null;
  if (window.Lenis && !REDUCE) {
    lenis = new window.Lenis({ lerp: 0.1, smoothWheel: true });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const stopScroll = () => (lenis ? lenis.stop() : (document.body.style.overflow = 'hidden'));
  const startScroll = () => (lenis ? lenis.start() : (document.body.style.overflow = ''));
  function scrollToTarget(target, offset = 0) {
    if (lenis) return lenis.scrollTo(target, { offset, duration: 1.5 });
    const top = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY + offset;
    window.scrollTo({ top, behavior: REDUCE ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    const target = id === '#top' ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(target, id === '#top' ? 0 : -10);
  });

  // ---------------------------------------------------------------- header + scene sync on scroll
  const hdr = $('#hdr');
  const themed = $$('[data-theme]');
  const scened = $$('[data-scene]');
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = window.scrollY, vh = window.innerHeight;
    hdr.classList.toggle('is-scrolled', y > 40);
    let theme = 'dark', active = false, sceneName = null;
    for (const s of themed) {
      const r = s.getBoundingClientRect();
      if (r.top <= 40 && r.bottom > 40) theme = s.dataset.theme;
      if (s.dataset.theme === 'dark' && r.bottom > 0 && r.top < vh) active = true;
    }
    for (const s of scened) {
      const r = s.getBoundingClientRect();
      if (r.top <= vh * 0.55 && r.bottom > vh * 0.45) sceneName = s.dataset.scene;
    }
    hdr.classList.toggle('is-light', theme === 'light');
    Scene.setActive(active);
    if (sceneName) Scene.setScene(sceneName);
    const max = document.documentElement.scrollHeight - vh;
    Scene.setScroll(max > 0 ? y / max : 0);
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);

  // ---------------------------------------------------------------- mobile menu
  const menuBtn = $('#menuBtn'), menu = $('#mobileMenu');
  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false');
    $('.scr', menuBtn).textContent = 'Menu'; startScroll();
  }
  menuBtn.addEventListener('click', () => {
    if (!menu.hidden) return closeMenu();
    menu.hidden = false; menuBtn.setAttribute('aria-expanded', 'true');
    scramble($('.scr', menuBtn), 'Close');
    gsap.fromTo($$('nav a', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.7, ease: 'expo.out', stagger: 0.05 });
    stopScroll();
  });

  // ---------------------------------------------------------------- hero: cursor + click & hold
  const hero = $('.hero');
  const cursor = $('#cursor');
  const prog = $('.cursor-progress');
  const CIRC = 2 * Math.PI * 48;
  prog.style.strokeDasharray = CIRC;
  prog.style.strokeDashoffset = CIRC;
  const words = $$('.hold-word').map((w) => {
    const t = w.textContent; w.textContent = '';
    return t.split('').map((ch) => { const s = document.createElement('span'); s.className = 'l'; s.textContent = ch; w.appendChild(s); return s; });
  });
  const HOLD_S = 9, WORD_AT = [1, 3.75, 6];
  let holding = false, tapMode = false, ringTw = null, wordsTl = null;

  function wordTimeline(letters) {
    return gsap.timeline()
      .set(letters, { opacity: 0 })
      .to(letters, { opacity: 1, duration: 0.12, stagger: { each: 0.03, from: 'start' }, ease: 'power2.out' })
      .to(letters, { opacity: 0.12, duration: 0.035, stagger: { each: 0.03, from: 'random' }, ease: 'power1.in' })
      .to(letters, { opacity: 1, duration: 0.035, stagger: { each: 0.03, from: 'random' }, ease: 'power1.out' })
      .to(letters, { opacity: 0, duration: 0.035, stagger: { each: 0.03, from: 'random' }, ease: 'power1.out' }, '+=0.75');
  }
  function startHold() {
    if (holding || REDUCE) return;
    holding = true;
    html.classList.add('is-holding');
    cursor.classList.add('is-holding');
    cursor.classList.remove('is-hidden');
    stopScroll();
    Scene.press();
    gsap.killTweensOf(prog);
    ringTw = gsap.fromTo(prog, { strokeDashoffset: CIRC }, {
      strokeDashoffset: 0, duration: HOLD_S, ease: 'none', onComplete: () => html.classList.add('is-hold-done'),
    });
    wordsTl = gsap.timeline();
    WORD_AT.forEach((t, i) => wordsTl.add(wordTimeline(words[i]), t));
  }
  function finishHold() {
    if (!holding) return;
    holding = false; tapMode = false;
    document.removeEventListener('pointerdown', globalStop, true);
    if (ringTw) ringTw.kill();
    if (wordsTl) wordsTl.kill();
    words.forEach((l) => { gsap.killTweensOf(l); gsap.set(l, { opacity: 0 }); });
    gsap.to(prog, { strokeDashoffset: CIRC, duration: 0.4, ease: 'power2.out' });
    html.classList.remove('is-holding', 'is-hold-done');
    cursor.classList.remove('is-holding');
    startScroll();
    Scene.release();
  }
  function globalStop(e) {
    if (e.target.closest('#holdMobile')) return;
    finishHold();
  }

  if (FINE && !REDUCE) {
    html.classList.add('has-cursor');
    let px = 0, py = 0, cx = 0, cy = 0, moved = false;
    const isUi = (t) => t.closest('[data-cursor-hide], a, button');
    hero.addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY;
      if (!moved) { cx = px; cy = py; moved = true; }
      cursor.classList.add('is-visible');
      cursor.classList.toggle('is-hidden', !!isUi(e.target) && !holding);
    });
    hero.addEventListener('pointerleave', () => { if (holding) finishHold(); cursor.classList.remove('is-visible'); });
    hero.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || !e.isPrimary || isUi(e.target)) return;
      e.preventDefault();
      startHold();
    });
    window.addEventListener('pointerup', () => { if (holding && !tapMode) finishHold(); });
    window.addEventListener('blur', finishHold);
    gsap.ticker.add(() => {
      if (!moved) return;
      cx += (px - cx) * 0.18; cy += (py - cy) * 0.18;
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    });
  }
  // touch: tap the play button to start, tap anywhere to stop
  $('#holdMobile').addEventListener('click', () => {
    if (holding) return finishHold();
    tapMode = true;
    startHold();
    setTimeout(() => document.addEventListener('pointerdown', globalStop, true), 0);
  });
  // camera follows the mouse everywhere
  window.addEventListener('pointermove', (e) => {
    Scene.setMouse((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
  }, { passive: true });

  // ---------------------------------------------------------------- interactive dot grids
  function initDots(canvas) {
    const area = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const GAP = 30;
    let w = 0, h = 0, visible = false, last = 0;
    const sq = [];
    function size() {
      const r = area.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    window.addEventListener('resize', size);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) size(); }).observe(area);
    const spawn = (gx, gy, life = 0.9 + Math.random() * 0.5) => sq.push({ x: gx * GAP + GAP / 2, y: gy * GAP + GAP / 2, t: 0, life });
    window.addEventListener('pointermove', (e) => {
      if (!visible || html.classList.contains('is-holding')) return;
      const r = area.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > w || y > h) return;
      const now = performance.now();
      if (now - last < 40) return;
      last = now;
      const gx = Math.floor(x / GAP), gy = Math.floor(y / GAP);
      spawn(gx, gy);
      if (Math.random() < 0.55) spawn(gx + ((Math.random() * 3) | 0) - 1, gy + ((Math.random() * 3) | 0) - 1);
    }, { passive: true });
    gsap.ticker.add((time, dt) => {
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      for (let x = GAP / 2; x < w; x += GAP) for (let y = GAP / 2; y < h; y += GAP) ctx.fillRect(x - 0.75, y - 0.75, 1.5, 1.5);
      if (!REDUCE && Math.random() < 0.012) spawn((Math.random() * w / GAP) | 0, (Math.random() * h / GAP) | 0, 1.6);
      for (let i = sq.length - 1; i >= 0; i--) {
        const s = sq[i];
        s.t += dt / 1000;
        const k = s.t / s.life;
        if (k >= 1) { sq.splice(i, 1); continue; }
        const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
        const z = 10 * (k < 0.15 ? 0.6 + k * 2.6 : 1);
        ctx.fillStyle = `rgba(255,72,139,${a.toFixed(3)})`;
        ctx.beginPath();
        ctx.roundRect ? ctx.roundRect(s.x - z / 2, s.y - z / 2, z, z, 2) : ctx.rect(s.x - z / 2, s.y - z / 2, z, z);
        ctx.fill();
      }
    });
  }
  $$('canvas.dots').forEach(initDots);

  // ---------------------------------------------------------------- segmented controls
  function initSeg(seg, onChange) {
    const ind = $('.seg-ind', seg);
    const btns = $$('.seg-btn', seg);
    const place = () => { const a = btns.find((b) => b.classList.contains('is-active')); ind.style.left = a.offsetLeft + 'px'; ind.style.width = a.offsetWidth + 'px'; };
    btns.forEach((b) => b.addEventListener('click', () => {
      if (b.classList.contains('is-active')) return;
      btns.forEach((x) => x.classList.toggle('is-active', x === b));
      place();
      onChange(b.dataset.tab);
    }));
    place();
    window.addEventListener('resize', place);
    return place;
  }
  const segPlacers = [];

  // ---------------------------------------------------------------- why section
  const whyItems = $$('.why-list li');
  const whyCards = $$('.why-card');
  const setWhy = (i) => whyItems.forEach((li) => li.classList.toggle('is-active', +li.dataset.i === i));
  const whyIO = new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && setWhy(+e.target.dataset.i)),
    { rootMargin: '-45% 0px -45% 0px' });
  whyCards.forEach((c) => whyIO.observe(c));
  whyItems.forEach((li) => li.addEventListener('click', () => scrollToTarget(whyCards[+li.dataset.i], -window.innerHeight * 0.25)));

  // bars
  function animateBars(set) {
    $$('.bar', set).forEach((bar, i) => {
      const fill = $('.bar-t i', bar), b = $('b', bar);
      const w = parseFloat(fill.dataset.w) || 0;
      gsap.fromTo(fill, { scaleX: 0 }, { scaleX: w, duration: 1.4, ease: 'expo.out', delay: i * 0.08 });
      const o = { v: 0 };
      gsap.to(o, { v: +b.dataset.n, duration: 1.4, ease: 'expo.out', delay: i * 0.08, onUpdate: () => (b.textContent = Math.round(o.v) + (b.dataset.s || '')) });
    });
  }
  const barsVis = $('.vis-bars');
  segPlacers.push(initSeg($('[data-seg]', barsVis), (tab) => {
    $$('.bars', barsVis).forEach((s) => (s.hidden = s.dataset.set !== tab));
    animateBars($(`.bars[data-set="${tab}"]`, barsVis));
  }));

  // JSON typing
  const JSON_TOKENS = [
    ['', '{\n  '], ['k', '"payer"'], ['', ': '], ['s', '"Anthem"'], ['', ',\n  '],
    ['k', '"patient"'], ['', ': '], ['s', '"J. D****"'], ['', ',\n  '],
    ['k', '"auth_status"'], ['', ': '], ['s', '"APPROVED"'], ['', ',\n  '],
    ['k', '"cpt_codes"'], ['', ': ['], ['s', '"66984"'], ['', ', '], ['s', '"66982"'], ['', '],\n  '],
    ['k', '"valid_through"'], ['', ': '], ['s', '"2026-12-31"'], ['', ',\n  '],
    ['k', '"source"'], ['', ': '], ['s', '"textract+gpt-4o"'], ['', ',\n  '],
    ['k', '"confidence"'], ['', ': '], ['n', '0.97'], ['', '\n}'],
  ];
  const JSON_LEN = JSON_TOKENS.reduce((n, [, t]) => n + t.length, 0);
  function jsonHTML(n) {
    let out = '', left = n;
    for (const [cls, t] of JSON_TOKENS) {
      if (left <= 0) break;
      const part = esc(t.slice(0, left));
      out += cls ? `<span class="${cls}">${part}</span>` : part;
      left -= t.length;
    }
    return out + '<span class="caret"></span>';
  }
  const jsonEl = $('[data-json]');
  let jsonRun = 0;
  async function runJson(id) {
    while (jsonRun === id) {
      for (let i = 0; i <= JSON_LEN && jsonRun === id; i += 2) { jsonEl.innerHTML = jsonHTML(i); await sleep(22); }
      await sleep(2600);
    }
  }

  // terminal
  const termEl = $('[data-term]');
  const TERM = [
    ['$ rcc run --task "Payment Posting"', 'cmd'],
    ['✓ Environment ready · python 3.12 · robocorp', 'ok'],
    ['✓ 9 banking portals queued as work items', 'ok'],
    ['✓ Redis lock acquired  portal:waystar  ttl=300s', 'ok'],
    ['Batch 1/3', 'bar'], ['Batch 2/3', 'bar'], ['Batch 3/3', 'bar'],
    ['✓ 835 EDI parsed · payments matched to encounters', 'ok'],
    ['✓ Posted to NextGen  strategy=quick_post', 'ok'],
    ['✓ Lock released · run complete', 'ok'],
  ];
  let termRun = 0;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function runTerm(id) {
    while (termRun === id) {
      termEl.innerHTML = '';
      for (const [text, kind] of TERM) {
        if (termRun !== id) return;
        const line = document.createElement('div');
        if (kind === 'bar') {
          line.innerHTML = `${esc(text)}  <span class="pb"><i></i></span>  <span class="pct">0%</span>`;
          termEl.appendChild(line);
          const fill = $('i', line), pct = $('.pct', line), o = { v: 0 };
          await new Promise((res) => gsap.to(o, { v: 100, duration: 1.1, ease: 'power1.inOut', onUpdate: () => { fill.style.width = o.v + '%'; pct.textContent = Math.round(o.v) + '%'; }, onComplete: res }));
        } else {
          line.innerHTML = kind === 'ok' ? `<span class="ok">✓</span>${esc(text.slice(1))}` : `<span class="dim">${esc(text)}</span>`;
          termEl.appendChild(line);
          await sleep(kind === 'cmd' ? 650 : 380);
        }
      }
      await sleep(3200);
    }
  }

  // run card visuals while visible
  const visIO = new IntersectionObserver((entries) => entries.forEach((e) => {
    const i = +e.target.dataset.i;
    if (e.isIntersecting) {
      if (i === 0) animateBars($('.bars:not([hidden])', barsVis));
      if (i === 1) runJson(++jsonRun);
      if (i === 2) runTerm(++termRun);
    } else {
      if (i === 1) jsonRun++;
      if (i === 2) termRun++;
    }
  }), { threshold: 0.3 });
  whyCards.forEach((c) => visIO.observe(c));

  // ---------------------------------------------------------------- projects (tabs + modal)
  segPlacers.push(initSeg($('#projects [data-seg]'), (tab) => {
    $$('#projects .proj-grid').forEach((g) => (g.hidden = g.dataset.panel !== tab));
    gsap.fromTo($$(`#projects .proj-grid[data-panel="${tab}"] .proj`), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out', stagger: 0.06 });
  }));
  const modal = $('#modal'), modalBody = $('#modalBody');
  modal.setAttribute('data-lenis-prevent', '');
  function openProject(id) {
    if (!Object.prototype.hasOwnProperty.call(byId, id)) return;
    const p = byId[id];
    modalBody.innerHTML = `
      <p class="label">${p.tab === 'ai' ? 'AI agents &amp; automation' : 'Full stack'}</p>
      <h2>${esc(p.title)}</h2>
      <p class="client">${esc(p.client)}</p>
      <div class="chips">${p.stack.map((s) => `<span class="chip">${esc(s)}</span>`).join('')}</div>
      <ul>${p.points.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
    modal.showModal();
    stopScroll();
  }
  document.addEventListener('click', (e) => {
    const card = e.target.closest('[data-project]');
    if (card) openProject(card.dataset.project);
  });
  modal.addEventListener('click', (e) => { if (e.target === modal || e.target.closest('[data-close]')) modal.close(); });
  modal.addEventListener('close', startScroll);

  // ---------------------------------------------------------------- carousel
  const car = $('#car');
  $$('.car-btn').forEach((b) => b.addEventListener('click', () => {
    const card = $('.ind', car);
    car.scrollBy({ left: +b.dataset.dir * (card.offsetWidth + 10) * (window.innerWidth > 900 ? 2 : 1), behavior: 'smooth' });
  }));

  // ---------------------------------------------------------------- skills accordion
  $$('.skill-btn').forEach((btn) => btn.addEventListener('click', () => {
    const item = btn.parentElement, panel = btn.nextElementSibling;
    const open = !item.classList.contains('is-open');
    item.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', open);
    gsap.to(panel, { height: open ? 'auto' : 0, duration: 0.55, ease: 'expo.out' });
    if (open) gsap.fromTo($$('.chip', panel), { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'expo.out', stagger: 0.02 });
  }));

  bindScramble();

  // ---------------------------------------------------------------- boot
  const minWait = new Promise((r) => setTimeout(r, REDUCE ? 0 : 1100));
  const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();
  const scene = Promise.race([Scene.init().catch(() => false), new Promise((r) => setTimeout(r, 5000))]);
  Promise.all([minWait, fonts, scene]).then(() => {
    window.scrollTo(0, 0);
    segPlacers.forEach((p) => p());
    html.classList.remove('is-loading');
    onScroll();
    setTimeout(() => {
      html.classList.remove('is-booting');
      reveal($('.hero-title'));
      splits.forEach((el) => splitIO.observe(el));
    }, REDUCE ? 0 : 350);
  });
})();
