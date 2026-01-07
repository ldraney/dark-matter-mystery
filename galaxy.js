import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene setup
const container = document.getElementById('galaxy-view');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Galaxy parameters based on real data (NGC 3198-like)
const GALAXY_RADIUS = 30;
const CORE_RADIUS = 3;
const BULGE_RADIUS = 6;
const STAR_COUNT = 12000;
const BULGE_STAR_COUNT = 8000;

// Track which rotation model we're using
let useObservedRotation = true;

// Rotation curve functions based on real physics
function keplerianVelocity(r) {
  if (r < CORE_RADIUS) return r / CORE_RADIUS;
  return Math.sqrt(CORE_RADIUS / r);
}

function observedVelocity(r) {
  if (r < CORE_RADIUS) return r / CORE_RADIUS;
  return 0.85 + 0.15 * Math.exp(-r / 20);
}

// === GALACTIC CENTER ===

// Black hole at the very center (dark sphere)
const blackHoleGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const blackHoleMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
const blackHole = new THREE.Mesh(blackHoleGeometry, blackHoleMaterial);
scene.add(blackHole);

// Accretion disk glow around black hole
const accretionGeometry = new THREE.RingGeometry(0.6, 1.5, 64);
const accretionMaterial = new THREE.MeshBasicMaterial({
  color: 0xffaa44,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.8
});
const accretionDisk = new THREE.Mesh(accretionGeometry, accretionMaterial);
accretionDisk.rotation.x = Math.PI / 2;
scene.add(accretionDisk);

// Inner accretion ring (hotter, whiter)
const innerAccretionGeometry = new THREE.RingGeometry(0.55, 0.8, 64);
const innerAccretionMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffcc,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.9
});
const innerAccretionDisk = new THREE.Mesh(innerAccretionGeometry, innerAccretionMaterial);
innerAccretionDisk.rotation.x = Math.PI / 2;
scene.add(innerAccretionDisk);

// Intense point light at center
const coreLight = new THREE.PointLight(0xffeecc, 3, 60);
scene.add(coreLight);

// Secondary warm glow
const coreGlow = new THREE.PointLight(0xffaa66, 1.5, 30);
coreGlow.position.set(0, 0.5, 0);
scene.add(coreGlow);

// === BULGE STARS (dense center cluster) ===
const bulgeGeometry = new THREE.BufferGeometry();
const bulgePositions = new Float32Array(BULGE_STAR_COUNT * 3);
const bulgeColors = new Float32Array(BULGE_STAR_COUNT * 3);
const bulgeSizes = new Float32Array(BULGE_STAR_COUNT);
const bulgeData = [];

for (let i = 0; i < BULGE_STAR_COUNT; i++) {
  // Spherical distribution concentrated at center
  const r = Math.pow(Math.random(), 2) * BULGE_RADIUS;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  // Flatten slightly (ellipsoid bulge)
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi) * 0.6; // flattened
  const z = r * Math.sin(phi) * Math.sin(theta);

  bulgePositions[i * 3] = x;
  bulgePositions[i * 3 + 1] = y;
  bulgePositions[i * 3 + 2] = z;

  // Bulge stars are older = yellower/redder
  const age = Math.random();
  bulgeColors[i * 3] = 1.0;
  bulgeColors[i * 3 + 1] = 0.8 - age * 0.3;
  bulgeColors[i * 3 + 2] = 0.5 - age * 0.3;

  // Vary sizes - brighter stars closer to center
  bulgeSizes[i] = 0.1 + (1 - r / BULGE_RADIUS) * 0.15;

  // Orbital data for bulge stars
  const actualR = Math.sqrt(x * x + z * z) || 0.1;
  bulgeData.push({
    radius: actualR,
    angle: Math.atan2(z, x),
    angularVelocity: observedVelocity(actualR) / actualR * 0.025,
    keplerianAngularVelocity: keplerianVelocity(actualR) / actualR * 0.025,
    y: y
  });
}

bulgeGeometry.setAttribute('position', new THREE.BufferAttribute(bulgePositions, 3));
bulgeGeometry.setAttribute('color', new THREE.BufferAttribute(bulgeColors, 3));
bulgeGeometry.setAttribute('size', new THREE.BufferAttribute(bulgeSizes, 1));

