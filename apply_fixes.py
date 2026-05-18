#!/usr/bin/env python3
"""
Aplica correcoes de performance ao Mister Master DDDDDD v61.
Cada bloco verifica que a substring antiga existe exactamente UMA vez
antes de substituir, para evitar edicoes silenciosamente erradas.
"""
import sys, re, pathlib

PATH = pathlib.Path("/sessions/great-brave-turing/mnt/outputs/mister-master-dddddd-v62-perf.html")
src = PATH.read_text()

def replace(old, new, label):
    occurrences = src.count(old)
    if occurrences != 1:
        print(f"[FAIL] {label}: encontrou {occurrences} ocorrencias (esperava 1)")
        sys.exit(1)
    return src.replace(old, new, 1), label

edits = []

# --- 1. canvas: adiciona aria-label ---
old = '  <canvas id="game"></canvas>'
new = '  <canvas id="game" role="img" aria-label="Mister Master DDDDDD jogo arcade"></canvas>'
src, lbl = replace(old, new, "1. aria-label no canvas")
edits.append(lbl)

# --- 2. const ctx -> let ctx (precisamos de poder trocar para o bgCanvas) ---
old = '    const ctx = canvas.getContext("2d");'
new = '    let ctx = canvas.getContext("2d");'
src, lbl = replace(old, new, "2. ctx const -> let")
edits.append(lbl)

# --- 3. declara lastFrameTime e companhia + reset state ---
old = '    let reduceFX = false;'
new = """    let reduceFX = false;

    // --- estado de timing / loop ---
    let lastFrameTime = 0;
    let deltaTime = 1;            // 1 = exactamente 60fps; >1 = frame mais lento
    let gameTime = 0;             // segundos-equivalentes a frames de 60fps
    let nextPipeAt = 0;
    let perfectPending = false;   // bloqueia colisoes durante o triggerPerfectEnd
    let rafId = null;

    // --- cache de fundo estatico ---
    let bgCanvas = null;
    let bgCanvasW = 0;
    let bgCanvasH = 0;"""
src, lbl = replace(old, new, "3. declara timing + bgCanvas state")
edits.append(lbl)

# --- 4. resize: novo DPR (chao = 1.0 em mobile, sem subpixel borrado) + montar bgCanvas ---
old = """    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      isMobile = w <= 760 || h > w;
      lowPowerMode = isMobile || isIOS;
      reduceFX = lowPowerMode;

      const dpr = Math.min(window.devicePixelRatio || 1, lowPowerMode ? 0.85 : 1.45);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);"""
new = """    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      isMobile = w <= 760 || h > w;
      lowPowerMode = isMobile || isIOS;
      reduceFX = lowPowerMode;

      // Resolucao: nunca abaixo de 1.0 em mobile (evita subpixel borrado).
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, lowPowerMode ? 1.0 : 1.5));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Pre-renderiza o ceu, skyline e vinheta para um canvas separado.
      // Estes elementos sao estaticos: nao mudam entre resizes, por isso so
      // os desenhamos uma vez aqui em vez de ~60 vezes por segundo no loop.
      bgCanvas = document.createElement("canvas");
      bgCanvas.width = canvas.width;
      bgCanvas.height = canvas.height;
      bgCanvasW = w;
      bgCanvasH = h;
      const bgCtx = bgCanvas.getContext("2d");
      bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const realCtx = ctx;
      ctx = bgCtx;
      drawArcadeSky();
      drawFixedHorizon();
      const vCache = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, Math.max(w, h) * .78);
      vCache.addColorStop(0, "rgba(255,255,255,0)");
      vCache.addColorStop(.58, "rgba(0,0,0,.10)");
      vCache.addColorStop(1, "rgba(0,0,0,.52)");
      ctx.fillStyle = vCache;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "rgba(255, 215, 170, .58)";
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx = realCtx;"""
src, lbl = replace(old, new, "4. resize: DPR>=1 + pre-render bgCanvas")
edits.append(lbl)

