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
  root.style.setProperty('--hero-p', heroProgress.toFixed(4));
  root.style.setProperty('--system-p', systemProgress.toFixed(4));
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
document.querySelectorAll('.reveal-card').forEach((card) => observer.observe(card));

const watchButton = document.getElementById('watchSequence');
watchButton.addEventListener('click', () => {
  const start = window.scrollY;
  const end = hero.offsetTop + hero.offsetHeight - window.innerHeight;
  const duration = reducedMotion ? 20 : 5200;
  const began = performance.now();
  function autoScroll(now) {
    const progress = clamp((now - began) / duration);
    const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    window.scrollTo(0, start + (end - start) * eased);
    if (progress < 1) window.requestAnimationFrame(autoScroll);
  }
  window.requestAnimationFrame(autoScroll);
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
