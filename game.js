(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha:false, desynchronized:true });
ctx.imageSmoothingEnabled = false;

const overlay = document.getElementById('overlay');
const lose = document.getElementById('lose');
const win = document.getElementById('win');
const loseScore = document.getElementById('loseScore');
const retry = document.getElementById('retry');
const loseCta = document.getElementById('loseCta');
const winCta = document.getElementById('winCta');

const W = 390;
const H = 844;
const STEP = 16.67;
const maxScore = 8;
const dangerScore = 4;
const texts = ['404','BUG','CRASH','PRAZO','ERRO'];

let running = false;
let ended = false;
let score = 0;
let frame = 0;
let last = 0;
let spawnCountdown = 0;
let raf = 0;
let hudDirty = true;

const player = { x:92, y:370, targetY:370, size:74, frame:0 };
let obstacles = [];

const img1 = loadImage('assets/player/player_01.webp');
const img2 = loadImage('assets/player/player_02.webp');

function loadImage(src){
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  if(img.decode) img.decode().catch(() => {});
  return img;
}

function makeCanvas(w,h){
  if(typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w,h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const bg = makeCanvas(W,H);
const bgCtx = bg.getContext('2d', { alpha:false });
bgCtx.imageSmoothingEnabled = false;
renderStaticBg();

const cityA = makeCityLayer(390, 170, 'rgba(5,8,14,.42)', .55);
const cityB = makeCityLayer(390, 210, 'rgba(3,6,10,.78)', .85);

const hudCanvas = makeCanvas(W,104);
const hudCtx = hudCanvas.getContext('2d');
hudCtx.imageSmoothingEnabled = false;

const windowCache = new Map();

function start(){
  if(running || ended) return;
  running = true;
  jump();
}

function jump(){
  if(!running || ended) return;
  player.targetY = Math.max(62, player.targetY - 92);
  player.frame = 0;
}

function input(e){
  if(e.target.closest && e.target.closest('#overlay')) return;
  e.preventDefault();
  if(!running && !ended) start();
  else jump();
}

function spawnObstacle(){
  const gap = Math.max(292 - score * 4, 232);
  const minTop = 86;
  const maxTop = H - gap - 150;
  const top = Math.round(minTop + Math.random() * Math.max(12, maxTop - minTop));
  obstacles.push({
    x: W + 24,
    w: 132,
    top,
    bottomTop: top + gap,
    text: texts[(Math.random() * texts.length) | 0],
    scored:false
  });
  if(obstacles.length > 3) obstacles.shift();
}

function end(hasWon){
  if(ended) return;
  ended = true;
  running = false;
  overlay.classList.add('active');
  if(hasWon) win.classList.add('active');
  else {
    loseScore.textContent = score;
    lose.classList.add('active');
  }
}

function restart(){
  overlay.classList.remove('active');
  lose.classList.remove('active');
  win.classList.remove('active');
  running = true;
  ended = false;
  score = 0;
  frame = 0;
  last = 0;
  spawnCountdown = 0;
  obstacles = [];
  player.y = 350;
  player.targetY = 350;
  player.frame = 0;
  hudDirty = true;
}

function renderStaticBg(){
  const sky = bgCtx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#0b1020');
  sky.addColorStop(.58,'#17243b');
  sky.addColorStop(1,'#070b12');
  bgCtx.fillStyle = sky;
  bgCtx.fillRect(0,0,W,H);

  const glow = bgCtx.createRadialGradient(W*.72,H*.18,8,W*.72,H*.18,190);
  glow.addColorStop(0,'rgba(255,154,70,.16)');
  glow.addColorStop(1,'rgba(255,154,70,0)');
  bgCtx.fillStyle = glow;
  bgCtx.fillRect(0,0,W,H);
}

function makeCityLayer(w,h,color,scale){
  const c = makeCanvas(w,h);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = color;
  const pattern = [[0,48,82],[42,62,130],[100,46,92],[150,64,160],[218,58,105],[270,78,142]];
  for(let r=-1;r<3;r++){
    const start = r*330;
    for(const b of pattern){
      const bh = Math.round(b[2]*scale);
      g.fillRect(start+b[0], h-bh, b[1], bh);
    }
  }
  return c;
}

function drawBg(){
  ctx.drawImage(bg,0,0);

  const shiftA = running ? -((frame * .35) % 96) : 0;
  const shiftB = running ? -((frame * .75) % 96) : 0;
  ctx.drawImage(cityA, shiftA, Math.round(H*.73-cityA.height));
  ctx.drawImage(cityA, shiftA + cityA.width, Math.round(H*.73-cityA.height));
  ctx.drawImage(cityB, shiftB, Math.round(H*.84-cityB.height));
  ctx.drawImage(cityB, shiftB + cityB.width, Math.round(H*.84-cityB.height));

  if(score >= dangerScore){
    ctx.fillStyle = 'rgba(120,0,55,.20)';
    ctx.fillRect(0,0,W,H);
    if((frame & 15) < 4){
      ctx.fillStyle = 'rgba(255,255,255,.035)';
      ctx.fillRect(0,0,W,H);
    }
  }
}

function updateHudCache(){
  hudCtx.clearRect(0,0,W,104);
  if(!running && !ended) return;
  hudCtx.textAlign = 'center';
  hudCtx.fillStyle = '#bcd8ec';
  hudCtx.font = '900 11px Courier New';
  hudCtx.fillText('SCORE', W/2, 26);
  hudCtx.fillStyle = '#edf7ff';
  hudCtx.font = '900 34px Courier New';
  hudCtx.fillText(String(score), W/2, 64);

  const bw = 260;
  const bx = (W - bw) / 2;
  hudCtx.strokeStyle = 'rgba(190,220,240,.42)';
  hudCtx.lineWidth = 1;
  hudCtx.strokeRect(bx, 82, bw, 8);
  hudCtx.fillStyle = '#7fc7ff';
  hudCtx.fillRect(bx, 82, bw * Math.min(1, score / maxScore), 8);
  hudDirty = false;
}

function drawHUD(){
  if(hudDirty) updateHudCache();
  if(running || ended) ctx.drawImage(hudCanvas,0,0);
}

function drawObstacle(o){
  drawWindow(o.x, 0, o.w, o.top, o.text);
  drawWindow(o.x, o.bottomTop, o.w, H - o.bottomTop, o.text);
}

function getWindowSprite(w,h,text){
  const hh = Math.max(45, Math.round(h/4)*4);
  const key = w + 'x' + hh + ':' + text;
  let c = windowCache.get(key);
  if(c) return c;

  c = makeCanvas(w,hh);
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#d8d2c8';
  g.fillRect(0,0,w,hh);
  g.strokeStyle = '#070707';
  g.lineWidth = 2;
  g.strokeRect(1,1,w-2,hh-2);
  g.fillStyle = text === 'CRASH' ? '#8e1730' : '#163f7a';
  g.fillRect(2,2,w-4,22);
  g.fillStyle = '#fff';
  g.font = '900 11px Courier New';
  g.fillText(text.slice(0,9), 7, 17);
  if(hh > 88){
    g.fillStyle = '#111';
    g.textAlign = 'center';
    g.font = '900 17px Courier New';
    g.fillText(text, w/2, hh/2+6);
  }

  windowCache.set(key,c);
  if(windowCache.size > 48) windowCache.delete(windowCache.keys().next().value);
  return c;
}

function drawWindow(x,y,w,h,text){
  if(h < 45) return;
  const sprite = getWindowSprite(w,h,text);
  ctx.drawImage(sprite, Math.round(x), Math.round(y));
}

function drawPlayer(){
  const img = running ? img1 : (player.frame ? img2 : img1);
  const x = Math.round(player.x);
  const y = Math.round(player.y);
  const s = Math.round(player.size);
  if(img.complete && img.naturalWidth) ctx.drawImage(img, x, y, s, s);
  else {
    ctx.fillStyle = '#e9a06d';
    ctx.beginPath();
    ctx.arc(x+s/2, y+s/2, s/2, 0, Math.PI*2);
    ctx.fill();
  }
}

function update(dt){
  if(!running || ended) return;
  frame++;

  const scale = dt / STEP;
  player.targetY += 2.95 * scale;
  player.y += (player.targetY - player.y) * .22;
  if(player.y < 50){ player.y = 50; player.targetY = 50; }
  if(player.y > H - player.size - 32){ player.y = H - player.size - 32; player.targetY = player.y; }

  spawnCountdown -= dt;
  if(spawnCountdown <= 0){
    spawnCountdown = score >= dangerScore
      ? Math.max(760 - score * 24, 420)
      : Math.max(1150 - score * 38, 680);
    spawnObstacle();
  }

  const speed = 2.55 + Math.min(score * .095, 1.05) + (score >= dangerScore ? 1.10 : 0);
  const px = player.x + player.size * .5;
  const py = player.y + player.size * .5;
  const hit = player.size * .24;

  for(let i=0;i<obstacles.length;i++){
    const o = obstacles[i];
    o.x -= speed * scale;
    if(px+hit > o.x && px-hit < o.x + o.w && (py-hit < o.top || py+hit > o.bottomTop)) end(false);
    if(!o.scored && o.x + o.w < px){
      o.scored = true;
      score++;
      hudDirty = true;
      if(score >= maxScore) end(true);
    }
  }

  for(let i=obstacles.length-1;i>=0;i--){
    if(obstacles[i].x + obstacles[i].w <= -20) obstacles.splice(i,1);
  }
}

function loop(ts){
  if(!last) last = ts;
  const dt = Math.min(34, ts - last);
  last = ts;

  update(dt);
  drawBg();
  for(let i=0;i<obstacles.length;i++) drawObstacle(obstacles[i]);
  if(running || !ended) drawPlayer();
  drawHUD();

  raf = requestAnimationFrame(loop);
}

function pauseLoop(){
  if(document.hidden){ cancelAnimationFrame(raf); raf = 0; last = 0; }
  else if(!raf){ raf = requestAnimationFrame(loop); }
}

addEventListener('pointerdown', input, {passive:false});
retry.addEventListener('click', e => { e.stopPropagation(); restart(); });
loseCta.addEventListener('click', e => { e.stopPropagation(); location.href='https://www.masterd.pt/'; });
winCta.addEventListener('click', e => { e.stopPropagation(); location.href='https://www.masterd.pt/'; });
document.addEventListener('visibilitychange', pauseLoop);

raf = requestAnimationFrame(loop);
})();