# --- 5. drawBackground: usa bgCanvas em vez de redesenhar tudo ---
old = """    function drawBackground() {
      // Fundo arcade limpo, sem chão e sem loops visíveis.
      // Céu fixo + silhueta distante + energia em movimento.
      drawArcadeSky();
      drawFixedHorizon();
      drawEnergyFlow();
      drawSoftSpeedLines();

      const v = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, Math.max(w, h) * .78);
      v.addColorStop(0, "rgba(255,255,255,0)");
      v.addColorStop(.58, "rgba(0,0,0,.10)");
      v.addColorStop(1, "rgba(0,0,0,.52)");
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(255, 215, 170, .58)";
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, w - 8, h - 8);
    }"""
new = """    function drawBackground() {
      // O ceu + skyline + vinheta + moldura sao estaticos e estao em bgCanvas
      // (renderizado uma unica vez em resize). So as camadas animadas mudam por frame.
      if (bgCanvas && bgCanvasW === w && bgCanvasH === h) {
        ctx.drawImage(bgCanvas, 0, 0, w, h);
      } else {
        drawArcadeSky();
        drawFixedHorizon();
      }
      drawEnergyFlow();
      drawSoftSpeedLines();
    }"""
src, lbl = replace(old, new, "5. drawBackground usa bgCanvas")
edits.append(lbl)

# --- 6. draw(): remove o frame-skip artificial e introduz delta-time ---
old = """    function draw(timestamp = 0) {
      if(lowPowerMode && timestamp && lastFrameTime && timestamp - lastFrameTime < 22) {
        requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = timestamp;

      ctx.clearRect(0,0,w,h);
      if(!gameStarted && !gameEnded) frame++;"""
new = """    function draw(timestamp = 0) {
      // Delta-time: 1.0 = 60fps. Limitado para evitar saltos enormes apos
      // pausa, lock screen ou troca de aba. Substitui o antigo frame-skip
      // que limitava artificialmente o jogo a ~45fps em mobile e fazia a
      // fisica parecer "meio presa" porque o movimento avancava por frame.
      const rawDt = lastFrameTime ? (timestamp - lastFrameTime) : 16.6667;
      lastFrameTime = timestamp;
      deltaTime = Math.min(Math.max(rawDt / 16.6667, 0.5), 2.2);

      ctx.clearRect(0,0,w,h);
      if(!gameStarted && !gameEnded) frame++;"""
src, lbl = replace(old, new, "6. draw: remove cap artificial, usa deltaTime")
edits.append(lbl)

# --- 7. draw(): pausa rAF quando gameEnded para poupar bateria ---
old = """      ctx.restore();

      requestAnimationFrame(draw);
    }

    function jump() {"""
new = """      ctx.restore();

      if (!gameEnded) {
        rafId = requestAnimationFrame(draw);
      } else {
        rafId = null;
        lastFrameTime = 0;
      }
    }

    function jump() {"""
src, lbl = replace(old, new, "7. draw: pausa rAF apos game over")
edits.append(lbl)

# --- 8. updateGame: aplica deltaTime + spawn baseado em tempo + bloqueia colisao em perfectPending ---
old = """    function updateGame() {
      if(!gameStarted || gameEnded) return;

      frame++;

      spawnChaosObject();

      player.velocity += player.gravity;
      player.y += player.velocity;

      const obstacleRate = Math.max((isMobile ? 126 : 112) - (score * 4), 44);
      if(frame % obstacleRate === 0) createPipe();

      pipes.forEach(pipe => {
        const progressiveSpeed = Math.min(score * .14, 2.3);
        const dangerBoost = score >= dangerScore ? Math.min((score - dangerScore) * .28, 3.0) : 0;

        pipe.x -= (isMobile ? 3.45 : 4.10) + progressiveSpeed + dangerBoost;

        drawPopup(pipe.x, -8, pipe.width, pipe.top+8, pipe.text);
        drawPopup(pipe.x, h-pipe.bottom, pipe.width, pipe.bottom+8, pipe.text);

        const hitbox = player.r * (isMobile ? .52 : .56);

        if(
          player.x + hitbox > pipe.x &&
          player.x - hitbox < pipe.x + pipe.width &&
          (player.y - hitbox < pipe.top || player.y + hitbox > h - pipe.bottom)
        ) {
          playSound(crashSound, 0.92 + Math.random() * 0.12);
          endGame(false);
        }"""
