const root = document.documentElement;
document.body.classList.add('loading');

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = (from, to, amount) => from + (to - from) * amount;
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loaderValue = document.getElementById('loaderValue');
const loaderBar = document.getElementById('loaderBar');
let loadProgress = 0;
const loaderTimer = window.setInterval(() => {
  loadProgress = Math.min(100, loadProgress + Math.ceil(Math.random() * 7));
  loaderValue.textContent = String(loadProgress).padStart(2, '0');
  loaderBar.style.width = `${loadProgress}%`;
  if (loadProgress >= 100) {
    window.clearInterval(loaderTimer);
    window.setTimeout(() => {
      document.body.classList.remove('loading');
      document.body.classList.add('loaded');
    }, 260);
  }
}, reducedMotion ? 12 : 60);

const canvas = document.getElementById('starfield');
const context = canvas.getContext('2d');
let stars = [];
let width = 0;
let height = 0;
let deviceScale = Math.min(window.devicePixelRatio || 1, 2);

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = Math.round(width * deviceScale);
  canvas.height = Math.round(height * deviceScale);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  const count = Math.round((width * height) / 9500);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: Math.random() * 1.15 + 0.15,
    a: Math.random() * 0.55 + 0.15,
    s: Math.random() * 0.003 + 0.001,
  }));
}

let mouseTargetX = 0;
let mouseTargetY = 0;
let mouseX = 0;
let mouseY = 0;
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;
const cursor = document.querySelector('.cursor');

window.addEventListener('pointermove', (event) => {
  mouseTargetX = (event.clientX / window.innerWidth - 0.5) * 2;
  mouseTargetY = (event.clientY / window.innerHeight - 0.5) * 2;
  cursorX = event.clientX;
  cursorY = event.clientY;
});

document.querySelectorAll('a, button').forEach((element) => {
  element.addEventListener('mouseenter', () => cursor.classList.add('is-link'));
  element.addEventListener('mouseleave', () => cursor.classList.remove('is-link'));
});

let scrollCurrent = window.scrollY;
let scrollSmoothed = window.scrollY;
const hero = document.querySelector('.hero');
const heroCopy = document.querySelector('.hero__copy');
const system = document.querySelector('.system');
const chapters = [...document.querySelectorAll('.chapter-rail span')];

function sectionProgress(section, scrollY) {
  const start = section.offsetTop;
  const distance = Math.max(1, section.offsetHeight - window.innerHeight);
  return clamp((scrollY - start) / distance);
}

function drawStars(time, heroProgress) {
  context.clearRect(0, 0, width, height);
  for (const star of stars) {
    const twinkle = Math.sin(time * star.s + star.x) * 0.16;
    context.beginPath();
    context.fillStyle = `rgba(137, 198, 227, ${star.a + twinkle - heroProgress * 0.18})`;
    context.arc(star.x - mouseX * star.r * 2, star.y - mouseY * star.r * 2, star.r, 0, Math.PI * 2);
    context.fill();
  }
}

