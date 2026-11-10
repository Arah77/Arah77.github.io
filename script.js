// The page is a single day: scrolling moves the sun and warms the whole sky.
const root = document.documentElement;
const dayLabel = document.querySelector('#day-label');
const themeColor = document.querySelector('meta[name="theme-color"]');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const stops = [
  { at: 0, paper: [250, 243, 229], sun: [239, 186, 85], core: [255, 245, 184], halo: [241, 199, 123] },
  { at: .35, paper: [239, 209, 168], sun: [239, 158, 67], core: [255, 220, 132], halo: [240, 163, 90] },
  { at: .62, paper: [199, 126, 86], sun: [229, 106, 55], core: [255, 173, 88], halo: [219, 113, 66] },
  { at: .82, paper: [111, 61, 50], sun: [213, 82, 43], core: [244, 130, 69], halo: [197, 88, 55] },
  { at: 1, paper: [47, 32, 36], sun: [190, 67, 42], core: [233, 106, 60], halo: [147, 64, 49] }
];
const mix = (a, b, t) => a.map((channel, i) => channel + (b[i] - channel) * t);
const rgb = color => `rgb(${color.map(Math.round).join(', ')})`;
function luminance(color) {
  const linear = color.map(channel => { const v = channel / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
function contrast(a, b) {
  const first = luminance(a), second = luminance(b);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
function readable(candidate, surface, fallback, minimum = 4.5) {
  for (let step = 0; step <= 20; step++) {
    const color = mix(candidate, fallback, step / 20);
    if (contrast(color, surface) >= minimum) return color;
  }
  return fallback;
}
let scheduled = false;
let lastLabel = '';
function updateDay() {
  scheduled = false;
  const distance = Math.max(0, root.scrollHeight - innerHeight);
  const progress = distance ? Math.max(0, Math.min(1, scrollY / distance)) : 0;
  let index = 1;
  while (index < stops.length - 1 && progress > stops[index].at) index++;
  const start = stops[index - 1], end = stops[index];
  const amount = (progress - start.at) / (end.at - start.at);
  const paper = mix(start.paper, end.paper, amount);
  const black = [6, 4, 3], white = [255, 252, 245];
  const dark = contrast(black, paper) >= contrast(white, paper);
  const fallback = dark ? black : [255, 255, 255];
  const ink = readable(dark ? [56, 43, 36] : [255, 242, 223], paper, fallback, 7);
  const muted = readable(dark ? [113, 96, 82] : [228, 200, 181], paper, fallback);
  const accent = readable(dark ? [150, 68, 42] : [255, 204, 149], paper, fallback);
  const panel = mix(paper, dark ? [90, 46, 20] : [255, 231, 199], .06);
  root.style.setProperty('--day-progress', progress.toFixed(5));
  // Clear the complete sun layer, including ray tips and glow, before the page ends.
  root.style.setProperty('--sun-opacity', Math.max(0, Math.min(1, (0.98 - progress) / .08)).toFixed(4));
  root.style.setProperty('--sun-visibility', progress >= .98 ? 'hidden' : 'visible');
  root.style.setProperty('--paper', rgb(paper));
  root.style.setProperty('--ink', rgb(ink));
  root.style.setProperty('--muted', rgb(muted));
  root.style.setProperty('--accent', rgb(accent));
  root.style.setProperty('--line', rgb(mix(paper, ink, .22)));
  root.style.setProperty('--panel', rgb(panel));
  root.style.setProperty('--sun-edge', rgb(mix(start.sun, end.sun, amount)));
  root.style.setProperty('--sun-core', rgb(mix(start.core, end.core, amount)));
  root.style.setProperty('--sun-halo', rgb(mix(start.halo, end.halo, amount)));
  const label = progress < .28 ? 'MIDDAY' : progress < .68 ? 'AFTERNOON' : progress < .94 ? 'GOLDEN HOUR' : 'DUSK';
  if (label !== lastLabel) { dayLabel.textContent = label; lastLabel = label; }
  themeColor.content = rgb(paper);
}
function scheduleDay() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(updateDay); }
}
window.addEventListener('scroll', scheduleDay, { passive: true });
window.addEventListener('resize', scheduleDay);
window.addEventListener('pageshow', scheduleDay);
reducedMotion.addEventListener('change', scheduleDay);
// Expanding a project changes the page length, so keep sunset at the end.
new ResizeObserver(scheduleDay).observe(document.body);
updateDay();

// A single silhouette with connected limbs, following a continuous run cycle.
const runnerArt = document.querySelector('.runner-art');
const runnerBody = runnerArt.querySelector('.runner-body');
const runnerLegs = [runnerArt.querySelector('.runner-leg-front'), runnerArt.querySelector('.runner-leg-back')];
const runnerArms = [runnerArt.querySelector('.runner-arm-front'), runnerArt.querySelector('.runner-arm-back')];
const hoverPointer = window.matchMedia('(hover: hover) and (pointer: fine)');
const legPoses = [[32, 12], [8, 24], [-24, 28], [-42, 66], [-15, 112], [29, 111], [49, 73], [43, 34]];
const radians = degrees => degrees * Math.PI / 180;
const joint = (point, length, angle) => [point[0] + Math.sin(radians(angle)) * length, point[1] + Math.cos(radians(angle)) * length];
const pointText = point => point.map(value => value.toFixed(2)).join(' ');
// Small curves around elbows, knees, and ankles keep the silhouette continuous.
function limbPath(points) {
  let path = `M${pointText(points[0])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const previous = points[i - 1], corner = points[i], next = points[i + 1];
    const incoming = Math.hypot(corner[0] - previous[0], corner[1] - previous[1]);
    const outgoing = Math.hypot(next[0] - corner[0], next[1] - corner[1]);
    const radius = Math.min(5, incoming * .25, outgoing * .25);
    const before = [corner[0] + (previous[0] - corner[0]) * radius / incoming, corner[1] + (previous[1] - corner[1]) * radius / incoming];
    const after = [corner[0] + (next[0] - corner[0]) * radius / outgoing, corner[1] + (next[1] - corner[1]) * radius / outgoing];
    path += ` L${pointText(before)} Q${pointText(corner)} ${pointText(after)}`;
  }
  return path + ` L${pointText(points.at(-1))}`;
}
// Periodic cubic interpolation keeps speed continuous through the entire cycle.
function stridePose(phase) {
  const position = (phase % 1) * legPoses.length;
  const index = Math.floor(position), t = position - index;
  const sample = offset => legPoses[(index + offset + legPoses.length) % legPoses.length];
  return [0, 1].map(axis => {
    const a = sample(-1)[axis], b = sample(0)[axis], c = sample(1)[axis], d = sample(2)[axis];
    return .5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t);
  });
}
function drawRunner(phase, moving) {
  runnerBody.setAttribute('transform', `translate(0 ${moving ? (-2 * (1 - Math.cos(phase * Math.PI * 4))).toFixed(2) : 0})`);
  runnerLegs.forEach((leg, side) => {
    const step = (phase + side * .5) % 1;
    const [thigh, bend] = stridePose(step);
    const hip = [80, 108], knee = joint(hip, 31, thigh), ankle = joint(knee, 32, thigh - bend);
    const toeAngle = -20 * Math.sin(step * Math.PI * 2);
    const toe = [ankle[0] + 10 * Math.cos(radians(toeAngle)), ankle[1] + 10 * Math.sin(radians(toeAngle))];
    leg.setAttribute('d', limbPath([hip, knee, ankle, toe]));
    const swing = -50 * Math.cos(step * Math.PI * 2);
    const shoulder = [96, 68], elbow = joint(shoulder, 28, swing);
    const wrist = joint(elbow, 25, swing + 98 + 9 * Math.sin(step * Math.PI * 2));
    runnerArms[side].setAttribute('d', limbPath([shoulder, elbow, wrist]));
  });
}
let runnerFrame = null;
function stopRunner() {
  if (runnerFrame !== null) cancelAnimationFrame(runnerFrame);
  runnerFrame = null;
  runnerArt.dataset.running = 'false';
  drawRunner(.36, false);
}
function startRunner() {
  if (runnerFrame !== null || reducedMotion.matches || !hoverPointer.matches) return;
  const start = performance.now();
  runnerArt.dataset.running = 'true';
  function tick(now) {
    drawRunner((.36 + (now - start) / 780) % 1, true);
    runnerFrame = requestAnimationFrame(tick);
  }
  runnerFrame = requestAnimationFrame(tick);
}
runnerArt.addEventListener('pointerenter', startRunner);
runnerArt.addEventListener('pointerleave', stopRunner);
reducedMotion.addEventListener('change', () => {
  stopRunner();
  if (runnerArt.matches(':hover')) startRunner();
});
hoverPointer.addEventListener('change', stopRunner);
stopRunner();