const bulgeMaterial = new THREE.PointsMaterial({
  size: 0.12,
  vertexColors: true,
  transparent: true,
  opacity: 0.95,
  sizeAttenuation: true
});

const bulgeStars = new THREE.Points(bulgeGeometry, bulgeMaterial);
scene.add(bulgeStars);

// === DISK STARS (spiral arms) ===
const starGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(STAR_COUNT * 3);
const colors = new Float32Array(STAR_COUNT * 3);
const starData = [];

for (let i = 0; i < STAR_COUNT; i++) {
  const arm = Math.floor(Math.random() * 2);
  const armAngle = arm * Math.PI;
  const r = BULGE_RADIUS + Math.pow(Math.random(), 0.6) * (GALAXY_RADIUS - BULGE_RADIUS);
  const spiralAngle = armAngle + (r / GALAXY_RADIUS) * Math.PI * 2.5;
  const scatter = (Math.random() - 0.5) * 0.6;
  const angle = spiralAngle + scatter;
  const height = (Math.random() - 0.5) * 0.3 * Math.exp(-r / 15);

  positions[i * 3] = Math.cos(angle) * r;
  positions[i * 3 + 1] = height;
  positions[i * 3 + 2] = Math.sin(angle) * r;

  // Disk stars are younger = bluer
  const temp = Math.random();
  colors[i * 3] = 0.7 + temp * 0.3;
  colors[i * 3 + 1] = 0.8 + temp * 0.2;
  colors[i * 3 + 2] = 0.9 + temp * 0.1;

  starData.push({
    radius: r,
    angle: angle,
    angularVelocity: observedVelocity(r) / r * 0.02,
    keplerianAngularVelocity: keplerianVelocity(r) / r * 0.02,
    height: height
  });
}

starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const starMaterial = new THREE.PointsMaterial({
  size: 0.15,
  vertexColors: true,
  transparent: true,
  opacity: 0.9
});

const starField = new THREE.Points(starGeometry, starMaterial);
scene.add(starField);

// === BACKGROUND STARS ===
const bgStarGeometry = new THREE.BufferGeometry();
const bgStarCount = 3000;
const bgPositions = new Float32Array(bgStarCount * 3);
for (let i = 0; i < bgStarCount; i++) {
  bgPositions[i * 3] = (Math.random() - 0.5) * 400;
  bgPositions[i * 3 + 1] = (Math.random() - 0.5) * 400;
  bgPositions[i * 3 + 2] = (Math.random() - 0.5) * 400;
}
bgStarGeometry.setAttribute('position', new THREE.BufferAttribute(bgPositions, 3));
const bgStars = new THREE.Points(bgStarGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 }));
scene.add(bgStars);

scene.add(new THREE.AmbientLight(0x111122));

camera.position.set(0, 35, 50);
camera.lookAt(0, 0, 0);

// === TOGGLE FUNCTION ===
window.toggleRotation = function() {
  useObservedRotation = !useObservedRotation;
  const btn = document.getElementById('toggleBtn');
  const hint = document.querySelector('.button-hint');
  const indicator = document.getElementById('modeIndicator');
  const dot = indicator.querySelector('.mode-dot');

  if (useObservedRotation) {
    btn.textContent = 'Show Expected Motion';
    btn.classList.remove('expected');
    hint.innerHTML = 'Click to see what the galaxy SHOULD look like.<br>Watch the outer stars slow down!';
    dot.classList.remove('expected');
    dot.classList.add('observed');
    indicator.querySelector('span').textContent = 'Showing: OBSERVED (the mystery)';
  } else {
    btn.textContent = 'Show Observed Motion';
    btn.classList.add('expected');
    hint.innerHTML = "Now showing EXPECTED motion (Newton's prediction).<br>Click to see ACTUAL observations!";
    dot.classList.remove('observed');
    dot.classList.add('expected');
    indicator.querySelector('span').textContent = 'Showing: EXPECTED (Newton predicts)';
  }
  drawChart();
};

