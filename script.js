const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,0,0,1,2,0,0,0,1,0,0,0,2,1],
  [1,0,1,0,1,0,1,1,0,1,0,1,1,0,1],
  [1,0,1,0,0,0,0,1,0,0,0,0,1,0,1],
  [1,0,1,1,1,1,0,1,1,1,1,0,1,0,1],
  [1,2,0,0,0,1,0,0,0,2,1,0,0,0,1],
  [1,1,1,1,0,1,0,1,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,1,4,0,0,0,0,0,1],
  [1,0,1,1,1,1,0,1,0,1,1,1,1,0,1],
  [1,0,1,2,0,0,0,0,0,0,0,2,1,0,1],
  [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,1,2,0,0,0,0,1,0,0,2,1],
  [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
  [1,2,0,0,0,0,1,2,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const TILE_SIZE = 6;
const WALL_HEIGHT = 2.6;
const TOTAL_STARS = 10;

const container = document.getElementById("game-canvas");
const hud = document.getElementById("hud");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayDesc = document.getElementById("overlay-desc");
const startBtn = document.getElementById("start-btn");
const backBtn = document.getElementById("back-btn");
const scoreEl = document.getElementById("score");
const staminaBarEl = document.getElementById("stamina-bar");

let isPlaying = false;
let score = 0;
let stamina = 100;
let isExhausted = false;
let yaw = 0;
let playerPos = new THREE.Vector3();
let oniPos = new THREE.Vector3();
let oniAlertCooldown = 0;
let stars = [];
let walls = [];

// --- アップロードされた曲に合わせたホラーオルゴール風BGMエンジン ---
let audioCtx = null;
let bgmTimer = null;
let noteIndex = 0;

// 不気味なオルゴール調のメロディ配列
const horrorMelody = [
  440.00, 415.30, 392.00, 415.30, // A4, G#4, G4, G#4
  440.00, 523.25, 493.88, 523.25, // A4, C5, B4, C5
  440.00, 349.23, 329.63, 349.23, // A4, F4, E4, F4
  293.66, 329.63, 392.00, 415.30  // D4, E4, G4, G#4
];

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBgmNote() {
  if (!audioCtx || !isPlaying) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  // オルゴールらしい透明感と不気味さを持つsine波
  osc.type = "sine";
  osc.frequency.setValueAtTime(horrorMelody[noteIndex], audioCtx.currentTime);

  gain.gain.setValueAtTime(0.14, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.32);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.32);

  noteIndex = (noteIndex + 1) % horrorMelody.length;
}

function startBgm() {
  if (bgmTimer) clearInterval(bgmTimer);
  noteIndex = 0;
  bgmTimer = setInterval(() => {
    playBgmNote();
  }, 260); // テンポよく刻む不気味なリズム
}

function stopBgm() {
  if (bgmTimer) {
    clearInterval(bgmTimer);
    bgmTimer = null;
  }
}

function playJumpScareSound() {
  if (!audioCtx) return;
  [130.8, 138.6, 261.6, 277.2].forEach(freq => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.7, audioCtx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.6);
  });
}

function playStarSound() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(660, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.3);
}

// --- テクスチャ自動生成 ---
function createWoodTexture() {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#e8d2a6";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#b89b68";
  ctx.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(256, y); ctx.stroke();
  }
  ctx.fillStyle = "#5c4422";
  for (let i = 0; i < 28; i++) {
    ctx.beginPath();
    ctx.ellipse(Math.random() * 256, Math.random() * 256, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 30);
  return tex;
}

function createHedgeTexture() {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#1e8f1e";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#29b829" : "#126312";
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 4, 4);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  return tex;
}

function createSkyTexture() {
  const c = document.createElement("canvas");
  c.width = 512; c.height = 256;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#3b8eea");
  grad.addColorStop(1, "#bfe2ff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  for (let i = 0; i < 25; i++) {
    const cx = Math.random() * 512;
    const cy = 40 + Math.random() * 140;
    ctx.beginPath();
    ctx.arc(cx, cy, 20 + Math.random() * 25, 0, Math.PI * 2);
    ctx.arc(cx + 20, cy + 5, 18 + Math.random() * 20, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(c);
}

// --- シーン構築 ---
const scene = new THREE.Scene();
scene.background = createSkyTexture();

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(40, 80, 30);
dirLight.castShadow = true;
scene.add(dirLight);

const floorGeo = new THREE.PlaneGeometry(200, 200);
const floorMat = new THREE.MeshLambertMaterial({ map: createWoodTexture() });
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// 鬼（赤鬼）
const oniGroup = new THREE.Group();
const skinMat = new THREE.MeshStandardMaterial({ color: 0x7a1212, roughness: 0.4 });
const pantsMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.42, 1.3, 12), skinMat);
torso.position.y = 1.6;
oniGroup.add(torso);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 16), skinMat);
head.position.y = 2.55;
oniGroup.add(head);

const hornMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 8), hornMat);
hornL.position.set(-0.2, 2.9, 0.05);
hornL.rotation.z = 0.3;
oniGroup.add(hornL);