new = """    function updateGame() {
      if(!gameStarted || gameEnded) return;

      frame++;
      gameTime += deltaTime;

      spawnChaosObject();

      // Fisica agora escala com deltaTime: a velocidade percebida e' identica
      // em 30fps ou 120fps.
      player.velocity += player.gravity * deltaTime;
      player.y += player.velocity * deltaTime;

      // Spawn baseado em tempo, nao em contagem de frames.
      const obstacleRate = Math.max((isMobile ? 126 : 112) - (score * 4), 44);
      if(gameTime >= nextPipeAt) {
        nextPipeAt = gameTime + obstacleRate;
        createPipe();
      }

      // for() classico em vez de forEach() para podermos sair cedo se o jogo terminar.
      for (let pi = 0; pi < pipes.length; pi++) {
        const pipe = pipes[pi];
        const progressiveSpeed = Math.min(score * .14, 2.3);
        const dangerBoost = score >= dangerScore ? Math.min((score - dangerScore) * .28, 3.0) : 0;

        pipe.x -= ((isMobile ? 3.45 : 4.10) + progressiveSpeed + dangerBoost) * deltaTime;

        drawPopup(pipe.x, -8, pipe.width, pipe.top+8, pipe.text);
        drawPopup(pipe.x, h-pipe.bottom, pipe.width, pipe.bottom+8, pipe.text);

        const hitbox = player.r * (isMobile ? .52 : .56);

        // perfectPending: durante os 550ms antes do ecra de vitoria, ignoramos
        // colisoes para evitar que um crash de ultimo momento mostre o ecra normal.
        if(
          !perfectPending &&
          player.x + hitbox > pipe.x &&
          player.x - hitbox < pipe.x + pipe.width &&
          (player.y - hitbox < pipe.top || player.y + hitbox > h - pipe.bottom)
        ) {
          playSound(crashSound, 0.92 + Math.random() * 0.12);
          endGame(false);
          return;
        }"""
src, lbl = replace(old, new, "8. updateGame: deltaTime + for-loop + perfectPending")
edits.append(lbl)

# --- 9. updateGame: fecha o forEach -> }) com }; (manter ponto e virgula nao, so chave) ---
# Procurar o final do bloco do forEach que se segue
old = """          if(score >= maxScore) {
            triggerPerfectEnd();
          }
        }
      });

      pipes = pipes.filter(p => p.x + p.width > 0);
      player.y = Math.max(player.r, Math.min(h-player.r, player.y));
    }"""
new = """          if(score >= maxScore) {
            triggerPerfectEnd();
          }
        }
      }

      // Compactacao in-place em vez de .filter() (sem alocar novo array por frame).
      {
        let w_i = 0;
        for (let i = 0; i < pipes.length; i++) {
          if (pipes[i].x + pipes[i].width > 0) pipes[w_i++] = pipes[i];
        }
        pipes.length = w_i;
      }
      player.y = Math.max(player.r, Math.min(h-player.r, player.y));
    }"""
src, lbl = replace(old, new, "9. updateGame: fecha for-loop + compactacao in-place")
edits.append(lbl)

# --- 10. drawParticles: filter -> compactacao in-place ---
old = """      particles = particles.filter(p => p.life > 0);
      if(particles.length > (lowPowerMode ? 18 : 70)) {
        particles.splice(0, particles.length - (lowPowerMode ? 18 : 70));
      }
    }"""
new = """      // Compactacao in-place (mais barato que .filter()).
      let wp = 0;
      for (let i = 0; i < particles.length; i++) {
        if (particles[i].life > 0) particles[wp++] = particles[i];
      }
      particles.length = wp;
      const maxParticles = lowPowerMode ? 18 : 70;
      if(particles.length > maxParticles) {
        particles.splice(0, particles.length - maxParticles);
      }
    }"""
src, lbl = replace(old, new, "10. drawParticles: compactacao in-place")
edits.append(lbl)

# --- 11. drawChaosObjects: filter -> compactacao in-place ---
old = """      chaosObjects = chaosObjects.filter(o => o.y < h + 80);
    }"""
