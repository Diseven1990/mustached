
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
const quizCountdown = document.getElementById('quizCountdown');
const countdownNumber = document.getElementById('countdownNumber');
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
const texts = [
  '7 MODULOS',
  '382 HORAS',
  '12 MESES',
  'UNITY',
  '7,5H PRATICAS',
  '7 CASOS',
  'PROJETO FINAL',
  '7 MODULOS',
  '382 HORAS',
  'UNITY',
  '12 MESES',
  '7 CASOS',
  'PROJETO FINAL'
];

const questions = [
  {
    q:'Quantos módulos tem o curso?',
    a:['5 módulos','7 módulos','9 módulos','12 módulos'],
    c:1
  },
  {
    q:'Quantas horas tem o curso?',
    a:['120 horas','240 horas','382 horas','500 horas'],
    c:2
  },
  {
    q:'Qual é a duração contratual do curso?',
    a:['6 meses','9 meses','10 meses','12 meses'],
    c:3
  },
  {
    q:'Qual é o motor utilizado ao longo da formação?',
    a:['Unreal Engine','Godot','Unity','CryEngine'],
    c:2
  },
  {
    q:'Quantas horas de sessões práticas existem?',
    a:['3 horas','5 horas','7,5 horas','12 horas'],
    c:2
  },
  {
    q:'O curso inclui:',
    a:['Apenas teoria','7 casos práticos','Apenas exames','Apenas webinars'],
    c:1
  },
  {
    q:'No final da formação existe:',
    a:['Um relatório','Uma entrevista','Um projeto final','Um teste oral'],
    c:2
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

  // Gap mais equilibrado para obstáculos maiores
  const gap = score >= dangerScore
    ? Math.max(290 - score * 3, 240)
    : Math.max(320 - score * 2, 270);

  // Limites seguros
  const minTop = 120;
  const maxTop = H - gap - 190;

  const top = Math.round(
    minTop + Math.random() * Math.max(20, maxTop - minTop)
  );

  const text = texts[(Math.random() * texts.length) | 0];

  obstacles.push({
    x: W + 60,
    w: 132,
    top,
    bottomTop: top + gap,
    text,
    scored:false
  });
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
  quizCountdown.classList.remove('active');
  quiz.classList.remove('active');
  quizResult.classList.remove('active');
  quizCountdown.classList.remove('active');

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
  quizLocked = true;

  quiz.classList.remove('active');
  quizResult.classList.remove('active');
  quizCountdown.classList.remove('active');

  quizCountdown.classList.add('active');

  let count = 5;
  countdownNumber.textContent = count;

  const timer = setInterval(() => {

    count--;
    countdownNumber.textContent = count;

    if(count <= 0){

      clearInterval(timer);

      quizCountdown.classList.remove('active');

      quizLocked = false;

      quiz.classList.add('active');
      renderQuiz();
    }

  }, 1000);
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
    quizFeedback.textContent = 'RESPOSTA CORRETA';
  }
  else{
    quizWrong++;
    quizFeedback.textContent = 'RESPOSTA ERRADA';
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
  quizCountdown.classList.remove('active');
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
  ctx.fillText('PROGRESSO', W/2, 26);

  ctx.fillStyle = '#edf7ff';
  ctx.font = '900 34px Courier New';
  ctx.fillText(String(score) + '/' + String(maxScore), W/2, 64);

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

  let fill = '#16304d';
  let stroke = '#7fc7ff';
  let label = 'MOD';

  if(text.includes('HORAS')){
    fill = '#35214f';
    stroke = '#c7a6ff';
    label = 'H';
  }
  else if(text.includes('MESES')){
    fill = '#4a2d12';
    stroke = '#ffc37a';
    label = 'T';
  }
  else if(text.includes('UNITY')){
    fill = '#102016';
    stroke = '#8fff9f';
    label = 'U';
  }
  else if(text.includes('PRATICAS')){
    fill = '#1d3c27';
    stroke = '#7effa8';
    label = '✓';
  }
  else if(text.includes('CASOS')){
    fill = '#3b1d30';
    stroke = '#ff8fd2';
    label = 'CP';
  }
  else if(text.includes('PROJETO')){
    fill = '#233456';
    stroke = '#9fc7ff';
    label = 'PF';
  }

  // Glow leve
  ctx.fillStyle = stroke;
  ctx.globalAlpha = .12;
  ctx.fillRect(x-5,y-5,w+10,h+10);
  ctx.globalAlpha = 1;

  // Corpo
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,16);
  ctx.fill();
  ctx.stroke();

  // Faixa superior
  ctx.fillStyle = stroke;
  ctx.globalAlpha = .22;
  ctx.beginPath();
  ctx.roundRect(x+6,y+6,w-12,24,10);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Ícone
  if(h > 85){
    ctx.fillStyle = stroke;
    ctx.beginPath();
    ctx.arc(x+w/2, y+h/2-12, 20, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#07101a';
    ctx.font = '900 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(label, x+w/2, y+h/2-7);
  }

  // Texto principal, sempre visível
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.font = text.length > 12 ? '900 10px Courier New' : text.length > 9 ? '900 12px Courier New' : '900 15px Courier New';

  const textY = h > 85 ? y+h/2+24 : y+h/2+5;
  ctx.fillText(text, x+w/2, textY);

  ctx.textAlign = 'left';
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

  const step = dt / 16.67;

  player.targetY += 2.95 * step;
  player.y += (player.targetY - player.y) * .22;

  if(player.y < 50){
    player.y = 50;
    player.targetY = 50;
  }

  if(player.y > H - player.size - 32){
    player.y = H - player.size - 32;
    player.targetY = player.y;
  }

  spawnCountdown -= dt;

  if(spawnCountdown <= 0){
    spawnCountdown = score >= dangerScore
      ? Math.max(900 - score * 22, 560)
      : Math.max(1220 - score * 36, 820);

    spawnObstacle();
  }

  const speed = 1.95 + Math.min(score * .07, .72) + (score >= dangerScore ? .48 : 0);

  const px = player.x + player.size * .5;
  const py = player.y + player.size * .5;
  const hit = player.size * .24;

  for(let i = 0; i < obstacles.length; i++){
    const o = obstacles[i];

    o.x -= speed * step;

    // Colisão apenas enquanto a personagem está dentro da largura do obstáculo.
    const insideX = px + hit > o.x && px - hit < o.x + o.w;

    if(insideX){
      const hitTop = py - hit < o.top;
      const hitBottom = py + hit > o.bottomTop;

      if(hitTop || hitBottom){
        end(false);
        return;
      }
    }

    // Contagem estável:
    // conta quando a parte direita do obstáculo passa a parte esquerda da personagem.
    // isto evita contar cedo, mas garante que conta sempre depois de ultrapassado.
    
    
    // Conta quando o centro do obstáculo passa o jogador
    if(!o.scored && (o.x + o.w * 0.5) < px){
      o.scored = true;
      score++;

      if(score >= maxScore){
        score = maxScore;
        end(true);
        return;
      }
    }


  }

  obstacles = obstacles.filter(o => o.x + o.w > -200);
}

function loop(ts){
  if(!last) last = ts;
  const dt = Math.min(40, ts - last);
  last = ts;

  update(dt);

  drawBg();
  for(const o of obstacles) drawObstacle(o);
  if(running || !ended) drawPlayer();
  drawHUD();

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