function animate(time = 0) {
  scrollCurrent = window.scrollY;
  scrollSmoothed = reducedMotion ? scrollCurrent : lerp(scrollSmoothed, scrollCurrent, 0.085);
  mouseX = lerp(mouseX, mouseTargetX, 0.045);
  mouseY = lerp(mouseY, mouseTargetY, 0.045);
  const heroProgress = sectionProgress(hero, scrollSmoothed);
  const systemProgress = sectionProgress(system, scrollSmoothed);
  const pageProgress = clamp(scrollSmoothed / Math.max(1, document.documentElement.scrollHeight - window.innerHeight));
  root.style.setProperty('--hero-p', heroProgress.toFixed(4));
  root.style.setProperty('--system-p', systemProgress.toFixed(4));
  root.style.setProperty('--page-p', pageProgress.toFixed(4));
  document.body.classList.toggle('is-scrolled', scrollSmoothed > 48);
  heroCopy.toggleAttribute('inert', heroProgress > 0.32);
  root.style.setProperty('--mouse-x', `${(mouseX * 9).toFixed(2)}px`);
  root.style.setProperty('--mouse-y', `${(mouseY * 5).toFixed(2)}px`);
  if (cursor) cursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0)`;
  const activeChapter = heroProgress < 0.3 ? 0 : heroProgress < 0.72 ? 1 : 2;
  chapters.forEach((chapter, index) => chapter.classList.toggle('active', index === activeChapter));
  drawStars(time, heroProgress);
  window.requestAnimationFrame(animate);
}

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.18 });
document.querySelectorAll('.reveal-card, .reveal-section').forEach((element) => observer.observe(element));

const watchButton = document.getElementById('watchSequence');
const sequenceStatus = document.getElementById('sequenceStatus');
let sequenceActive = false;
let sequenceFrame = 0;

function stopSequence(message = 'Sequence paused.') {
  if (!sequenceActive) return;
  sequenceActive = false;
  window.cancelAnimationFrame(sequenceFrame);
  watchButton.innerHTML = 'Watch sequence <i aria-hidden="true">▶</i>';
  watchButton.setAttribute('aria-pressed', 'false');
  sequenceStatus.textContent = message;
}

watchButton.addEventListener('click', () => {
  if (sequenceActive) {
    stopSequence();
    return;
  }
  const start = window.scrollY;
  const end = hero.offsetTop + hero.offsetHeight - window.innerHeight;
  const duration = reducedMotion ? 20 : 8000;
  const began = performance.now();
  sequenceActive = true;
  watchButton.innerHTML = 'Pause sequence <i aria-hidden="true">Ⅱ</i>';
  watchButton.setAttribute('aria-pressed', 'true');
  sequenceStatus.textContent = 'Analysis sequence playing. Select again or press Escape to pause.';
  function autoScroll(now) {
    if (!sequenceActive) return;
    const progress = clamp((now - began) / duration);
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    window.scrollTo(0, start + (end - start) * eased);
    if (progress < 1) {
      sequenceFrame = window.requestAnimationFrame(autoScroll);
    } else {
      sequenceActive = false;
      watchButton.innerHTML = 'Replay sequence <i aria-hidden="true">↻</i>';
      watchButton.setAttribute('aria-pressed', 'false');
      sequenceStatus.textContent = 'Analysis sequence complete.';
    }
  }
  sequenceFrame = window.requestAnimationFrame(autoScroll);
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') stopSequence();
});
window.addEventListener('wheel', () => stopSequence('Sequence paused by manual scrolling.'), { passive: true });
window.addEventListener('touchstart', () => stopSequence('Sequence paused by manual scrolling.'), { passive: true });

const missionViews = {
  overview: {
    labels: ['WADI RUM', 'ATACAMA'], values: ['97% MATCH', '92% MATCH'], caption: 'SURFACE ANALYSIS', coordinates: '24.7136° N / 46.6753° E',
    metricLabels: ['MISSION CONFIDENCE', 'TERRAIN SIMILARITY'], metricValues: ['94.8', '97.2'], chart: 'ENVIRONMENTAL PROFILE'
  },
  sites: {
    labels: ['WADI RUM', 'DHOFAR'], values: ['97.4% PRIMARY', '89.1% ALT'], caption: 'CANDIDATE COMPARISON', coordinates: '30.3285° N / 35.4444° E',
    metricLabels: ['SITE CONFIDENCE', 'GEOLOGICAL MATCH'], metricValues: ['97.4', '95.6'], chart: 'ACCESS & LOGISTICS'
  },
  environment: {
    labels: ['THERMAL ZONE', 'WIND CORRIDOR'], values: ['NOMINAL', 'LOW RISK'], caption: 'ENVIRONMENT MODEL', coordinates: '-03°C / 18 KM·H',
    metricLabels: ['CLIMATE STABILITY', 'ATMOSPHERIC MATCH'], metricValues: ['91.6', '94.8'], chart: '30-DAY VARIANCE'
  },
  plan: {
    labels: ['BASE CAMP', 'EVA ROUTE'], values: ['SOL 01', '12.4 KM'], caption: 'MISSION SEQUENCE', coordinates: '14 SOLS / CREW 06',
    metricLabels: ['PLAN READINESS', 'RESOURCE COVERAGE'], metricValues: ['88.4', '93.1'], chart: 'OPERATIONAL LOAD'
  }
};

const viewElements = {
  labelOne: document.getElementById('mapLabelOne'), valueOne: document.getElementById('mapValueOne'),
  labelTwo: document.getElementById('mapLabelTwo'), valueTwo: document.getElementById('mapValueTwo'),
  caption: document.getElementById('mapCaption'), coordinates: document.getElementById('mapCoordinates'),
  metricLabelOne: document.getElementById('metricLabelOne'), metricLabelTwo: document.getElementById('metricLabelTwo'),
  metricValueOne: document.getElementById('metricValueOne'), metricValueTwo: document.getElementById('metricValueTwo'),
  metricBarOne: document.getElementById('metricBarOne'), metricBarTwo: document.getElementById('metricBarTwo'), chart: document.getElementById('chartLabel')
};

function setMissionView(name, focusTab = false) {
  const view = missionViews[name];
  if (!view) return;
  viewElements.labelOne.firstChild.nodeValue = view.labels[0];
  viewElements.valueOne.textContent = view.values[0];
  viewElements.labelTwo.firstChild.nodeValue = view.labels[1];
  viewElements.valueTwo.textContent = view.values[1];
  viewElements.caption.textContent = view.caption;
  viewElements.coordinates.textContent = view.coordinates;
  viewElements.metricLabelOne.textContent = view.metricLabels[0];
  viewElements.metricLabelTwo.textContent = view.metricLabels[1];
  viewElements.metricValueOne.textContent = view.metricValues[0];
  viewElements.metricValueTwo.textContent = view.metricValues[1];
  viewElements.metricBarOne.style.setProperty('--value', `${view.metricValues[0]}%`);
  viewElements.metricBarTwo.style.setProperty('--value', `${view.metricValues[1]}%`);
  viewElements.chart.textContent = view.chart;
  document.querySelectorAll('.side-item').forEach((tab) => {
    const active = tab.dataset.view === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focusTab) tab.focus();
  });
}

const plannerTabs = [...document.querySelectorAll('.side-item')];
plannerTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => setMissionView(tab.dataset.view));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    const direction = event.key === 'ArrowDown' ? 1 : -1;
    const next = plannerTabs[(index + direction + plannerTabs.length) % plannerTabs.length];
    setMissionView(next.dataset.view, true);
  });
});

const missionDialog = document.getElementById('missionDialog');
const missionForm = document.getElementById('missionForm');
const missionResult = document.getElementById('missionResult');
const closeMissionDialog = document.getElementById('closeMissionDialog');
const openMissionButtons = document.querySelectorAll('[data-open-mission]');
let missionTrigger = null;

function openMissionDialog(event) {
  missionTrigger = event.currentTarget;
  missionResult.hidden = true;
  missionForm.hidden = false;
  missionDialog.showModal();
  missionForm.querySelector('select').focus();
}

function closeDialog() {
  missionDialog.close();
  missionTrigger?.focus();
}

openMissionButtons.forEach((button) => button.addEventListener('click', openMissionDialog));
closeMissionDialog.addEventListener('click', closeDialog);
missionDialog.addEventListener('click', (event) => {
  if (event.target === missionDialog) closeDialog();
});
missionDialog.addEventListener('close', () => missionTrigger?.focus());

const analogResults = {
  mars: { site: 'Wadi Rum, Jordan', reason: 'Basaltic terrain, arid operations and long-range mobility corridors', match: 97, readiness: 92 },
  moon: { site: 'McMurdo Dry Valleys, Antarctica', reason: 'Extreme isolation, low moisture and polar logistics constraints', match: 94, readiness: 87 },
  europa: { site: 'Vatnajökull, Iceland', reason: 'Glacial access, ice-field science and sub-surface sampling conditions', match: 91, readiness: 84 }
};

missionForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(missionForm);
  const result = analogResults[formData.get('target')];
  document.getElementById('resultSite').textContent = result.site;
  document.getElementById('resultReason').textContent = result.reason;
  document.getElementById('resultMatch').textContent = `${result.match}%`;
  document.getElementById('resultReadiness').textContent = `${result.readiness}%`;
  document.getElementById('resultWindow').textContent = `${formData.get('duration')} SOLS`;
  missionForm.hidden = true;
  missionResult.hidden = false;
  missionResult.querySelector('button').focus();
});

document.getElementById('editMission').addEventListener('click', () => {
  missionResult.hidden = true;
  missionForm.hidden = false;
  missionForm.querySelector('select').focus();
});

document.getElementById('exploreResult').addEventListener('click', () => {
  setMissionView('plan');
  missionTrigger = null;
  missionDialog.close();
  const controlTarget = system.offsetTop + (system.offsetHeight - window.innerHeight) * 0.78;
  window.setTimeout(() => window.scrollTo({ top: controlTarget, behavior: reducedMotion ? 'auto' : 'smooth' }), 120);
});

const missionClock = document.getElementById('missionClock');
const launchedAt = Date.now();
window.setInterval(() => {
  const elapsed = Math.floor((Date.now() - launchedAt) / 1000);
  const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');
  missionClock.textContent = `${hours}:${minutes}:${seconds}`;
}, 1000);

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
window.requestAnimationFrame(animate);