// === DRAW CHART ===
function drawChart() {
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  const width = canvas.width = canvas.clientWidth * 2;
  const height = canvas.height = canvas.clientHeight * 2;
  ctx.scale(2, 2);

  const w = width / 2;
  const h = height / 2;
  const padding = 40;

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, h - padding);
  ctx.lineTo(w - padding, h - padding);
  ctx.stroke();

  ctx.fillStyle = '#888';
  ctx.font = '11px Arial';
  ctx.fillText('Velocity', padding - 35, padding + 20);
  ctx.fillText('Distance from center', w / 2 - 40, h - 10);

  const graphWidth = w - padding * 2;
  const graphHeight = h - padding * 2;

  // Expected curve
  ctx.strokeStyle = useObservedRotation ? '#44ff44' : '#88ff88';
  ctx.lineWidth = useObservedRotation ? 2 : 3;
  ctx.setLineDash(useObservedRotation ? [] : []);
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const r = (i / 100) * GALAXY_RADIUS;
    const v = keplerianVelocity(r);
    const x = padding + (r / GALAXY_RADIUS) * graphWidth;
    const y = h - padding - v * graphHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Observed curve
  ctx.strokeStyle = useObservedRotation ? '#ff4444' : '#ff8888';
  ctx.lineWidth = useObservedRotation ? 3 : 2;
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const r = (i / 100) * GALAXY_RADIUS;
    const v = observedVelocity(r);
    const x = padding + (r / GALAXY_RADIUS) * graphWidth;
    const y = h - padding - v * graphHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Highlight gap
  ctx.fillStyle = 'rgba(255, 100, 100, 0.15)';
  ctx.beginPath();
  for (let i = 0; i <= 100; i++) {
    const r = (i / 100) * GALAXY_RADIUS;
    const x = padding + (r / GALAXY_RADIUS) * graphWidth;
    const y = h - padding - observedVelocity(r) * graphHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  for (let i = 100; i >= 0; i--) {
    const r = (i / 100) * GALAXY_RADIUS;
    const x = padding + (r / GALAXY_RADIUS) * graphWidth;
    const y = h - padding - keplerianVelocity(r) * graphHeight;
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ff6666';
  ctx.font = 'bold 12px Arial';
  ctx.fillText('THE GAP', w - padding - 60, h / 2 - 20);
  ctx.font = '10px Arial';
  ctx.fillStyle = '#aa4444';
  ctx.fillText('Dark matter?', w - padding - 60, h / 2 - 5);

  // Current mode indicator
  ctx.fillStyle = useObservedRotation ? '#ff6666' : '#66ff66';
  ctx.font = 'bold 11px Arial';
  ctx.fillText(useObservedRotation ? 'SHOWING: Observed' : 'SHOWING: Expected', padding, padding - 10);
}

drawChart();

// === ANIMATION ===
function animate() {
  requestAnimationFrame(animate);

  // Rotate accretion disk
  accretionDisk.rotation.z += 0.02;
  innerAccretionDisk.rotation.z -= 0.03;

  // Update disk star positions
  const diskPositions = starField.geometry.attributes.position.array;
  for (let i = 0; i < STAR_COUNT; i++) {
    const data = starData[i];
    const velocity = useObservedRotation ? data.angularVelocity : data.keplerianAngularVelocity;
    data.angle += velocity;
    diskPositions[i * 3] = Math.cos(data.angle) * data.radius;
    diskPositions[i * 3 + 2] = Math.sin(data.angle) * data.radius;
  }
  starField.geometry.attributes.position.needsUpdate = true;

  // Update bulge star positions
  const bulgePositionsArr = bulgeStars.geometry.attributes.position.array;
  for (let i = 0; i < BULGE_STAR_COUNT; i++) {
    const data = bulgeData[i];
    if (data.radius > 0.5) {
      const velocity = useObservedRotation ? data.angularVelocity : data.keplerianAngularVelocity;
      data.angle += velocity;
      bulgePositionsArr[i * 3] = Math.cos(data.angle) * data.radius;
      bulgePositionsArr[i * 3 + 2] = Math.sin(data.angle) * data.radius;
    }
  }
  bulgeStars.geometry.attributes.position.needsUpdate = true;

  // Pulse the core glow slightly
  coreLight.intensity = 3 + Math.sin(Date.now() * 0.003) * 0.5;

  controls.update();
  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
  drawChart();
});