const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.45, 8), hornMat);
hornR.position.set(0.2, 2.9, 0.05);
hornR.rotation.z = -0.3;
oniGroup.add(hornR);

const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
eyeL.position.set(-0.13, 2.58, 0.31);
oniGroup.add(eyeL);

const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), eyeMat);
eyeR.position.set(0.13, 2.58, 0.31);
oniGroup.add(eyeR);

const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 1.1, 8), skinMat);
armL.position.set(-0.82, 1.65, 0);
oniGroup.add(armL);

const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 1.1, 8), skinMat);
armR.position.set(0.82, 1.65, 0);
oniGroup.add(armR);

const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 1.0, 8), skinMat);
legL.position.set(-0.28, 0.5, 0);
oniGroup.add(legL);

const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 1.0, 8), skinMat);
legR.position.set(0.28, 0.5, 0);
oniGroup.add(legR);

const shorts = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.46, 0.4, 12), pantsMat);
shorts.position.y = 0.95;
oniGroup.add(shorts);

scene.add(oniGroup);

// 星と光の柱
function createStarWithBeam(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);

  const starGeo = new THREE.OctahedronGeometry(0.65, 0);
  const starMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
  const starMesh = new THREE.Mesh(starGeo, starMat);
  starMesh.position.y = 1.4;
  group.add(starMesh);

  const beamGeo = new THREE.CylinderGeometry(0.25, 0.25, 50, 12, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.position.y = 25;
  group.add(beam);

  scene.add(group);
  return { group, starMesh, collected: false };
}

const wallMat = new THREE.MeshLambertMaterial({ map: createHedgeTexture() });
const wallGeo = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);

function buildWorld() {
  walls.forEach(w => scene.remove(w.mesh));
  stars.forEach(s => scene.remove(s.group));
  walls = [];
  stars = [];

  for (let r = 0; r < MAP.length; r++) {
    for (let c = 0; c < MAP[r].length; c++) {
      const wx = (c - MAP[0].length / 2) * TILE_SIZE;
      const wz = (r - MAP.length / 2) * TILE_SIZE;
      const cell = MAP[r][c];

      if (cell === 1) {
        const mesh = new THREE.Mesh(wallGeo, wallMat);
        mesh.position.set(wx, WALL_HEIGHT / 2, wz);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        walls.push({ x: wx, z: wz, mesh });
      } else if (cell === 2) {
        stars.push(createStarWithBeam(wx, wz));
      } else if (cell === 3) {
        playerPos.set(wx, 1.65, wz);
        yaw = Math.PI;
      } else if (cell === 4) {
        oniPos.set(wx, 0, wz);
      }
    }
  }
}

// 入力処理
const keys = {};
window.addEventListener("keydown", e => { keys[e.code] = true; });
window.addEventListener("keyup", e => { keys[e.code] = false; });

document.addEventListener("mousemove", e => {
  if (isPlaying && document.pointerLockElement === renderer.domElement) {
    yaw -= e.movementX * 0.0025;
  }
});

function checkWallCollision(x, z, radius) {
  const half = TILE_SIZE / 2 + radius;
  return walls.some(w => Math.abs(x - w.x) < half && Math.abs(z - w.z) < half);
}

function hasLineOfSight(p1, p2) {
  const dist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
  const steps = Math.ceil(dist / 1.0);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const cx = p1.x + (p2.x - p1.x) * t;
    const cz = p1.z + (p2.z - p1.z) * t;
    if (checkWallCollision(cx, cz, 0.1)) return false;
  }
  return true;
}

let oniDir = new THREE.Vector2(1, 0);
function updateOni(time) {
  const distToPlayer = Math.hypot(playerPos.x - oniPos.x, playerPos.z - oniPos.z);
  const canSeePlayer = distToPlayer < 28 && hasLineOfSight(oniPos, playerPos);

  let speed = 0.075 + score * 0.004;

  if (canSeePlayer) {
    if (oniAlertCooldown <= 0) {
      playJumpScareSound();
      oniAlertCooldown = 180;
    }
    speed = 0.135 + score * 0.005;
    const angle = Math.atan2(playerPos.x - oniPos.x, playerPos.z - oniPos.z);
    oniDir.set(Math.sin(angle), Math.cos(angle));
  } else {
    const nextX = oniPos.x + oniDir.x * speed;
    const nextZ = oniPos.z + oniDir.y * speed;
    if (checkWallCollision(nextX, nextZ, 0.9) || Math.random() < 0.01) {
      const dirs = [
        new THREE.Vector2(1, 0), new THREE.Vector2(-1, 0),
        new THREE.Vector2(0, 1), new THREE.Vector2(0, -1)
      ].filter(d => !checkWallCollision(oniPos.x + d.x * 2, oniPos.z + d.y * 2, 0.9));
      if (dirs.length > 0) {
        oniDir = dirs[Math.floor(Math.random() * dirs.length)];
      }
    }
  }

  if (oniAlertCooldown > 0) oniAlertCooldown--;

  const vx = oniDir.x * speed;
  const vz = oniDir.y * speed;
  if (!checkWallCollision(oniPos.x + vx, oniPos.z, 0.8)) oniPos.x += vx;
  if (!checkWallCollision(oniPos.x, oniPos.z + vz, 0.8)) oniPos.z += vz;

  oniGroup.position.copy(oniPos);
  oniGroup.rotation.y = Math.atan2(oniDir.x, oniDir.y);

  const runCycle = time * (canSeePlayer ? 0.022 : 0.012);
  legL.rotation.x = Math.sin(runCycle) * 0.9;
  legR.rotation.x = -Math.sin(runCycle) * 0.9;
  armL.rotation.x = -Math.sin(runCycle) * 0.9;
  armR.rotation.x = Math.sin(runCycle) * 0.9;
  oniGroup.position.y = Math.abs(Math.sin(runCycle)) * 0.25;

  if (distToPlayer < 1.65) {
    endGame(false);
  }
}

