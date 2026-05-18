
(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha:false });

const scoreEl = document.getElementById('score');
const progressEl = document.getElementById('progressBar');
const gameOverEl = document.getElementById('gameOver');
const loseScreen = document.getElementById('loseScreen');
const winScreen = document.getElementById('winScreen');
const loseScore = document.getElementById('loseScore');
const retryBtn = document.getElementById('retryBtn');
const loseCta = document.getElementById('loseCta');
const winCta = document.getElementById('winCta');

const jumpSound = document.getElementById('jumpSound');
const hitSound = document.getElementById('hitSound');
const closeSound = document.getElementById('closeSound');

const frameSources = [
  "assets/player/player_01.webp",
  "assets/player/player_02.webp",
  "assets/player/player_03.webp",
  "assets/player/player_04.webp"
];

const frames = frameSources.map(src => {
  const img = new Image();
  img.src = src;
  return img;
});

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let W = 0, H = 0, DPR = 1;
let isMobile = false;
let running = false;
let ended = false;
let score = 0;
let frame = 0;
let lastTouch = 0;
let nearCooldown = 0;

const maxScore = 15;
const dangerScore = 10;

const player = {
  x: 0,
  y: 0,
  vy: 0,
  r: 30,
  gravity: 0.38,
  jump: -7.4,
  anim: 0,
  animSpeed: 0.08
};

let pipes = [];
let popups = [
  '404\\nNot Found',
  'BUG\\nNão identificado',
  'CRASH\\nParou tudo',
  'PRAZO\\nAmanhã',
  'SEM CAFÉ\\nFatal error',
  'ERRO\\nTenta outra vez'
];

function resize() {
  W = window.innerWidth;
  H = window.innerHeight;
  isMobile = W <= 760 || H > W;
  DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 0.85 : 1.35);

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);

  player.r = isMobile ? 29 : 34;
  player.gravity = isMobile ? 0.36 : 0.42;
  player.jump = isMobile ? -7.2 : -8.1;

  if(!running) {
    player.x = W * 0.5;
    player.y = H * 0.47;
  } else {
    player.x = isMobile ? Math.max(88, W * 0.25) : Math.max(132, W * 0.23);
  }
}

function play(sound, vol=0.55) {
  if(!sound || isIOS && sound === closeSound) return;
  try {
    sound.volume = vol;
    sound.currentTime = 0;
    sound.play().catch(()=>{});
  } catch(e) {}
}

function start() {
  if(running || ended) return;
  document.body.classList.add('playing');
  running = true;
  player.x = isMobile ? Math.max(88, W * 0.25) : Math.max(132, W * 0.23);
  jump();
}

function jump() {
  if(!running || ended) return;

  const now = performance.now();
  const interval = lastTouch ? now - lastTouch : 400;
  lastTouch = now;

  if(interval < 140) player.animSpeed = isMobile ? .18 : .75;
  else if(interval < 260) player.animSpeed = isMobile ? .14 : .55;
  else player.animSpeed = isMobile ? .10 : .32;

  player.vy = player.jump;

  if(!isMobile || interval > 180) play(jumpSound, .52);
}

function input(e) {
  if(e && e.target && e.target.closest && e.target.closest('#gameOver')) return;
  if(e) e.preventDefault();
  if(!running && !ended) start();
  else jump();
}

window.addEventListener('pointerdown', input, { passive:false });

retryBtn.addEventListener('click', e => {
  e.stopPropagation();
  restart();
});

loseCta.addEventListener('click', e => {
  e.stopPropagation();
  window.location.href = 'https://www.masterd.pt/';
});

winCta.addEventListener('click', e => {
  e.stopPropagation();
  window.location.href = 'https://www.masterd.pt/';
});

function restart() {
  pipes = [];
  score = 0;
  frame = 0;
  ended = false;
  running = true;
  nearCooldown = 0;
  player.x = isMobile ? Math.max(88, W * 0.25) : Math.max(132, W * 0.23);
  player.y = H * 0.42;
  player.vy = 0;
  player.anim = 0;
  updateHUD();

  gameOverEl.classList.remove('active');
  loseScreen.classList.remove('active');
  winScreen.classList.remove('active');
  document.body.classList.add('playing');
}

function updateHUD() {
  scoreEl.textContent = score;
  progressEl.style.width = Math.min(100, score / maxScore * 100) + '%';
}

function spawnPipe() {
  const gap = Math.max((isMobile ? 250 : 230) - score * 5, isMobile ? 190 : 175);
  const topMin = 74;
  const topMax = Math.max(topMin + 20, H - gap - 110);
  const top = topMin + Math.random() * (topMax - topMin);

  pipes.push({
    x: W + 40,
    w: isMobile ? 168 : 200,
    top,
    bottom: H - top - gap,
    scored:false,
    text: popups[(Math.random() * popups.length) | 0]
  });
}