new = """      let wc = 0;
      for (let i = 0; i < chaosObjects.length; i++) {
        if (chaosObjects[i].y < h + 80) chaosObjects[wc++] = chaosObjects[i];
      }
      chaosObjects.length = wc;
    }"""
src, lbl = replace(old, new, "11. drawChaosObjects: compactacao in-place")
edits.append(lbl)

# --- 12. drawPlayer: shadowColor so quando reduceFX=false (evita custo em mobile) ---
old = """      const dynamicGlow = getDynamicGlow();

      ctx.shadowColor = dynamicGlow;
      ctx.shadowBlur = reduceFX ? 0 : 22;

      if(img && img.complete) {
        ctx.scale(1, squash);

        // Camada de glow atrás da personagem
        ctx.save();
        ctx.globalAlpha = 0.42;
        ctx.shadowColor = dynamicGlow;
        ctx.shadowBlur = reduceFX ? 0 : 32;
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();

        // Personagem principal
        ctx.shadowColor = dynamicGlow;
        ctx.shadowBlur = reduceFX ? 0 : 14;
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      } else {"""
new = """      const dynamicGlow = getDynamicGlow();

      // shadowColor + shadowBlur sao MUITO caros em Canvas2D no iOS.
      // Em reduceFX nao os configuramos de todo (mesmo com blur=0 ainda ha custo).
      if(!reduceFX) {
        ctx.shadowColor = dynamicGlow;
        ctx.shadowBlur = 22;
      }

      if(img && img.complete) {
        ctx.scale(1, squash);

        if(!reduceFX) {
          // Camada de glow atrás da personagem (so com efeitos ligados)
          ctx.save();
          ctx.globalAlpha = 0.42;
          ctx.shadowColor = dynamicGlow;
          ctx.shadowBlur = 32;
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
          ctx.restore();

          ctx.shadowColor = dynamicGlow;
          ctx.shadowBlur = 14;
        }
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      } else {"""
src, lbl = replace(old, new, "12. drawPlayer: skip shadowColor em reduceFX")
edits.append(lbl)

# --- 13. drawStartCharacter: mesma optimizacao ---
old = """      const dynamicGlow = getDynamicGlow();

      ctx.shadowColor = dynamicGlow;
      ctx.shadowBlur = isMobile ? 22 : 34;

      if(img && img.complete) {
        ctx.save();
        ctx.globalAlpha = 0.45;
        ctx.shadowColor = dynamicGlow;
        ctx.shadowBlur = reduceFX ? 0 : 44;
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();

        ctx.shadowColor = dynamicGlow;
        ctx.shadowBlur = reduceFX ? 0 : 18;
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      }"""
new = """      const dynamicGlow = getDynamicGlow();

      if(!reduceFX) {
        ctx.shadowColor = dynamicGlow;
        ctx.shadowBlur = isMobile ? 22 : 34;
      }

      if(img && img.complete) {
        if(!reduceFX) {
          ctx.save();
          ctx.globalAlpha = 0.45;
          ctx.shadowColor = dynamicGlow;
          ctx.shadowBlur = 44;
          ctx.drawImage(img, -size / 2, -size / 2, size, size);
          ctx.restore();

          ctx.shadowColor = dynamicGlow;
          ctx.shadowBlur = 18;
        }
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      }"""
src, lbl = replace(old, new, "13. drawStartCharacter: skip shadowColor em reduceFX")
edits.append(lbl)

# --- 14. triggerPerfectEnd: ativa flag perfectPending ---
old = """    function triggerPerfectEnd() {
      if(gameEnded) return;
      document.body.classList.add("danger");
      setTimeout(() => endGame(true), 550);
    }"""
new = """    function triggerPerfectEnd() {
      if(gameEnded || perfectPending) return;
      perfectPending = true;
      document.body.classList.add("danger");
      setTimeout(() => endGame(true), 550);
    }"""
src, lbl = replace(old, new, "14. triggerPerfectEnd: perfectPending guard")
edits.append(lbl)

