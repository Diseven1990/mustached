
(() => {
'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha:false });
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;
ctx.mozImageSmoothingEnabled = false;

const overlay = document.getElementById('overlay');
const lose = document.getElementById('lose');
const win = document.getElementById('win');
const loseScore = document.getElementById('loseScore');
const retry = document.getElementById('retry');
const loseCta = document.getElementById('loseCta');
const winCta = document.getElementById('winCta');
const quiz = document.getElementById('quiz');
const quizResult = document.getElementById('quizResult');
const quizMeta = document.getElementById('quizMeta');
const quizQuestion = document.getElementById('quizQuestion');
const quizAnswers = document.getElementById('quizAnswers');
const quizFeedback = document.getElementById('quizFeedback');
const quizResultTitle = document.getElementById('quizResultTitle');
const quizResultImg = document.getElementById('quizResultImg');
const quizSummary = document.getElementById('quizSummary');
const quizRetry = document.getElementById('quizRetry');
const quizCta = document.getElementById('quizCta');

const W = 390;
const H = 844;

const img1 = new Image();
img1.src = 'assets/player/player_01.webp';
const img2 = new Image();
img2.src = 'assets/player/player_02.webp';

let running = false;
let ended = false;
let score = 0;
let frame = 0;
let last = 0;
let lastTap = 0;
let spawnCountdown = 0;

const maxScore = 8;
const dangerScore = 4;

const player = {
  x: 92,
  y: 370,
  targetY: 370,
  size: 74,
  frame: 0
};

let obstacles = [];
const texts = ['382 HORAS','7 PRATICAS','UNITY 3D','C#','PROJETOS','PORTFOLIO','SHADERS','ANIMACAO','GAME DEV','ESTAGIO','INDUSTRIA','AUDIO','UI','REAL MISTA'];

const questions = [
  {
    q:'Quantas sessões práticas tem o curso?',
    a:['5 práticas','7 práticas','9 práticas','12 práticas'],
    c:1
  },
  {
    q:'Qual é o motor principal usado no curso?',
    a:['Unity 3D','Unreal Engine','Godot','Construct'],
    c:0
  },
  {
    q:'Quantas horas tem o curso?',
    a:['120 horas','240 horas','382 horas','500 horas'],
    c:2
  },
  {
    q:'Qual destas áreas faz parte da formação?',
    a:['Shaders e áudio','Apenas redes sociais','Fotografia analógica','Contabilidade'],
    c:0
  }
];

let quizIndex = 0;
let quizCorrect = 0;
let quizWrong = 0;
let quizLocked = false;

function start(){
  if(running || ended) return;
  running = true;
  jump();
}

function jump(){
  if(!running || ended) return;
  const now = performance.now();
  lastTap = now;
  player.targetY -= 92;
  if(player.targetY < 62) player.targetY = 62;
  // frame fixo durante o jogo para evitar jitter horizontal no iPhone
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
  const text = texts[(Math.random() * texts.length) | 0];

  obstacles.push({
    x: W + 24,
    w: 118,
    top,
    bottomTop: top + gap,
    text,
    scored:false
  });

  if(obstacles.length > 3) obstacles.shift();
}

function end(hasWon){
  if(ended) return;
  ended = true;
  running = false;
  overlay.classList.add('active');
  lose.classList.remove('active');
  win.classList.remove('active');
  quiz.classList.remove('active');
  quizResult.classList.remove('active');
  quiz.classList.remove('active');
  quizResult.classList.remove('active');

  if(hasWon) startQuiz();
  else {
    loseScore.textContent = score;
    lose.classList.add('active');
  }
}


function startQuiz(){
  quizIndex = 0;
  quizCorrect = 0;
  quizWrong = 0;
  quizLocked = false;
  quiz.classList.add('active');
  renderQuiz();
}

function renderQuiz(){
  quizLocked = false;
  const item = questions[quizIndex];
  quizMeta.textContent = 'PERGUNTA ' + (quizIndex + 1) + '/' + questions.length;
  quizQuestion.textContent = item.q;
  quizFeedback.textContent = '';
  quizAnswers.innerHTML = '';

  item.a.forEach((answer, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quizAnswer';
    btn.textContent = String.fromCharCode(65 + idx) + ') ' + answer;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      answerQuiz(idx, btn);
    });
    quizAnswers.appendChild(btn);
  });
}

function answerQuiz(idx, btn){
  if(quizLocked) return;
  quizLocked = true;

  const item = questions[quizIndex];
  const buttons = Array.from(quizAnswers.querySelectorAll('.quizAnswer'));

  buttons.forEach((b, i) => {
    if(i === item.c) b.classList.add('correct');
    else if(i === idx) b.classList.add('wrong');
    b.disabled = true;
  });

  if(idx === item.c){
    quizCorrect++;
    quizFeedback.textContent = 'CORRETO';
  }
  else{
    quizWrong++;
    quizFeedback.textContent = 'ERRADO';
  }

  setTimeout(() => {
    quizIndex++;
    if(quizIndex >= questions.length) showQuizResult();
    else renderQuiz();
  }, 850);
}