function end(win=false) {
  if(ended) return;
  ended = true;
  running = false;
  play(hitSound, .65);

  gameOverEl.classList.add('active');

  if(win) {
    winScreen.classList.add('active');
  } else {
    loseScore.textContent = score;
    loseScreen.classList.add('active');
  }
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0, '#0b1020');
  sky.addColorStop(.55, '#17243b');
  sky.addColorStop(1, '#090d15');
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,W,H);

  // fixed horizon
  const base = H * .74;
  ctx.fillStyle = 'rgba(6,10,18,.72)';
  const buildings = 11;
  for(let i=0;i<buildings;i++) {
    const bw = W / buildings * (0.72 + (i%3)*.12);
    const x = i * (W/buildings);
    const bh = H * (.14 + ((i*7)%19)/100);
    ctx.fillRect(x, base-bh, bw, bh);
    ctx.fillStyle = 'rgba(155,190,215,.055)';
    for(let wy=base-bh+16; wy<base-8; wy+=24) {
      for(let wx=x+10; wx<x+bw-10; wx+=20) ctx.fillRect(wx, wy, 4, 7);
    }
    ctx.fillStyle = 'rgba(6,10,18,.72)';
  }

  ctx.fillStyle = 'rgba(4,7,12,.70)';
  ctx.fillRect(0,base,W,H-base);

  // simple moving energy, desktop only
  if(!isMobile && running) {
    ctx.globalAlpha = .12;
    ctx.strokeStyle = '#8ed8ff';
    ctx.lineWidth = 1;
    for(let i=0;i<8;i++) {
      const y = H*(.16+i*.075) + Math.sin(frame*.025+i)*10;
      ctx.beginPath();
      ctx.moveTo(0,y);
      for(let x=0;x<W;x+=42) ctx.lineTo(x, y+Math.sin(x*.015+frame*.025+i)*8);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  if(score >= dangerScore) {
    ctx.fillStyle = isMobile ? 'rgba(120,0,40,.08)' : 'rgba(140,0,40,.14)';
    ctx.fillRect(0,0,W,H);
  }
}

function fitText(text, max, size) {
  while(size > 9) {
    ctx.font = '900 '+size+'px Courier New';
    if(ctx.measureText(text).width <= max) return size;
    size--;
  }
  return size;
}

function drawPopup(p) {
  const topH = p.top;
  const bottomY = H - p.bottom;
  drawWindow(p.x, -4, p.w, topH+4, p.text);
  drawWindow(p.x, bottomY, p.w, p.bottom+4, p.text);
}

function drawWindow(x,y,w,h,text) {
  if(h < 54) return;

  ctx.fillStyle = '#d8d2c8';
  ctx.strokeStyle = '#070707';
  ctx.lineWidth = 3;
  ctx.fillRect(x,y,w,h);
  ctx.strokeRect(x,y,w,h);

  ctx.fillStyle = text.includes('CRASH') ? '#8e1730' : '#163f7a';
  ctx.fillRect(x+3,y+3,w-6,28);

  const parts = text.split('\\n');
  const title = parts[0];
  const body = parts[1] || '';

  ctx.fillStyle = '#fff';
  ctx.font = '900 13px Courier New';
  ctx.fillText(title.substring(0,14), x+10, y+22);

  ctx.fillStyle = '#111';
  const compact = h < 135;
  const maxW = w - 24;
  const mid = y + h * .52;

  if(title === '404') {
    const s = fitText('404', maxW, compact ? 34 : 44);
    ctx.font = '900 '+s+'px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('404', x+w/2, mid);
    ctx.font = '900 13px Courier New';
    ctx.fillText('Not Found', x+w/2, mid+24);
    ctx.textAlign = 'left';
  } else {
    const s = fitText(title, maxW, compact ? 18 : 22);
    ctx.font = '900 '+s+'px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(title, x+w/2, mid-4);
    if(!compact && body) {
      const bs = fitText(body, maxW, 14);
      ctx.font = '700 '+bs+'px Courier New';
      ctx.fillText(body, x+w/2, mid+20);
    }
    ctx.textAlign = 'left';
  }
}

function drawPlayer() {
  const useFrames = isMobile ? 2 : frames.length;
  player.anim += player.animSpeed;
  player.animSpeed += (0.08 - player.animSpeed) * .05;
  const idx = Math.floor(player.anim) % useFrames;
  const img = frames[idx] || frames[0];

  const size = player.r * (isMobile ? 2.55 : 3.05);
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.max(-.35, Math.min(.45, player.vy*.025)));

  if(img && img.complete) {
    ctx.drawImage(img, -size/2, -size/2, size, size);
  } else {
    ctx.fillStyle = '#f0a16a';
    ctx.beginPath();
    ctx.arc(0,0,player.r,0,Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function update() {
  if(!running || ended) return;
  frame++;

  player.vy += player.gravity;
  player.y += player.vy;

  const rate = Math.max((isMobile ? 116 : 104) - score * 3, 52);
  if(frame % rate === 0) spawnPipe();

  const baseSpeed = isMobile ? 2.6 : 3.75;
  const extra = Math.min(score * .10, 1.1) + (score >= dangerScore ? Math.min((score-dangerScore)*.18, 1.2) : 0);

  for(const p of pipes) {
    p.x -= baseSpeed + extra;

    const hit = player.r * .50;
    if(player.x + hit > p.x && player.x - hit < p.x + p.w) {
      if(player.y - hit < p.top || player.y + hit > H - p.bottom) {
        end(false);
      }
    }

    if(!p.scored && p.x + p.w < player.x) {
      p.scored = true;
      score++;
      updateHUD();

      if(nearCooldown <= 0) {
        play(closeSound, .35);
        nearCooldown = 26;
      }

      if(score >= maxScore) end(true);
    }
  }

  if(nearCooldown > 0) nearCooldown--;
  pipes = pipes.filter(p => p.x + p.w > -20);

  if(player.y < player.r) {
    player.y = player.r;
    player.vy = 0;
  }
  if(player.y > H - player.r) {
    player.y = H - player.r;
    player.vy = 0;
  }
}

function draw() {
  drawBackground();

  for(const p of pipes) drawPopup(p);

  if(running) drawPlayer();
  else if(!ended) {
    player.anim += .10;
    drawPlayer();
  }

  update();
  requestAnimationFrame(draw);
}

resize();
updateHUD();
window.addEventListener('resize', resize);
requestAnimationFrame(draw);

})();
