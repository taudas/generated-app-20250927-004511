import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

declare const __VERSION__: string;

// DOM Elements
const introOverlay = document.getElementById('intro-overlay')!;
const bigPlayBtn = document.getElementById('big-play-btn')!;
const playPauseBtn = document.getElementById('play-pause-btn')!;
const playIcon = document.getElementById('play-icon')!;
const pauseIcon = document.getElementById('pause-icon')!;
const volumeSlider = document.getElementById('volume-slider') as HTMLInputElement;
const muteBtn = document.getElementById('mute-btn')!;
const statusDot = document.getElementById('status-dot')!;
const statusText = document.getElementById('status-text')!;

// Stream Details
const STREAM_URL = 'https://floyd.wcbn.org:8443/wcbn-hi.mp3';
let audio: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let dataArray = new Uint8Array(0);

// App State
let isPlaying = false;
let isMuted = false;
let previousVolume = 0.8;
let visualizerStyle = 0; // 0: Pulse Orb, 1: Tunnel of Lights, 2: Wireframe Wave
let hasInitializedAudio = false;

// Texture Loader & State
const textureLoader = new THREE.TextureLoader();
let currentArtUrl = "";
let currentTexture: THREE.Texture | null = null;

// Three.js Globals
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let mainSphere: THREE.Mesh;
let innerCore: THREE.Mesh;
let particles: THREE.Points;
let particleOriginalPositions: Float32Array;
let pointLight: THREE.PointLight;
let dirLight: THREE.DirectionalLight;
let ambientLight: THREE.AmbientLight;

const sphereDetail = 4;
let originalVertices: Float32Array;

// Initialize Three.js Scene
function initThree() {
  const canvas = document.getElementById('visualizer-canvas') as HTMLCanvasElement;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x16161d);
  scene.fog = new THREE.FogExp2(0x16161d, 0.035);

  // Camera
  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 8);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxDistance = 20;
  controls.minDistance = 3;

  // Lights
  ambientLight = new THREE.AmbientLight(0x0a0a1f, 0.6);
  scene.add(ambientLight);

  dirLight = new THREE.DirectionalLight(0xff00ff, 1.5);
  dirLight.position.set(5, 5, 5);
  scene.add(dirLight);

  pointLight = new THREE.PointLight(0x00ffff, 3, 15);
  pointLight.position.set(0, 0, 0);
  scene.add(pointLight);

  // Objects Setup
  createVisualizerObjects();

  // Resize Handler
  window.addEventListener('resize', onWindowResize);

  // Start Loop
  animate();
}

function createVisualizerObjects() {
  // 1. Central Morphing Orb (Icosahedron for organic deforms)
  const sphereGeo = new THREE.IcosahedronGeometry(2, sphereDetail);
  originalVertices = sphereGeo.attributes.position.array.slice() as Float32Array;

  const sphereMat = new THREE.MeshPhysicalMaterial({
    color: 0x221144,
    roughness: 0.15,
    metalness: 0.9,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.3,
    thickness: 0.5,
    wireframe: false,
    flatShading: true
  });

  mainSphere = new THREE.Mesh(sphereGeo, sphereMat);
  scene.add(mainSphere);

  // 2. Inner Core Glow Sphere
  const coreGeo = new THREE.SphereGeometry(1.2, 16, 16);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.6,
    wireframe: true
  });
  innerCore = new THREE.Mesh(coreGeo, coreMat);
  scene.add(innerCore);

  // 3. Floating Space Particles
  const pCount = 1200;
  const pGeo = new THREE.BufferGeometry();
  const pPositions = new Float32Array(pCount * 3);
  particleOriginalPositions = new Float32Array(pCount * 3);

  for (let i = 0; i < pCount; i++) {
    const r = 4 + Math.random() * 12;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random() * 2 - 1);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    pPositions[i * 3] = x;
    pPositions[i * 3 + 1] = y;
    pPositions[i * 3 + 2] = z;

    particleOriginalPositions[i * 3] = x;
    particleOriginalPositions[i * 3 + 1] = y;
    particleOriginalPositions[i * 3 + 2] = z;
  }

  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

  const pMat = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.05,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  });

  particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);
}