function animate(time) {
  requestAnimationFrame(animate);
  if (!isPlaying) {
    renderer.render(scene, camera);
    return;
  }

  if (keys["ArrowLeft"]) yaw += 0.045;
  if (keys["ArrowRight"]) yaw -= 0.045;

  const wantsDash = keys["ShiftLeft"] || keys["ShiftRight"];
  const isMoving = keys["KeyW"] || keys["KeyS"] || keys["KeyA"] || keys["KeyD"] || keys["ArrowUp"] || keys["ArrowDown"];
  let moveSpeed = 0.11;

  if (isExhausted) {
    moveSpeed = 0.065;
    stamina += 0.3;
    if (stamina >= 35) isExhausted = false;
  } else if (wantsDash && isMoving) {
    moveSpeed = 0.18;
    stamina -= 0.7;
    if (stamina <= 0) {
      stamina = 0;
      isExhausted = true;
    }
  } else {
    stamina = Math.min(100, stamina + 0.4);
  }
  staminaBarEl.style.width = stamina + "%";
  staminaBarEl.style.background = isExhausted ? "#ff3333" : "#00e5ff";

  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const move = new THREE.Vector3();

  if (keys["KeyW"] || keys["ArrowUp"]) move.add(forward);
  if (keys["KeyS"] || keys["ArrowDown"]) move.sub(forward);
  if (keys["KeyD"]) move.add(right);
  if (keys["KeyA"]) move.sub(right);

  if (move.lengthSq() > 0) {
    move.normalize().multiplyScalar(moveSpeed);
    if (!checkWallCollision(playerPos.x + move.x, playerPos.z, 0.75)) playerPos.x += move.x;
    if (!checkWallCollision(playerPos.x, playerPos.z + move.z, 0.75)) playerPos.z += move.z;
    camera.position.y = 1.65 + Math.sin(time * 0.015) * 0.08;
  } else {
    camera.position.y = 1.65;
  }

  camera.position.x = playerPos.x;
  camera.position.z = playerPos.z;
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;

  stars.forEach(s => {
    if (s.collected) return;
    s.starMesh.rotation.y += 0.04;
    const dist = Math.hypot(playerPos.x - s.group.position.x, playerPos.z - s.group.position.z);
    if (dist < 1.8) {
      s.collected = true;
      scene.remove(s.group);
      score++;
      scoreEl.textContent = score;
      playStarSound();
      if (score >= TOTAL_STARS) {
        endGame(true);
      }
    }
  });

  updateOni(time);
  renderer.render(scene, camera);
}

function startGame() {
  initAudio();
  score = 0;
  stamina = 100;
  isExhausted = false;
  scoreEl.textContent = "0";
  buildWorld();

  isPlaying = true;
  overlay.classList.add("hidden");
  hud.classList.remove("hidden");
  renderer.domElement.requestPointerLock?.();

  startBgm(); // ホラーBGMの自動演奏開始
}

function endGame(isClear) {
  isPlaying = false;
  stopBgm(); // BGM停止
  document.exitPointerLock?.();
  hud.classList.add("hidden");
  overlay.classList.remove("hidden");

  if (isClear) {
    overlayTitle.textContent = "生 還 成 功 ！";
    overlayTitle.style.color = "#ffcc00";
    overlayDesc.innerHTML = "すべての星（10個）を集め、鬼から逃げ切った！";
  } else {
    playJumpScareSound();
    overlayTitle.textContent = "捕 ま っ た …";
    overlayTitle.style.color = "#ff2222";
    overlayDesc.innerHTML = `集めた星: ${score} ／ 10 個<br>角を曲がる時は足音と視界に気をつけよう！`;
  }
  startBtn.textContent = "もう一度遊ぶ";
}

startBtn.addEventListener("click", startGame);
backBtn.addEventListener("click", () => {
  isPlaying = false;
  stopBgm();
  document.exitPointerLock?.();
  hud.classList.add("hidden");
  overlay.classList.remove("hidden");
  overlayTitle.textContent = "鬼が追ってくる";
  overlayTitle.style.color = "#ff3333";
  startBtn.textContent = "PLAY（ホラーBGMが流れます）";
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

buildWorld();
camera.position.copy(playerPos);
camera.rotation.y = yaw;
animate(0);