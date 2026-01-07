import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Controls - drag to rotate!
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Stars background
const starGeometry = new THREE.BufferGeometry();
const starCount = 5000;
const positions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 600;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Glowing Sun
const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// Sun glow effect
const sunGlow = new THREE.PointLight(0xffdd00, 2, 100);
sun.add(sunGlow);

// Planet data: [size, color, distance, speed, name]
const planetData = [
  [0.4, 0x888888, 5, 0.02, 'Mercury'],
  [0.9, 0xffaa44, 7, 0.015, 'Venus'],
  [1.0, 0x4466ff, 10, 0.01, 'Earth'],
  [0.5, 0xff4422, 13, 0.008, 'Mars'],
  [2.0, 0xffcc88, 18, 0.005, 'Jupiter'],
  [1.7, 0xdddd88, 24, 0.003, 'Saturn'],
];

// Create planets
const planets = [];
planetData.forEach(([size, color, distance, speed, name]) => {
  const geometry = new THREE.SphereGeometry(size, 32, 32);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const planet = new THREE.Mesh(geometry, material);
  planet.userData = { distance, speed, angle: Math.random() * Math.PI * 2, name };
  scene.add(planet);
  planets.push(planet);

  // Orbit ring
  const orbitGeometry = new THREE.RingGeometry(distance - 0.05, distance + 0.05, 64);
  const orbitMaterial = new THREE.MeshBasicMaterial({
    color: 0x444444,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.3
  });
  const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
  orbit.rotation.x = Math.PI / 2;
  scene.add(orbit);
});

// Add Saturn's rings
const saturnRingGeometry = new THREE.RingGeometry(2.2, 3.5, 32);
const saturnRingMaterial = new THREE.MeshBasicMaterial({
  color: 0xccbb77,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.7
});
const saturnRing = new THREE.Mesh(saturnRingGeometry, saturnRingMaterial);
saturnRing.rotation.x = Math.PI / 2.5;
planets[5].add(saturnRing);

// Moon for Earth
const moonGeometry = new THREE.SphereGeometry(0.25, 16, 16);
const moonMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
const moon = new THREE.Mesh(moonGeometry, moonMaterial);
moon.userData = { distance: 1.5, speed: 0.05, angle: 0 };

// Ambient light
const ambientLight = new THREE.AmbientLight(0x333333);
scene.add(ambientLight);

camera.position.set(0, 20, 35);
camera.lookAt(0, 0, 0);

// Animation
function animate() {
  requestAnimationFrame(animate);

  // Rotate sun
  sun.rotation.y += 0.005;

  // Move planets
  planets.forEach(planet => {
    planet.userData.angle += planet.userData.speed;
    planet.position.x = Math.cos(planet.userData.angle) * planet.userData.distance;
    planet.position.z = Math.sin(planet.userData.angle) * planet.userData.distance;
    planet.rotation.y += 0.02;
  });

  // Move moon around Earth
  const earth = planets[2];
  moon.userData.angle += moon.userData.speed;
  moon.position.x = earth.position.x + Math.cos(moon.userData.angle) * moon.userData.distance;
  moon.position.z = earth.position.z + Math.sin(moon.userData.angle) * moon.userData.distance;
  moon.position.y = Math.sin(moon.userData.angle * 0.5) * 0.3;

  // Twinkle stars
  stars.rotation.y += 0.0001;

  controls.update();
  renderer.render(scene, camera);
}

scene.add(moon);
animate();

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
