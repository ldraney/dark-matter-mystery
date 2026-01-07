import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene setup
const container = document.getElementById('globe-view');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 15;
controls.maxDistance = 50;

// Earth parameters
const EARTH_RADIUS = 10;

// Store earthquake markers for updates
let earthquakeMarkers = [];
let currentTimeRange = 'day';

// === CREATE EARTH ===

// Earth sphere with procedural texture
const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);

// Create a procedural Earth-like texture using canvas
function createEarthTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Ocean base
  ctx.fillStyle = '#1a3a5c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add some noise for ocean variation
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    ctx.fillStyle = `rgba(20, 60, 100, ${Math.random() * 0.3})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Simplified continents (approximate shapes)
  ctx.fillStyle = '#2d5a3d';

  // North America
  ctx.beginPath();
  ctx.moveTo(100, 120);
  ctx.lineTo(250, 100);
  ctx.lineTo(280, 180);
  ctx.lineTo(260, 280);
  ctx.lineTo(180, 300);
  ctx.lineTo(80, 250);
  ctx.lineTo(60, 180);
  ctx.closePath();
  ctx.fill();

  // South America
  ctx.beginPath();
  ctx.moveTo(220, 300);
  ctx.lineTo(280, 320);
  ctx.lineTo(300, 420);
  ctx.lineTo(260, 480);
  ctx.lineTo(220, 450);
  ctx.lineTo(200, 350);
  ctx.closePath();
  ctx.fill();

  // Europe
  ctx.beginPath();
  ctx.moveTo(480, 100);
  ctx.lineTo(560, 90);
  ctx.lineTo(580, 140);
  ctx.lineTo(540, 180);
  ctx.lineTo(480, 170);
  ctx.closePath();
  ctx.fill();

  // Africa
  ctx.beginPath();
  ctx.moveTo(480, 200);
  ctx.lineTo(580, 190);
  ctx.lineTo(600, 280);
  ctx.lineTo(560, 400);
  ctx.lineTo(500, 380);
  ctx.lineTo(460, 280);
  ctx.closePath();
  ctx.fill();

  // Asia
  ctx.beginPath();
  ctx.moveTo(580, 80);
  ctx.lineTo(850, 100);
  ctx.lineTo(900, 200);
  ctx.lineTo(800, 280);
  ctx.lineTo(650, 260);
  ctx.lineTo(600, 180);
  ctx.closePath();
  ctx.fill();

  // Australia
  ctx.beginPath();
  ctx.moveTo(820, 350);
  ctx.lineTo(920, 340);
  ctx.lineTo(940, 420);
  ctx.lineTo(880, 450);
  ctx.lineTo(820, 420);
  ctx.closePath();
  ctx.fill();

  // Antarctica
  ctx.fillStyle = '#4a6a7a';
  ctx.fillRect(0, 470, canvas.width, 42);

  return new THREE.CanvasTexture(canvas);
}

const earthMaterial = new THREE.MeshPhongMaterial({
  map: createEarthTexture(),
  bumpScale: 0.05,
  specular: new THREE.Color(0x333333),
  shininess: 5
});

const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// Atmosphere glow
const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.02, 64, 64);
const atmosphereMaterial = new THREE.MeshBasicMaterial({
  color: 0x4488ff,
  transparent: true,
  opacity: 0.1,
  side: THREE.BackSide
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

// === LIGHTS ===
const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(50, 30, 50);
scene.add(sunLight);

// === STARS ===
const starGeometry = new THREE.BufferGeometry();
const starCount = 3000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  starPositions[i * 3] = (Math.random() - 0.5) * 500;
  starPositions[i * 3 + 1] = (Math.random() - 0.5) * 500;
  starPositions[i * 3 + 2] = (Math.random() - 0.5) * 500;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 }));
scene.add(stars);

camera.position.set(0, 15, 30);
camera.lookAt(0, 0, 0);

// === EARTHQUAKE FUNCTIONS ===

function latLongToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function getMagnitudeColor(mag) {
  if (mag < 2.5) return 0x44aa44; // Green - minor
  if (mag < 4.5) return 0xddaa00; // Yellow - light
  if (mag < 6.0) return 0xff6644; // Orange - moderate
  return 0xff2222; // Red - major
}

function getMagnitudeSize(mag) {
  if (mag < 2.5) return 0.08;
  if (mag < 4.5) return 0.15;
  if (mag < 6.0) return 0.25;
  return 0.4 + (mag - 6) * 0.1;
}

function clearEarthquakes() {
  earthquakeMarkers.forEach(marker => {
    scene.remove(marker);
    marker.geometry.dispose();
    marker.material.dispose();
  });
  earthquakeMarkers = [];
}

function addEarthquake(lat, lon, mag, depth) {
  const position = latLongToVector3(lat, lon, EARTH_RADIUS + 0.1);
  const size = getMagnitudeSize(mag);
  const color = getMagnitudeColor(mag);

  const geometry = new THREE.SphereGeometry(size, 16, 16);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.9
  });

  const marker = new THREE.Mesh(geometry, material);
  marker.position.copy(position);

  // Add glow for larger quakes
  if (mag >= 4.5) {
    const glowGeometry = new THREE.SphereGeometry(size * 2, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    marker.add(glow);
  }

  scene.add(marker);
  earthquakeMarkers.push(marker);
}

// === FETCH EARTHQUAKE DATA ===

async function fetchEarthquakes() {
  const urls = {
    hour: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson',
    day: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    week: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
    month: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson'
  };

  try {
    const response = await fetch(urls[currentTimeRange]);
    const data = await response.json();

    clearEarthquakes();

    let totalCount = 0;
    let majorCount = 0;
    let largestMag = 0;
    const significantQuakes = [];

    data.features.forEach(feature => {
      const coords = feature.geometry.coordinates;
      const lon = coords[0];
      const lat = coords[1];
      const depth = coords[2];
      const mag = feature.properties.mag || 0;
      const place = feature.properties.place || 'Unknown location';
      const time = feature.properties.time;

      if (mag > 0) {
        addEarthquake(lat, lon, mag, depth);
        totalCount++;

        if (mag >= 4.5) majorCount++;
        if (mag > largestMag) largestMag = mag;

        if (mag >= 4.0 || significantQuakes.length < 5) {
          significantQuakes.push({ mag, place, time, lat, lon });
        }
      }
    });

    // Sort by magnitude and take top 5
    significantQuakes.sort((a, b) => b.mag - a.mag);
    const topQuakes = significantQuakes.slice(0, 5);

    // Update UI
    document.getElementById('totalCount').textContent = totalCount.toLocaleString();
    document.getElementById('majorCount').textContent = majorCount;
    document.getElementById('largestMag').textContent = largestMag > 0 ? `M${largestMag.toFixed(1)}` : '-';

    updateQuakeList(topQuakes);

  } catch (error) {
    console.error('Error fetching earthquake data:', error);
    document.getElementById('totalCount').textContent = 'Error loading data';
  }
}

function updateQuakeList(quakes) {
  const list = document.getElementById('quakeList');

  if (quakes.length === 0) {
    list.innerHTML = `
      <div class="quake-item">
        <div class="quake-mag minor">-</div>
        <div class="quake-info">
          <div class="quake-location">No significant earthquakes in this time range</div>
          <div class="quake-time">Try selecting a longer time period</div>
        </div>
      </div>
    `;
    return;
  }

  list.innerHTML = quakes.map(q => {
    const magClass = q.mag < 2.5 ? 'minor' : q.mag < 4.5 ? 'moderate' : q.mag < 6 ? 'major' : 'great';
    const timeAgo = getTimeAgo(q.time);
    return `
      <div class="quake-item">
        <div class="quake-mag ${magClass}">${q.mag.toFixed(1)}</div>
        <div class="quake-info">
          <div class="quake-location">${q.place}</div>
          <div class="quake-time">${timeAgo}</div>
        </div>
      </div>
    `;
  }).join('');
}

function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// === TIME RANGE CHANGE ===
window.changeTimeRange = function() {
  currentTimeRange = document.getElementById('timeRange').value;
  fetchEarthquakes();
};

// === ANIMATION ===
function animate() {
  requestAnimationFrame(animate);

  // Slow Earth rotation
  earth.rotation.y += 0.0005;

  // Pulse earthquake markers
  const time = Date.now() * 0.002;
  earthquakeMarkers.forEach((marker, i) => {
    const pulse = 1 + Math.sin(time + i * 0.5) * 0.1;
    marker.scale.setScalar(pulse);
  });

  controls.update();
  renderer.render(scene, camera);
}

// === INIT ===
fetchEarthquakes();
setInterval(fetchEarthquakes, 60000); // Refresh every minute
animate();

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
});