// Window Resize
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Audio API Setup
function initAudio() {
  if (hasInitializedAudio) return;

  audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.src = STREAM_URL;

  // HTML5 audio stream events for buffering UI state
  audio.addEventListener('waiting', () => {
    statusDot.className = 'pulse-dot buffering';
    statusText.textContent = 'BUFFERING';
  });

  audio.addEventListener('playing', () => {
    statusDot.className = 'pulse-dot live';
    statusText.textContent = 'LIVE STREAM';
  });

  audio.addEventListener('error', (e) => {
    console.error('Audio stream error:', e);
    statusDot.className = 'pulse-dot idle';
    statusText.textContent = 'ERROR';
  });

  // Web Audio Context
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  audioContext = new AudioContextClass();
  
  const source = audioContext.createMediaElementSource(audio);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256; // 128 bins (0 - 22khz)

  source.connect(analyser);
  analyser.connect(audioContext.destination);

  dataArray = new Uint8Array(analyser.frequencyBinCount);
  hasInitializedAudio = true;
}

// Helper to generate a beautiful faux album cover based on song title and artist name
function generateFauxCover(title: string, artist: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 1. Generate gradient based on hash of artist and title
  const hashString = `${artist} - ${title}`;
  let hash = 0;
  for (let i = 0; i < hashString.length; i++) {
    hash = hashString.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h1 = Math.abs(hash) % 360;
  // Use a complementary/triadic offset for nice contrast
  const h2 = (h1 + 135) % 360;
  
  const gradient = ctx.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, `hsl(${h1}, 70%, 35%)`);
  gradient.addColorStop(1, `hsl(${h2}, 85%, 12%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);

  // 2. Draw modern retro details (subtle record grooves)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1.5;
  for (let r = 60; r <= 220; r += 32) {
    ctx.beginPath();
    ctx.arc(256, 256, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw some subtle crosshair lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 256); ctx.lineTo(512, 256);
  ctx.moveTo(256, 0); ctx.lineTo(256, 512);
  ctx.stroke();

  // 3. Draw Station Info Wide-Spaced Lettering
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.textAlign = 'center';
  ctx.font = 'bold 11px "Syncopate", "Inter", sans-serif';
  if ('letterSpacing' in ctx) {
    (ctx as any).letterSpacing = '5px';
  }
  ctx.fillText('WCBN-FM ANN ARBOR', 256, 55);
  ctx.fillText('88.3 FM · FREEFORM RADIO', 256, 470);

  if ('letterSpacing' in ctx) {
    (ctx as any).letterSpacing = 'normal';
  }

  // 4. Wrap & Draw Text in center
  const maxWidth = 420;

  // Title wrapping
  ctx.font = 'bold 30px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const titleWords = title.split(' ');
  let titleLine = '';
  const titleLines: string[] = [];
  for (let n = 0; n < titleWords.length; n++) {
    const testLine = titleLine + titleWords[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      titleLines.push(titleLine.trim());
      titleLine = titleWords[n] + ' ';
    } else {
      titleLine = testLine;
    }
  }
  titleLines.push(titleLine.trim());
  const displayTitleLines = titleLines.slice(0, 3);
  if (titleLines.length > 3) {
    displayTitleLines[2] = displayTitleLines[2].replace(/\s+\S*$/, "") + "...";
  }

  // Artist wrapping
  ctx.font = '600 20px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const artistWords = artist.split(' ');
  let artistLine = '';
  const artistLines: string[] = [];
  for (let n = 0; n < artistWords.length; n++) {
    const testLine = artistLine + artistWords[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      artistLines.push(artistLine.trim());
      artistLine = artistWords[n] + ' ';
    } else {
      artistLine = testLine;
    }
  }
  artistLines.push(artistLine.trim());
  const displayArtistLines = artistLines.slice(0, 2);
  if (artistLines.length > 2) {
    displayArtistLines[1] = displayArtistLines[1].replace(/\s+\S*$/, "") + "...";
  }

  // Calculate coordinates to center everything vertically
  const titleLineHeight = 36;
  const artistLineHeight = 26;
  const spacing = 16;
  const totalHeight = (displayTitleLines.length * titleLineHeight) + spacing + (displayArtistLines.length * artistLineHeight);
  
  let currentY = 256 - (totalHeight / 2) + (titleLineHeight / 2);

  // Draw title lines
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textBaseline = 'middle';
  displayTitleLines.forEach((lineText) => {
    ctx.fillText(lineText, 256, currentY);
    currentY += titleLineHeight;
  });

  // Space between title and artist
  currentY += spacing - (titleLineHeight / 2) + (artistLineHeight / 2);

  // Draw artist lines
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '600 20px "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  displayArtistLines.forEach((lineText) => {
    ctx.fillText(lineText, 256, currentY);
    currentY += artistLineHeight;
  });

  return canvas.toDataURL('image/png');
}

// Spinitron API Polling
async function fetchNowPlaying() {
  try {
    const response = await fetch('/api/spins');
    if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
    
    const data = await response.json();
    if (data && data.items && data.items.length > 0) {
      const currentTrack = data.items[0];
      
      const titleEl = document.getElementById('track-title')!;
      const artistEl = document.getElementById('track-artist')!;
      const albumEl = document.getElementById('track-album')!;
      const artEl = document.getElementById('track-art') as HTMLImageElement;

      const songTitle = currentTrack.song || 'Unknown Title';
      const songArtist = currentTrack.artist || 'Unknown Artist';
      const songAlbum = currentTrack.release || '';
      
      // Determine if there is real album art from Spinitron
      const originalArtUrl = currentTrack.image;
      const hasRealArt = originalArtUrl && 
                         originalArtUrl.trim() !== '' && 
                         originalArtUrl !== 'https://www.wcbn.org/wcbn_images/wcbn-logo-gray.png' &&
                         originalArtUrl !== 'https://www.wcbn.org/wcbn_images/wcbn-logo-gray.png/';

      let finalArtUrl = '';
      let isFaux = false;

      if (hasRealArt) {
        finalArtUrl = originalArtUrl;
      } else {
        finalArtUrl = generateFauxCover(songTitle, songArtist);
        isFaux = true;
      }

      // Only animate text change if values actually changed
      if (titleEl.textContent !== songTitle) {
        titleEl.textContent = songTitle;
      }
      if (artistEl.textContent !== songArtist) {
        artistEl.textContent = songArtist;
      }
      if (albumEl.textContent !== songAlbum) {
        if (songAlbum) {
          albumEl.textContent = `Album: ${songAlbum}`;
          albumEl.classList.remove('hidden');
        } else {
          albumEl.classList.add('hidden');
        }
      }

      // Handle onerror in case the browser fails to load the real image
      artEl.onerror = () => {
        console.warn('Image failed to load, falling back to generated faux cover');
        const fallbackUrl = generateFauxCover(songTitle, songArtist);
        artEl.onerror = null; // Prevent infinite loops
        artEl.src = fallbackUrl;
        
        // Also fallback Three.js texture if needed
        if (!isFaux && mainSphere) {
          textureLoader.load(fallbackUrl, (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            currentTexture = texture;
            const material = mainSphere.material as THREE.MeshPhysicalMaterial;
            material.map = texture;
            material.color.setHex(0xdddddd);
            material.needsUpdate = true;
          });
        }
      };

      if (artEl.src !== finalArtUrl) {
        artEl.src = finalArtUrl;
      }

      // Dynamic Texture Loading onto the Sphere
      if (currentArtUrl !== finalArtUrl && mainSphere) {
        currentArtUrl = finalArtUrl;
        
        const textureUrl = isFaux ? finalArtUrl : `/api/image-proxy?url=${encodeURIComponent(finalArtUrl)}`;
        
        const loadSphereTexture = (url: string, useFauxFallbackOnFail: boolean) => {
          textureLoader.load(url, (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            currentTexture = texture;
            
            const material = mainSphere.material as THREE.MeshPhysicalMaterial;
            material.map = texture;
            material.color.setHex(0xdddddd); // Use bright base color so artwork colors display cleanly
            material.needsUpdate = true;
          }, undefined, (err) => {
            console.warn('Failed to load dynamic album art texture onto sphere:', err);
            if (useFauxFallbackOnFail) {
              console.log('Falling back to generated faux cover texture for sphere.');
              const fallbackUrl = generateFauxCover(songTitle, songArtist);
              // Update HTML element as well
              artEl.onerror = null;
              artEl.src = fallbackUrl;
              loadSphereTexture(fallbackUrl, false);
            }
          });
        };

        loadSphereTexture(textureUrl, !isFaux);
      }
    }
  } catch (err) {
    console.warn('Could not retrieve Spinitron now-playing info:', err);
  }
}

// Playback Trigger
async function togglePlayback() {
  if (!hasInitializedAudio) {
    initAudio();
  }

  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  if (!isPlaying) {
    // Play Stream
    statusDot.className = 'pulse-dot buffering';
    statusText.textContent = 'CONNECTING';
    
    // Update Splash Loader Indicator
    const introLoader = document.getElementById('intro-loader')!;
    if (introLoader) introLoader.classList.remove('hidden');
    bigPlayBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="vertical-align: middle; margin-right: 8px; display: inline-block;">
        <path d="M8 5v14l11-7z"/>
      </svg>
      CONNECTING...
    `;
    bigPlayBtn.setAttribute('disabled', 'true');
    bigPlayBtn.classList.remove('play-pulse');
    
    try {
      if (audio) {
        await audio.play();
        isPlaying = true;
        playIcon.classList.add('hidden');
        pauseIcon.classList.remove('hidden');
        introOverlay.classList.add('hidden');
      }
    } catch (err) {
      console.error('Playback failed:', err);
      statusDot.className = 'pulse-dot idle';
      statusText.textContent = 'FAILED TO PLAY';
      
      // Restore Splash UI on failure
      if (introLoader) introLoader.classList.add('hidden');
      bigPlayBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="vertical-align: middle; margin-right: 8px; display: inline-block;">
          <path d="M8 5v14l11-7z"/>
        </svg>
        RETRY PLAYBACK
      `;
      bigPlayBtn.removeAttribute('disabled');
      bigPlayBtn.classList.add('play-pulse');
    }
  } else {
    // Pause Stream
    if (audio) {
      audio.pause();
      // Since it's a live radio stream, reload source on pause so it doesn't build lag / huge buffer delay
      audio.src = STREAM_URL;
      isPlaying = false;
      playIcon.classList.remove('hidden');
      pauseIcon.classList.add('hidden');
      statusDot.className = 'pulse-dot idle';
      statusText.textContent = 'OFFLINE';
    }
  }
}

// Audio Analysis and deforms in Render Loop
const tempVector = new THREE.Vector3();
let clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();
  const slowTime = time * 0.1;
  const delta = clock.getDelta();

  // Slow automated rotation for ambient view
  if (scene) {
    scene.rotation.y += 0.00015;
    scene.rotation.x += 0.00005;
  }

  let volume = 0;
  let bass = 0;
  let mids = 0;
  let highs = 0;

  if (isPlaying && analyser) {
    analyser.getByteFrequencyData(dataArray);

    // Audio bands
    for (let i = 0; i < 8; i++) bass += dataArray[i]; // Sub/Bass
    for (let i = 8; i < 48; i++) mids += dataArray[i]; // Vocal/Mids
    for (let i = 48; i < 120; i++) highs += dataArray[i]; // Highs

    bass /= 8;
    mids /= 40;
    highs /= 72;

    volume = (bass + mids + highs) / 3;

    // React Lights to Music (10x slower color shift)
    pointLight.intensity = 2.0 + (bass / 255) * 8.0;
    dirLight.intensity = 1.0 + (highs / 255) * 4.0;
    pointLight.color.setHSL((slowTime * 0.02 + (mids / 255) * 0.2) % 1.0, 1.0, 0.5);
  } else {
    // Static calm animation when offline
    pointLight.intensity = 1.5;
    dirLight.intensity = 1.0;
    pointLight.color.setHex(0x00ffff);
  }

  // Deform Orb Vertices
  if (mainSphere && originalVertices) {
    const geo = mainSphere.geometry as THREE.BufferGeometry;
    const posAttr = geo.attributes.position;
    const count = posAttr.count;

    const bassNorm = bass / 255;
    const midsNorm = mids / 255;
    const highsNorm = highs / 255;

    for (let i = 0; i < count; i++) {
      const vx = originalVertices[i * 3];
      const vy = originalVertices[i * 3 + 1];
      const vz = originalVertices[i * 3 + 2];

      tempVector.set(vx, vy, vz).normalize();

      let displacement = 1.0;

      if (visualizerStyle === 0) {
        // STYLE 0: Pulsing, Organic deforming audio orb (10x slower time wave)
        const wave = Math.sin(vx * 1.5 + slowTime * 3.0) * Math.cos(vy * 1.5 + slowTime * 2.5) * 0.15;
        const reactiveAmp = bassNorm * 0.7 + midsNorm * 0.3;
        displacement = 1.0 + wave + (reactiveAmp * 0.6);
      } else if (visualizerStyle === 1) {
        // STYLE 1: Spikey Audio Star (10x slower)
        const frequencyComponent = Math.sin(vx * 10 + slowTime * 5) * Math.cos(vy * 10 + slowTime * 5) * 0.08;
        displacement = 1.0 + (midsNorm * 0.4) + frequencyComponent + (bassNorm * 0.2);
      } else {
        // STYLE 2: Tech crystal (strict geometric scale - 10x slower)
        const polyReact = Math.sin(vx * vy * 5 + slowTime * 2) * 0.05;
        displacement = 1.0 + (highsNorm * 0.5) + polyReact;
      }

      posAttr.setXYZ(i, vx * displacement, vy * displacement, vz * displacement);
    }
    posAttr.needsUpdate = true;

    // Pulse core
    const coreScale = 1.0 + (bass / 255) * 0.5;
    innerCore.scale.set(coreScale, coreScale, coreScale);
    (innerCore.material as THREE.MeshBasicMaterial).opacity = 0.3 + (bass / 255) * 0.7;

    // Rotate core reverse (10x slower)
    innerCore.rotation.y -= 0.0005;
    innerCore.rotation.z += 0.0002;
  }

  // Animate Space Particles
  if (particles && particleOriginalPositions) {
    const geo = particles.geometry as THREE.BufferGeometry;
    const posAttr = geo.attributes.position;
    const count = posAttr.count;
    const volumeNorm = volume / 255;

    for (let i = 0; i < count; i++) {
      let px = particleOriginalPositions[i * 3];
      let py = particleOriginalPositions[i * 3 + 1];
      let pz = particleOriginalPositions[i * 3 + 2];

      // Oscillate particles outward or rotate based on volume (10x slower)
      const rotSpeed = (0.05 + volumeNorm * 0.5) * 0.1;
      const angle = rotSpeed * delta;
      
      // Rotate around Y axis
      const rx = px * Math.cos(angle) - pz * Math.sin(angle);
      const rz = px * Math.sin(angle) + pz * Math.cos(angle);

      // Save back rotated values for continuous rotation
      particleOriginalPositions[i * 3] = rx;
      particleOriginalPositions[i * 3 + 2] = rz;

      // Add a slight audio-pulsing expansion effect (10x slower)
      const pulseFactor = 1.0 + volumeNorm * 0.15 * Math.sin(slowTime * 2 + i);
      posAttr.setXYZ(i, rx * pulseFactor, py * pulseFactor, rz * pulseFactor);
    }
    posAttr.needsUpdate = true;

    // Rotate the particle system as a whole too (10x slower)
    particles.rotation.y += 0.0002 + (highs / 255) * 0.001;
  }

  controls.update();
  renderer.render(scene, camera);
}

// UI Controls Hookup
function setupUI() {
  // Start / Big button click
  bigPlayBtn.addEventListener('click', () => {
    togglePlayback();
  });

  // Small Play/Pause Click
  playPauseBtn.addEventListener('click', () => {
    togglePlayback();
  });

  // Volume slider change
  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    previousVolume = val;
    isMuted = val === 0;
    if (audio) {
      audio.volume = val;
    }
  });

  // Mute toggle click
  muteBtn.addEventListener('click', () => {
    if (!isMuted) {
      previousVolume = parseFloat(volumeSlider.value);
      volumeSlider.value = '0';
      if (audio) audio.volume = 0;
      isMuted = true;
    } else {
      volumeSlider.value = previousVolume.toString();
      if (audio) audio.volume = previousVolume;
      isMuted = false;
    }
  });
}

// Start Up
window.addEventListener('DOMContentLoaded', () => {
  initThree();
  setupUI();
  
  // Initial Spinitron fetch
  fetchNowPlaying();
  
  // Poll Spinitron every 10 seconds for updates
  setInterval(fetchNowPlaying, 10000);

  // Append version badge in bottom-left corner
  const versionBadge = document.createElement('div');
  versionBadge.className = 'version-badge';
  versionBadge.style.position = 'absolute';
  versionBadge.style.bottom = '12px';
  versionBadge.style.left = '16px';
  versionBadge.style.fontSize = '0.62rem';
  versionBadge.style.fontFamily = 'monospace';
  versionBadge.style.color = 'rgba(255, 255, 255, 0.22)';
  versionBadge.style.pointerEvents = 'auto';
  versionBadge.style.zIndex = '100';
  versionBadge.style.textShadow = '0 1px 2px rgba(0,0,0,0.5)';
  versionBadge.style.letterSpacing = '0.03rem';
  versionBadge.textContent = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'v1.1.unknown';
  document.body.appendChild(versionBadge);

  // Style definitions for hover state and copyright snackbar
  const customStyles = document.createElement('style');
  customStyles.textContent = `
    .version-badge {
      cursor: pointer;
      transition: color 0.2s ease;
    }
    .version-badge:hover {
      color: rgba(255, 255, 255, 0.6) !important;
    }
    .copyright-snackbar {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(40px);
      background: rgba(22, 22, 29, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #f0f0f5;
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 0.8rem;
      font-weight: 500;
      letter-spacing: 0.02rem;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      z-index: 1000;
      opacity: 0;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease;
      pointer-events: none;
    }
    .copyright-snackbar.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }
  `;
  document.head.appendChild(customStyles);

  // Add click handler to trigger the snackbar
  let snackbarTimeout: any = null;
  versionBadge.addEventListener('click', () => {
    let snackbar = document.querySelector('.copyright-snackbar') as HTMLDivElement;
    if (!snackbar) {
      snackbar = document.createElement('div');
      snackbar.className = 'copyright-snackbar';
      snackbar.textContent = '©2026 Tony Audas';
      document.body.appendChild(snackbar);
    }

    if (snackbarTimeout) {
      clearTimeout(snackbarTimeout);
    }

    // Force reflow and show
    snackbar.classList.remove('show');
    void snackbar.offsetHeight;
    snackbar.classList.add('show');

    snackbarTimeout = setTimeout(() => {
      snackbar.classList.remove('show');
    }, 2500);
  });
});