# --- 15. restartGame: reset perfectPending + cancelScheduledValues no audio + relanca rAF ---
old = """      gameEnded = false;
      gameStarted = true;

      if(musicCtx && musicMaster) {
        musicMaster.gain.setTargetAtTime(0.095, musicCtx.currentTime, 0.12);
        setMusicMode("normal");
        if(!musicTimer) musicTimer = setInterval(playMusicStep, isMobile ? 220 : 165);
      }
    }"""
new = """      gameEnded = false;
      gameStarted = true;
      perfectPending = false;
      gameTime = 0;
      nextPipeAt = 0;
      lastFrameTime = 0;

      if(musicCtx && musicMaster) {
        // Cancela qualquer rampa de volume agendada pelo stopMusic anterior,
        // caso contrario o jogo recomeca em silencio.
        musicMaster.gain.cancelScheduledValues(musicCtx.currentTime);
        musicMaster.gain.setTargetAtTime(0.095, musicCtx.currentTime, 0.12);
        setMusicMode("normal");
        if(!musicTimer) musicTimer = setInterval(playMusicStep, isMobile ? 220 : 165);
      }

      // Relanca o rAF (foi parado em draw() quando gameEnded ficou true).
      if (rafId === null) {
        rafId = requestAnimationFrame(draw);
      }
    }"""
src, lbl = replace(old, new, "15. restartGame: reset estado + cancelScheduledValues + relanca rAF")
edits.append(lbl)

# --- 16. startGame: garante que rAF esta vivo ---
old = """      startMusic();
      gameEnded = false;
      if(pipes.length === 0) frame = 0;
    }"""
new = """      startMusic();
      gameEnded = false;
      perfectPending = false;
      gameTime = 0;
      nextPipeAt = 0;
      lastFrameTime = 0;
      if(pipes.length === 0) frame = 0;
    }"""
src, lbl = replace(old, new, "16. startGame: reset timing")
edits.append(lbl)

# --- 17. Teclado (space/up/w) ---
old = """    window.addEventListener("touchstart", (e) => {
      if(isInteractiveTarget(e.target)) return;
      e.preventDefault();
      lastTouchInputTime = performance.now();
      firstInput(e);
    }, { passive:false });"""
new = """    window.addEventListener("touchstart", (e) => {
      if(isInteractiveTarget(e.target)) return;
      e.preventDefault();
      lastTouchInputTime = performance.now();
      firstInput(e);
    }, { passive:false });

    // Suporte a teclado (desktop): espaco, seta cima, W.
    window.addEventListener("keydown", (e) => {
      if(isInteractiveTarget(e.target)) return;
      if(e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        firstInput(e);
      }
    });"""
src, lbl = replace(old, new, "17. teclado: space/up/w")
edits.append(lbl)

# --- 18. CSS: prefers-reduced-motion ---
# Inserir antes do fecho </style> (so ha um na head principal)
old = """    body.shake canvas {
      animation:shake .28s linear;
    }

    @keyframes shake {
      0%,100% { transform:translate(0,0); }
      20% { transform:translate(-10px,0); }
      40% { transform:translate(10px,0); }
      60% { transform:translate(-6px,0); }
      80% { transform:translate(6px,0); }
    }"""
new = """    body.shake canvas {
      animation:shake .28s linear;
    }

    @keyframes shake {
      0%,100% { transform:translate(0,0); }
      20% { transform:translate(-10px,0); }
      40% { transform:translate(10px,0); }
      60% { transform:translate(-6px,0); }
      80% { transform:translate(6px,0); }
    }

    /* Acessibilidade: respeita a preferencia do sistema operativo. */
    @media (prefers-reduced-motion: reduce) {
      body.danger canvas,
      body.shake canvas,
      body.danger #dangerOverlay,
      body.danger #warningText,
      #progressBar {
        animation: none !important;
        filter: none !important;
        transition: none !important;
      }
    }"""
src, lbl = replace(old, new, "18. CSS: prefers-reduced-motion")
edits.append(lbl)

PATH.write_text(src)
print("\nTodas as edicoes aplicadas:")
for e in edits:
    print(f"  [OK] {e}")
print(f"\nTotal: {len(edits)} alteracoes em {PATH}")
print(f"Tamanho final: {PATH.stat().st_size} bytes")
