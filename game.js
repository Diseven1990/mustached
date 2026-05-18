
(() => {
'use strict';

const game = document.getElementById('game');
const playerWrap = document.getElementById('playerWrap');
const playerImg = document.getElementById('player');
const obstaclesEl = document.getElementById('obstacles');
const scoreEl = document.getElementById('score');
const progressEl = document.querySelector('#progress span');
const overlay = document.getElementById('overlay');
const losePanel = document.getElementById('lose');
const winPanel = document.getElementById('win');
const loseScore = document.getElementById('loseScore');
const retry = document.getElementById('retry');
const loseCta = document.getElementById('loseCta');
const winCta = document.getElementById('winCta');

const jumpSound = document.getElementById('jumpSound');
const hitSound = document.getElementById('hitSound');
const closeSound = document.getElementById('closeSound');

const frameSrc = ['assets/player/player_01.webp','assets/player/player_02.webp'];

let W=0,H=0,isMobile=true;
let running=false, ended=false;
let score=0, raf=0, last=0, acc=0;
let lastTap=0, nearCd=0;
let city1=0, city2=0;

const maxScore=15;
const dangerScore=10;

const player={x:0,y:0,vy:0,w:76,h:76,gravity:.36,jump:-7.2,anim:0,animSpeed:.10,frame:0};
let pipes=[];

const texts=[
 ['404','Not Found'],
 ['BUG','Não identificado'],
 ['CRASH','Parou tudo'],
 ['PRAZO','Amanhã'],
 ['SEM CAFÉ','Fatal error'],
 ['ERRO','Tenta outra vez']
];

function resize(){
 W=innerWidth; H=innerHeight; isMobile=W<=760 || H>W;
 player.w=isMobile?76:92; player.h=player.w;
 player.gravity=isMobile?.36:.42;
 player.jump=isMobile?-7.2:-8.1;
 if(!running){ player.x=W*.5-player.w/2; player.y=H*.47-player.h/2; }
 else player.x=(isMobile?Math.max(88,W*.25):Math.max(132,W*.23))-player.w/2;
 setPlayer();
}

function play(s,v=.5){
 if(!s) return;
 const now=performance.now();
 try{ s.volume=v; s.currentTime=0; s.play().catch(()=>{}); }catch(e){}
}

function setPlayer(){
 playerWrap.style.transform=`translate3d(${player.x}px,${player.y}px,0)`;
}

function start(){
 if(running||ended) return;
 document.body.classList.add('playing');
 running=true;
 player.x=(isMobile?Math.max(88,W*.25):Math.max(132,W*.23))-player.w/2;
 jump();
}

function jump(){
 if(!running||ended) return;
 const now=performance.now();
 const interval=lastTap?now-lastTap:400;
 lastTap=now;
 player.vy=player.jump;
 player.animSpeed=interval<150?.28:interval<280?.18:.10;
 if(!isMobile || interval>180) play(jumpSound,.48);
}

function input(e){
 if(e.target.closest('#overlay')) return;
 e.preventDefault();
 if(!running&&!ended) start();
 else jump();
}

function spawn(){
 const gap=Math.max((isMobile?250:232)-score*5,isMobile?190:176);
 const topMin=68;
 const topMax=Math.max(topMin+20,H-gap-110);
 const top=topMin+Math.random()*(topMax-topMin);
 const bottom=H-top-gap;
 const t=texts[(Math.random()*texts.length)|0];
 const width=isMobile?168:200;

 const el=document.createElement('div');
 el.className='pipe';
 el.style.width=width+'px';
 el.innerHTML=`
  <div class="popup top ${t[0]==='CRASH'?'crash':''}" style="height:${top}px">
    <div class="bar">${t[0]}</div><div class="content"><div class="big">${t[0]}</div><div class="small">${t[1]}</div></div>
  </div>
  <div class="popup bottom ${t[0]==='CRASH'?'crash':''}" style="height:${bottom}px">
    <div class="bar">${t[0]}</div><div class="content"><div class="big">${t[0]}</div><div class="small">${t[1]}</div></div>
  </div>`;

 const pipe={x:W+30,w:width,top,bottom,scored:false,el};
 pipes.push(pipe);
 obstaclesEl.appendChild(el);
}

function updateHud(){
 scoreEl.textContent=score;
 progressEl.style.width=Math.min(100,score/maxScore*100)+'%';
 if(score>=dangerScore) document.body.classList.add('danger');
 else document.body.classList.remove('danger');
}

function end(win){
 if(ended) return;
 ended=true; running=false;
 play(hitSound,.62);
 overlay.classList.add('active');
 if(win){ winPanel.classList.add('active'); }
 else{ loseScore.textContent=score; losePanel.classList.add('active'); }
}

function restart(){
 pipes.forEach(p=>p.el.remove());
 pipes=[];
 score=0; updateHud();
 ended=false; running=true; lastTap=0; nearCd=0;
 overlay.classList.remove('active'); losePanel.classList.remove('active'); winPanel.classList.remove('active');
 player.x=(isMobile?Math.max(88,W*.25):Math.max(132,W*.23))-player.w/2;
 player.y=H*.42-player.h/2; player.vy=0;
 document.body.classList.add('playing');
}

function tick(ts){
 if(!last) last=ts;
 let dt=Math.min(32,ts-last); last=ts;
 raf++;

 // background via CSS transforms only
 if(running){
   const sp=isMobile?.18:.32;
   city1=(city1-sp+640)%640;
   city2=(city2-sp*1.8+640)%640;
   document.querySelector('.c1').style.transform=`translate3d(${-city1}px,0,0)`;
   document.querySelector('.c2').style.transform=`translate3d(${-city2}px,0,0)`;
 }

 if(running && !ended){
   acc+=dt;
   if(acc>Math.max((isMobile?132:118)-score*4,62)){ acc=0; spawn(); }

   player.vy += player.gravity*(dt/16.67);
   player.y += player.vy*(dt/16.67);
   if(player.y<0){player.y=0;player.vy=0;}
   if(player.y>H-player.h){player.y=H-player.h;player.vy=0;}

   player.anim += player.animSpeed;
   player.animSpeed += (.08-player.animSpeed)*.06;
   const f=Math.floor(player.anim)%2;
   if(f!==player.frame){ player.frame=f; playerImg.src=frameSrc[f]; }

   const speed=(isMobile?2.6:3.8)+Math.min(score*.10,1.1)+(score>=dangerScore?Math.min((score-dangerScore)*.18,1.0):0);
   const px=player.x+player.w*.5, py=player.y+player.h*.5, hit=player.w*.26;

   for(const p of pipes){
     p.x-=speed*(dt/16.67);
     p.el.style.transform=`translate3d(${p.x}px,0,0)`;

     if(px+hit>p.x && px-hit<p.x+p.w){
       if(py-hit<p.top || py+hit>H-p.bottom) end(false);
     }

     if(!p.scored && p.x+p.w<px){
       p.scored=true; score++; updateHud();
       if(nearCd<=0){ play(closeSound,.28); nearCd=28; }
       if(score>=maxScore) end(true);
     }
   }

   if(nearCd>0) nearCd--;
   for(let i=pipes.length-1;i>=0;i--){
     if(pipes[i].x+pipes[i].w<-30){ pipes[i].el.remove(); pipes.splice(i,1); }
   }

   setPlayer();
 } else if(!ended){
   // intro: only character flaps slowly, no gameplay
   player.anim += .06;
   const f=Math.floor(player.anim)%2;
   if(f!==player.frame){ player.frame=f; playerImg.src=frameSrc[f]; }
   setPlayer();
 }

 requestAnimationFrame(tick);
}

addEventListener('resize',resize);
addEventListener('pointerdown',input,{passive:false});
retry.addEventListener('click',e=>{e.stopPropagation();restart();});
loseCta.addEventListener('click',e=>{e.stopPropagation();location.href='https://www.masterd.pt/';});
winCta.addEventListener('click',e=>{e.stopPropagation();location.href='https://www.masterd.pt/';});

resize(); updateHud(); requestAnimationFrame(tick);
})();