function showQuizResult(){
  quiz.classList.remove('active');
  quizResult.classList.add('active');

  const passed = quizCorrect >= quizWrong;

  if(passed){
    quizResultTitle.innerHTML = 'PARABÉNS<br>TUTORIAL COMPLETO<br><span class="readyText">READY PLAYER ONE?</span>';
    quizResultImg.src = 'assets/player/win.webp';
    quizRetry.style.display = 'none';
    quizCta.style.display = 'block';
  }
  else{
    quizResultTitle.textContent = 'GAME OVER';
    quizResultImg.src = 'assets/player/ko.webp';
    quizRetry.style.display = 'block';
    quizCta.style.display = 'none';
  }

  quizSummary.innerHTML =
    '<strong>' + quizCorrect + '</strong> RESPOSTAS CORRETAS<br>' +
    '<strong>' + quizWrong + '</strong> RESPOSTAS ERRADAS';
}


function restart(){
  overlay.classList.remove('active');
  lose.classList.remove('active');
  win.classList.remove('active');
  quiz.classList.remove('active');
  quizResult.classList.remove('active');
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
}

function drawBg(){
  const sky = ctx.createLinearGradient(0,0,0,H);
  sky.addColorStop(0,'#0b1020');
  sky.addColorStop(.58,'#17243b');
  sky.addColorStop(1,'#070b12');
  ctx.fillStyle = sky;
  ctx.fillRect(0,0,W,H);

  const glow = ctx.createRadialGradient(W*.72,H*.18,8,W*.72,H*.18,190);
  glow.addColorStop(0,'rgba(255,154,70,.16)');
  glow.addColorStop(1,'rgba(255,154,70,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0,0,W,H);

  drawCity(.35, H*.73, 'rgba(5,8,14,.42)');
  drawCity(.75, H*.84, 'rgba(3,6,10,.78)');

  if(score >= dangerScore){
    ctx.fillStyle = 'rgba(120,0,55,.24)';
    ctx.fillRect(0,0,W,H);

    if((frame % 16) < 5){
      ctx.fillStyle = 'rgba(255,255,255,.045)';
      ctx.fillRect(0,0,W,H);
    }
  }
}

function drawCity(speed, base, color){
  const shift = running ? -((frame * speed) % 96) : 0;
  ctx.fillStyle = color;
  const pattern = [[0,48,82],[42,62,130],[100,46,92],[150,64,160],[218,58,105],[270,78,142]];
  for(let r=-1;r<5;r++){
    const start = r*330 + shift;
    for(const b of pattern){
      ctx.fillRect(start+b[0], base-b[2], b[1], b[2]);
    }
  }
}

function drawHUD(){
  if(!running && !ended) return;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#bcd8ec';
  ctx.font = '900 11px Courier New';
  ctx.fillText('CURSO', W/2, 26);
  ctx.fillStyle = '#edf7ff';
  ctx.font = '900 34px Courier New';
  ctx.fillText('MOD ' + String(Math.min(score + 1, maxScore)) + '/' + maxScore, W/2, 64);

  const bw = 260;
  const bx = (W - bw) / 2;
  ctx.strokeStyle = 'rgba(190,220,240,.42)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, 82, bw, 8);
  ctx.fillStyle = '#7fc7ff';
  ctx.fillRect(bx, 82, bw * Math.min(1, score / maxScore), 8);
  ctx.textAlign = 'left';
}

function drawObstacle(o){
  drawWindow(o.x + Math.sin(frame*0.02)*2, 0, o.w, o.top, o.text);
  drawWindow(o.x - Math.sin(frame*0.02)*2, o.bottomTop, o.w, H - o.bottomTop, o.text);
}



function drawWindow(x,y,w,h,text){
  if(h < 45) return;

  let type = 'module';
  if(text.includes('PRATICAS')) type = 'practice';
  else if(text.includes('UNITY') || text.includes('C#')) type = 'terminal';
  else if(text.includes('PORT') || text.includes('PROJETOS')) type = 'project';
  else if(text.includes('ESTAGIO') || text.includes('INDUSTRIA')) type = 'badge';
  else if(text.includes('IA') || text.includes('REAL')) type = 'orb';

  // glow
  ctx.fillStyle = 'rgba(120,180,255,.10)';
  ctx.fillRect(x-4,y-4,w+8,h+8);

  // LIVRO / MÓDULO
  if(type === 'module'){
    ctx.fillStyle = '#18304f';
    ctx.strokeStyle = '#7fc7ff';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(x,y,w,h,8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#7fc7ff';
    ctx.fillRect(x+8,y+8,6,h-16);

    ctx.fillStyle = '#ffffff';
    ctx.font = text.length > 9 ? '900 12px Courier New' : '900 15px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(text, x+w/2+4, y+h/2+5);
    ctx.textAlign = 'left';
  }

  // CHECKPOINT / PRÁTICAS
  else if(type === 'practice'){
    ctx.fillStyle = '#1d3c27';
    ctx.strokeStyle = '#7effa8';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(x,y,w,h,20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#7effa8';
    ctx.beginPath();
    ctx.arc(x+w/2, y+h/2-6, 18, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#0d1c12';
    ctx.font = '900 20px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('✓', x+w/2, y+h/2+2);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 11px Courier New';
    ctx.fillText(text, x+w/2, y+h/2+28);
    ctx.textAlign = 'left';
  }

  // TERMINAL
  else if(type === 'terminal'){
    ctx.fillStyle = '#102016';
    ctx.strokeStyle = '#8fff9f';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(x,y,w,h,10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8fff9f';
    ctx.fillRect(x+5,y+5,w-10,18);

    ctx.fillStyle = '#08100b';
    ctx.font = '900 11px Courier New';
    ctx.fillText('RUN.EXE', x+10, y+18);

    ctx.fillStyle = '#8fff9f';
    ctx.font = text.length > 9 ? '900 12px Courier New' : '900 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(text, x+w/2, y+h/2+6);
    ctx.textAlign = 'left';
  }

  // PROJECTO
  else if(type === 'project'){
    ctx.fillStyle = '#35214f';
    ctx.strokeStyle = '#c7a6ff';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(x,y,w,h,10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c7a6ff';
    ctx.fillRect(x+10,y+10,30,10);

    ctx.fillStyle = '#ffffff';
    ctx.font = text.length > 9 ? '900 12px Courier New' : '900 15px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(text, x+w/2, y+h/2+5);
    ctx.textAlign = 'left';
  }

  // BADGE
  else if(type === 'badge'){
    ctx.fillStyle = '#4a2d12';
    ctx.strokeStyle = '#ffc37a';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(x,y,w,h,30);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffc37a';
    ctx.beginPath();
    ctx.arc(x+w/2, y+h/2, 24, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#2d1808';
    ctx.font = '900 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(text.slice(0,3), x+w/2, y+h/2+5);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 11px Courier New';
    ctx.fillText(text, x+w/2, y+h/2+34);
    ctx.textAlign = 'left';
  }

  // ORB / IA
  else if(type === 'orb'){
    ctx.fillStyle = '#3b1d30';
    ctx.strokeStyle = '#ff8fd2';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.roundRect(x,y,w,h,20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff8fd2';
    ctx.globalAlpha = .25;
    ctx.beginPath();
    ctx.arc(x+w/2, y+h/2, 28, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = '#ffffff';
    ctx.font = text.length > 9 ? '900 12px Courier New' : '900 15px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(text, x+w/2, y+h/2+5);
    ctx.textAlign = 'left';
  }
}



function drawPlayer(){
  const animFrame = running
    ? ((frame >> 3) % 2)
    : 0;

  const img = animFrame ? img2 : img1;

  if(img.complete) {
    ctx.drawImage(
      img,
      Math.round(player.x),
      Math.round(player.y),
      Math.round(player.size),
      Math.round(player.size)
    );
  }
  else {
    ctx.fillStyle = '#e9a06d';
    ctx.beginPath();
    ctx.arc(player.x+player.size/2, player.y+player.size/2, player.size/2, 0, Math.PI*2);
    ctx.fill();
  }
}

function update(dt){
  if(!running || ended) return;
  frame++;

  player.targetY += 2.95 * (dt / 16.67);
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

  for(const o of obstacles){
    o.x -= speed * (dt / 16.67);

    if(px+hit > o.x && px-hit < o.x + o.w){
      if(py-hit < o.top || py+hit > o.bottomTop) end(false);
    }

    if(!o.scored && o.x + o.w < px){
      o.scored = true;
      score++;
      if(score >= maxScore) end(true);
    }
  }

  obstacles = obstacles.filter(o => o.x + o.w > -20);
}

function loop(ts){
  if(!last) last = ts;
  const dt = Math.min(40, ts - last);
  last = ts;

  drawBg();
  for(const o of obstacles) drawObstacle(o);
  if(running || !ended) drawPlayer();
  drawHUD();
  update(dt);

  requestAnimationFrame(loop);
}

addEventListener('pointerdown', input, {passive:false});
retry.addEventListener('click', e => { e.stopPropagation(); restart(); });
quizRetry.addEventListener('click', e => { e.stopPropagation(); restart(); });
loseCta.addEventListener('click', e => { e.stopPropagation(); location.href='https://www.masterd.pt/'; });
winCta.addEventListener('click', e => { e.stopPropagation(); location.href='https://www.masterd.pt/'; });
quizCta.addEventListener('click', e => { e.stopPropagation(); location.href='https://www.masterd.pt/'; });

requestAnimationFrame(loop);
})();
