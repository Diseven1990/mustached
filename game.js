const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");

    const winCharacterImage = "assets/player/win.webp";
    const koCharacterImage = "assets/player/ko.webp";

    const backgroundImage = new Image();
    backgroundImage.src = "assets/player/player_03.png";

    const characterFrameSources = [
      "assets/player/player_01.webp",
      "assets/player/player_02.webp",
      "assets/player/player_03.webp"
    ];

    const characterFrames = characterFrameSources.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });

    let currentCharacterFrame = 0;
    let moustacheFrameFloat = 0;
    let moustacheSpeed = 0.12;
    let lastTapTime = 0;

    let w = 0;
    let h = 0;
    let isMobile = false;
    let score = 0;
    let frame = 0;
    let gameStarted = false;
    let gameEnded = false;
    let dangerStarted = false;

    const maxScore = 15;
    const dangerScore = 10;

    const player = {
      x: 110,
      y: 260,
      r: 32,
      velocity: 0,
      gravity: 0.46,
      jump: -8.6,
      rotation: 0
    };

    let pipes = [];
    let particles = [];
    let chaosObjects = [];
    let bgFlowTime = 0;
    let bgLineTime = 0;
    let lowPowerMode = false;
    let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let reduceFX = false;

    function getDynamicGlow() {
      // Glow neon dinâmico inspirado nas cores do fundo.
      // Alterna suavemente entre azul, rosa, laranja e verde.
      const hue = (frame * 1.8 + player.y * 0.15) % 360;
      return `hsla(${hue}, 95%, 64%, 0.95)`;
    }

    const defeatPhrases = [
      "Foste apanhado por um bug.",
      "O prazo ganhou esta ronda.",
      "Erro entre a cadeira e o teclado.",
      "Crashou antes da glória.",
      "Faltou só mais um bocadinho de XP.",
      "O bug era mais forte do que parecia."
    ];

    function trackGameEvent(name, data = {}) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: name,
        game: "Mister Master DDDDDD",
        ...data
      });

      try {
        window.dispatchEvent(new CustomEvent(name, { detail: data }));
      } catch(e) {}

      console.log("[Mister Master DDDDDD]", name, data);
    }

    function updateProgress() {
      const bar = document.getElementById("progressBar");
      if(!bar) return;
      const pct = Math.max(0, Math.min(100, (score / maxScore) * 100));
      bar.style.width = pct + "%";
    }

    const jumpSound = document.getElementById("jumpSound");
    const crashSound = document.getElementById("crashSound");
    const nearSound = document.getElementById("nearSound");

    jumpSound.volume = 0.55;
    crashSound.volume = 0.72;
    nearSound.volume = 0.45;

    let lastNearSound = 0;

    function playSound(sound, rate = 1) {
      try {
        sound.pause();
        sound.currentTime = 0;
        sound.playbackRate = rate;
        sound.play().catch(() => {});
      } catch(e) {}
    }

    // Música gerada por código: synthwave/arcade leve.
    // Não usa ficheiros externos e só arranca depois do primeiro toque.
    let musicCtx = null;
    let musicMaster = null;
    let musicFilter = null;
    let musicDelay = null;
    let musicFeedback = null;
    let musicStarted = false;
    let musicStep = 0;
    let musicTimer = null;
    let musicMode = "normal";

    const musicScale = [220, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
    const bassPattern = [0, 0, 3, 0, 4, 3, 0, 5];
    const leadPattern = [4, 5, 4, 2, 3, 4, 6, 4, 5, 3, 2, 1, 0, 2, 3, 4];

    function initMusic() {
      if(musicStarted) return;

      try {
        musicCtx = new (window.AudioContext || window.webkitAudioContext)();

        musicMaster = musicCtx.createGain();
        musicMaster.gain.value = 0.04;

        musicFilter = musicCtx.createBiquadFilter();
        musicFilter.type = "lowpass";
        musicFilter.frequency.value = 1400;
        musicFilter.Q.value = 0.8;

        musicDelay = musicCtx.createDelay();
        musicDelay.delayTime.value = 0.18;

        musicFeedback = musicCtx.createGain();
        musicFeedback.gain.value = 0.16;

        musicDelay.connect(musicFeedback);
        musicFeedback.connect(musicDelay);

        musicFilter.connect(musicDelay);
        musicDelay.connect(musicMaster);
        musicFilter.connect(musicMaster);
        musicMaster.connect(musicCtx.destination);

        musicStarted = true;
      } catch(e) {
        musicStarted = false;
        return;
      }
    }

    function startMusic() {
      if(lowPowerMode) return;
      if(!musicStarted) initMusic();
      if(!musicCtx) return;

      if(musicCtx.state === "suspended") musicCtx.resume();

      if(musicTimer) return;

      musicTimer = setInterval(playMusicStep, isMobile ? 220 : 165);
    }

    function stopMusic() {
      if(musicTimer) {
        clearInterval(musicTimer);
        musicTimer = null;
      }

      if(musicMaster && musicCtx) {
        musicMaster.gain.cancelScheduledValues(musicCtx.currentTime);
        musicMaster.gain.setTargetAtTime(0.0001, musicCtx.currentTime, 0.08);
      }
    }

    function setMusicMode(mode) {
      if(musicMode === mode) return;
      musicMode = mode;

      if(!musicCtx || !musicFilter || !musicMaster) return;

      if(mode === "chaos") {
        musicFilter.frequency.setTargetAtTime(2200, musicCtx.currentTime, 0.25);
        musicMaster.gain.setTargetAtTime(0.055, musicCtx.currentTime, 0.20);
      } else {
        musicFilter.frequency.setTargetAtTime(1400, musicCtx.currentTime, 0.25);
        musicMaster.gain.setTargetAtTime(0.04, musicCtx.currentTime, 0.20);
      }
    }

    function playMusicStep() {
      if(!musicCtx || gameEnded) return;

      const t = musicCtx.currentTime;
      const chaos = score >= dangerScore;
      const bpmPush = chaos ? 1.18 : 1;

      if(chaos) setMusicMode("chaos");

      const step = musicStep % 16;

      if(step % 2 === 0) {
        const bassIndex = bassPattern[(musicStep / 2) % bassPattern.length];
        const freq = musicScale[bassIndex] / 2;
        synthNote(freq, 0.13 / bpmPush, "triangle", chaos ? 0.065 : 0.05, 0.02);
      }

      if(step % (chaos ? 2 : 4) === 0) {
        const leadIndex = leadPattern[musicStep % leadPattern.length];
        const freq = musicScale[leadIndex] * (chaos ? 2 : 1);
        synthNote(freq, chaos ? 0.075 : 0.095, "square", chaos ? 0.026 : 0.018, 0.006);
      }

      if(chaos && step % 3 === 0) {
        glitchTick();
      }

      musicStep++;
    }

    function synthNote(freq, duration, type, volume, attack = 0.008) {
      if(!musicCtx || !musicFilter) return;

      const osc = musicCtx.createOscillator();
      const gain = musicCtx.createGain();

      osc.type = type;
      osc.frequency.value = freq;

      const now = musicCtx.currentTime;
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(volume, now + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(musicFilter);

      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    function glitchTick() {
      if(!musicCtx || !musicFilter) return;

      const bufferSize = musicCtx.sampleRate * 0.035;
      const buffer = musicCtx.createBuffer(1, bufferSize, musicCtx.sampleRate);
      const data = buffer.getChannelData(0);

      for(let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
      }

      const source = musicCtx.createBufferSource();
      const gain = musicCtx.createGain();
      gain.gain.value = 0.015;

      source.connect(gain);
      gain.connect(musicFilter);
      source.start();
    }

    function playWinMusicHit() {
      if(lowPowerMode || !musicCtx) return;

      const now = musicCtx.currentTime;
      setMusicMode("chaos");

      [392, 523.25, 659.25, 783.99].forEach((freq, i) => {
        setTimeout(() => {
          synthNote(freq, 0.20, "triangle", 0.06, 0.01);
        }, i * 55);
      });

      setTimeout(() => {
        if(musicMaster && musicCtx) {
          musicMaster.gain.setTargetAtTime(0.025, musicCtx.currentTime, 0.4);
        }
      }, 420);
    }




    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      isMobile = w <= 760 || h > w;
      lowPowerMode = isMobile || isIOS;
      reduceFX = lowPowerMode;

      const dpr = Math.min(window.devicePixelRatio || 1, lowPowerMode ? 0.70 : 1.25);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      player.r = isMobile ? 30 : 34;
      player.gravity = isMobile ? 0.35 : 0.44;
      player.jump = isMobile ? -7.0 : -8.2;
      if(!gameStarted) {
        player.x = w * 0.50;
      } else {
        player.x = isMobile ? Math.max(92, Math.min(135, w * 0.28)) : Math.max(135, Math.min(190, w * 0.24));
      }
      if(!gameStarted) player.y = h * (isMobile ? 0.46 : 0.42);
    }

    function mascotSVG(dead=false) {
      return characterFrameSources[0];
    }

    function drawBackground() {
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
    }

    function drawArcadeSky() {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, "#0b1020");
      sky.addColorStop(.36, "#17243b");
      sky.addColorStop(.72, "#202b3d");
      sky.addColorStop(1, "#090d15");
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      const glow = ctx.createRadialGradient(w * .72, h * .22, 10, w * .72, h * .22, h * .36);
      glow.addColorStop(0, "rgba(255, 154, 70, .28)");
      glow.addColorStop(.42, "rgba(255, 74, 160, .10)");
      glow.addColorStop(1, "rgba(255, 74, 120, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      ctx.save();

      // Pontos fixos, sem animação, para evitar qualquer snap.
      for(let i = 0; i < 48; i++) {
        const x = ((i * 137) % 1000) / 1000 * w;
        const y = ((i * 83) % 620) / 620 * h * .62;
        const size = (i % 5 === 0) ? 2 : 1;

        ctx.globalAlpha = .16 + (i % 5) * .045;
        ctx.fillStyle = i % 3 === 0 ? "#ff9f45" : "#bcd8ec";
        ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
      }

      ctx.globalAlpha = .045;
      ctx.strokeStyle = "#d8eaff";
      ctx.lineWidth = 1;

      const grid = 48;
      for(let x = 0; x < w; x += grid) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }

      for(let y = 0; y < h; y += grid) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawFixedHorizon() {
      const baseY = h * .74;

      ctx.save();

      const skyline = [
        {x:.00,w:.10,h:.20},{x:.09,w:.07,h:.15},{x:.17,w:.12,h:.27},
        {x:.28,w:.08,h:.18},{x:.36,w:.11,h:.30},{x:.48,w:.07,h:.21},
        {x:.56,w:.12,h:.33},{x:.69,w:.08,h:.19},{x:.77,w:.13,h:.26},
        {x:.91,w:.09,h:.22}
      ];

      skyline.forEach((b, i) => {
        const x = w * b.x;
        const bw = w * b.w;
        const bh = h * b.h;
        const y = baseY - bh;

        const g = ctx.createLinearGradient(x, y, x + bw, y);
        g.addColorStop(0, "rgba(6,10,18,.60)");
        g.addColorStop(.55, "rgba(16,22,34,.78)");
        g.addColorStop(1, "rgba(4,7,13,.64)");

        ctx.fillStyle = g;
        ctx.fillRect(x, y, bw, bh);

        ctx.fillStyle = "rgba(155,190,215,.045)";
        for(let wy = y + 18; wy < baseY - 10; wy += 24) {
          for(let wx = x + 10; wx < x + bw - 10; wx += 20) {
            ctx.fillRect(wx, wy, 4, 7);
          }
        }

        if(i % 3 === 0) {
          ctx.strokeStyle = "rgba(170,205,225,.10)";
          ctx.beginPath();
          ctx.moveTo(x + bw * .52, y);
          ctx.lineTo(x + bw * .52, y - 16);
          ctx.stroke();
        }
      });

      const line = ctx.createLinearGradient(0, baseY, w, baseY);
      line.addColorStop(0, "rgba(0,210,255,0)");
      line.addColorStop(.5, "rgba(255,132,54,.38)");
      line.addColorStop(1, "rgba(255,70,180,0)");
      ctx.fillStyle = line;
      ctx.fillRect(0, baseY - 2, w, 3);

      ctx.fillStyle = "rgba(4,7,12,.62)";
      ctx.fillRect(0, baseY, w, h - baseY);

      ctx.restore();
    }

    function drawEnergyFlow() {
      // Camadas orgânicas que se movem sem reset visível.
      // Não há blocos, estrada ou tiles.
      ctx.save();

      const activeSpeed = gameStarted ? 1 + Math.min(score * .035, .55) : .22;
      bgFlowTime += .018 * activeSpeed;
      const t = bgFlowTime;

      for(let layer = 0; layer < 4; layer++) {
        const yBase = h * (.35 + layer * .13);
        const amp = h * (.018 + layer * .004);
        const phase = t * (1.0 + layer * .22) + layer * 1.7;

        ctx.beginPath();
        ctx.moveTo(0, yBase);

        for(let x = 0; x <= w; x += 18) {
          const y =
            yBase +
            Math.sin(x * .010 + phase) * amp +
            Math.sin(x * .023 + phase * .7) * amp * .45;

          ctx.lineTo(x, y);
        }

        ctx.strokeStyle = layer % 2 === 0
          ? `rgba(80,210,255,${.12 - layer * .015})`
          : `rgba(255,120,70,${.12 - layer * .015})`;

        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawSoftSpeedLines() {
      if(!gameStarted || reduceFX) return;

      ctx.save();

      // Versão sem objetos em loop.
      // Em vez de elementos que entram/saem e reiniciam, usa linhas contínuas
      // com movimento baseado em ondas. Assim não há ponto de reset visível.
      const activeSpeed = 1 + Math.min(score * .045, .75);
      bgLineTime += .030 * activeSpeed;
      const t = bgLineTime;

      const energyLines = reduceFX ? 0 : 7;
      for(let i = 0; i < energyLines; i++) {
        const baseY = h * (.12 + i * .072);
        const amp = 8 + (i % 4) * 4;
        const phase = t * (1.2 + i * .08) + i * 0.9;

        ctx.beginPath();

        for(let x = -40; x <= w + 40; x += 28) {
          const y =
            baseY +
            Math.sin(x * .012 + phase) * amp +
            Math.sin(x * .031 + phase * .72) * amp * .32;

          if(x === -40) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        const alpha = .045 + (i % 5) * .012;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = i % 3 === 0 ? "#ff8436" : "#8ed8ff";
        ctx.lineWidth = i % 4 === 0 ? 2 : 1;
        ctx.stroke();
      }

      // Pequenos glows contínuos, também sem reset de posição.
      const glowDots = reduceFX ? 0 : 4;
      for(let i = 0; i < glowDots; i++) {
        const x = w * ((i + 1) / 11);
        const y =
          h * (.18 + ((i * 17) % 60) / 100) +
          Math.sin(t * 2 + i) * 16;

        const pulse = .10 + Math.sin(t * 3 + i * 1.3) * .045;

        ctx.globalAlpha = pulse;
        ctx.fillStyle = i % 2 === 0 ? "#8ed8ff" : "#ff8436";
        ctx.beginPath();
        ctx.arc(x, y, 2.2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawMovingPanels() {
      // Desativado nesta versão.
    }

    function drawPlayer() {
      ctx.save();

      ctx.translate(player.x, player.y);

      player.rotation = Math.max(-.45, Math.min(.55, player.velocity * .035));

      // Animação do bigode como asas:
      // quanto mais rápido o utilizador toca, mais depressa os frames avançam.
      moustacheFrameFloat += moustacheSpeed;
      currentCharacterFrame = Math.floor(moustacheFrameFloat) % characterFrames.length;
      moustacheSpeed += (0.14 - moustacheSpeed) * 0.035;

      const wingFlap = Math.sin(moustacheFrameFloat * 1.2) * 0.055;
      ctx.rotate(player.rotation + wingFlap);

      const img = characterFrames[currentCharacterFrame];
      const size = player.r * (lowPowerMode ? 2.55 : 3.05);
      const squash = 1 + Math.sin(moustacheFrameFloat * 1.2) * 0.025;

      const dynamicGlow = getDynamicGlow();

      ctx.shadowColor = dynamicGlow;
      ctx.shadowBlur = reduceFX ? 0 : 12;

      if(img && img.complete) {
        ctx.scale(1, squash);

        // Camada de glow atrás da personagem
        ctx.save();
        ctx.globalAlpha = 0.42;
        ctx.shadowColor = dynamicGlow;
        ctx.shadowBlur = reduceFX ? 0 : 16;
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
        ctx.restore();

        // Personagem principal
        ctx.shadowColor = dynamicGlow;
        ctx.shadowBlur = reduceFX ? 0 : 8;
        ctx.drawImage(img, -size / 2, -size / 2, size, size);
      } else {
        ctx.fillStyle = "#ff7100";
        ctx.beginPath();
        ctx.arc(0, 0, player.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      if(gameStarted && !gameEnded && frame % (isMobile ? 7 : 4) === 0) {
        addParticles(player.x - 34, player.y + 8, 1);
      }
    }

    function addParticles(x,y,n=8) {
      if(lowPowerMode) n = 0;

      for(let i=0;i<n;i++) {
        particles.push({
          x, y,
          vx: -Math.random()*8 - 1,
          vy: (Math.random()-.5)*6,
          life: 25 + Math.random()*10,
          size: Math.random()*3 + 1.5
        });
      }
    }

    function drawParticles() {
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;

        ctx.globalAlpha = Math.max(p.life/35, 0);
        ctx.fillStyle = "#ff7100";
        ctx.fillRect(p.x, p.y, p.size*2, p.size);
        ctx.globalAlpha = 1;
      });

      particles = particles.filter(p => p.life > 0);
      if(particles.length > (lowPowerMode ? 18 : 70)) {
        particles.splice(0, particles.length - (lowPowerMode ? 18 : 70));
      }
    }

    function createPipe() {
      const baseGap = isMobile ? 455 : 390;
      const gap = Math.max(baseGap - (score * 9), isMobile ? 225 : 210);

      const minTop = 82;
      const maxTop = Math.max(110, h - gap - 120);
      const top = Math.random() * (maxTop - minTop) + minTop;

      pipes.push({
        x: w + 65,
        width: isMobile ? 210 : 220,
        top,
        bottom: h - (top + gap),
        scored: false,
        text: popupTexts[Math.floor(Math.random() * popupTexts.length)]
      });
    }

    const popupTexts = [
      "BUG\\nnão identificado.",
      "404\\nNot Found",
      "PRAZO AMANHÃ\\nboa sorte ;)",
      "CRASH\\nO programa parou de funcionar.",
      "CARREGANDO\\nEXCUSES...",
      "SEM CAFÉ\\nFatal error."
    ];

    function drawErrorIcon(cx, cy, type) {
      if(type.includes("PRAZO")) {
        ctx.fillStyle = "#f6d126";
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx,cy-22);
        ctx.lineTo(cx-24,cy+22);
        ctx.lineTo(cx+24,cy+22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#111";
        ctx.font = "900 28px Courier New";
        ctx.fillText("!", cx-7, cy+14);
      } else if(type.includes("CRASH")) {
        ctx.fillStyle = "#111";
        ctx.beginPath();
        ctx.arc(cx,cy,23,0,Math.PI*2);
        ctx.fill();

        ctx.fillStyle = "#d8d2c8";
        ctx.fillRect(cx-11,cy-7,7,7);
        ctx.fillRect(cx+5,cy-7,7,7);
        ctx.fillRect(cx-5,cy+8,10,7);
      } else {
        ctx.fillStyle = "#c81919";
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx,cy,23,0,Math.PI*2);
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(cx-10,cy-10);
        ctx.lineTo(cx+10,cy+10);
        ctx.moveTo(cx+10,cy-10);
        ctx.lineTo(cx-10,cy+10);
        ctx.stroke();
      }
    }

    function fitText(text, maxWidth, startSize, minSize = 10, weight = "900") {
      let size = startSize;

      while(size > minSize) {
        ctx.font = `${weight} ${size}px Courier New`;
        if(ctx.measureText(text).width <= maxWidth) return size;
        size--;
      }

      return minSize;
    }

    function drawWrappedLine(text, x, y, maxWidth, lineHeight, maxLines = 2) {
      const words = text.split(" ");
      const lines = [];
      let current = "";

      words.forEach(word => {
        const test = current ? current + " " + word : word;
        if(ctx.measureText(test).width <= maxWidth) {
          current = test;
        } else {
          if(current) lines.push(current);
          current = word;
        }
      });

      if(current) lines.push(current);

      const finalLines = lines.slice(0, maxLines);

      if(lines.length > maxLines) {
        let last = finalLines[finalLines.length - 1];
        while(ctx.measureText(last + "...").width > maxWidth && last.length > 2) {
          last = last.slice(0, -1);
        }
        finalLines[finalLines.length - 1] = last + "...";
      }

      finalLines.forEach((line, index) => {
        ctx.fillText(line, x, y + index * lineHeight);
      });
    }

    function drawPopup(x,y,width,height,text) {
      if(height <= 52) return;

      const lines = text.split("\\n");
      const title = lines[0];
      const body = lines[1] || "";
      const compact = height < 145 || width < 185;

      ctx.save();

      ctx.shadowColor = "rgba(0,0,0,.75)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 5;

      ctx.fillStyle = "#d8d2c8";
      ctx.strokeStyle = "#070707";
      ctx.lineWidth = 4;
      ctx.fillRect(x,y,width,height);
      ctx.strokeRect(x,y,width,height);

      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Barra superior
      ctx.fillStyle = title.includes("CRASH") ? "#9c1111" : "#073f9c";
      ctx.fillRect(x+4,y+4,width-8,33);

      const closeSize = 21;
      const closeX = x + width - closeSize - 10;
      const titleMaxWidth = Math.max(40, width - 58);

      ctx.fillStyle = "#fff";
      const topTitle =
        title.includes("404") ? "404 Error" :
        title.includes("PRAZO") ? "PRAZO" :
        title.includes("CARREGANDO") ? "Aguarde..." :
        title.includes("CRASH") ? "CRASH" :
        title.includes("SEM CAFÉ") ? "SEM CAFÉ" :
        "Erro";

      const titleSize = fitText(topTitle, titleMaxWidth, 16, 10);
      ctx.font = `900 ${titleSize}px Courier New`;
      ctx.fillText(topTitle, x+12, y+25);

      ctx.fillStyle = "#c9c3b8";
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.fillRect(closeX, y+8, closeSize, closeSize);
      ctx.strokeRect(closeX, y+8, closeSize, closeSize);

      ctx.fillStyle = "#111";
      ctx.font = "900 18px Courier New";
      ctx.fillText("×", closeX + 5, y+25);

      const contentTop = y + 48;
      const contentBottom = y + height - 16;
      const contentHeight = Math.max(20, contentBottom - contentTop);
      const centerY = contentTop + contentHeight / 2;

      const iconSpace = compact ? 0 : 62;
      const textX = compact ? x + width / 2 : x + iconSpace + 16;
      const textMaxWidth = compact ? width - 24 : width - iconSpace - 28;

      if(!compact && !title.includes("404") && !title.includes("CARREGANDO")) {
        drawErrorIcon(x+42, centerY - 4, title);
      }

      ctx.fillStyle = "#111";
      ctx.textAlign = compact ? "center" : "left";

      if(title.includes("404")) {
        const bigSize = fitText("404", width - 30, compact ? 48 : 54, 26);
        ctx.font = `900 ${bigSize}px Courier New`;
        ctx.fillText("404", compact ? x+width/2 : x+width/2, centerY - 4);

        const smallText = "Not Found";
        const smallSize = fitText(smallText, width - 30, 17, 11);
        ctx.font = `900 ${smallSize}px Courier New`;
        ctx.fillText(smallText, x+width/2, centerY + Math.max(24, bigSize * .46));

      } else if(title.includes("CARREGANDO")) {
        const label = "CARREGANDO EXCUSES...";
        const labelSize = fitText(label, width - 34, 15, 10);
        ctx.font = `900 ${labelSize}px Courier New`;
        ctx.fillText(label, x + width/2, centerY - 18);

        const barW = Math.max(50, width - 60);
        const barX = x + (width - barW) / 2;
        const barY = centerY + 4;

        ctx.strokeRect(barX, barY, barW, 16);
        ctx.fillStyle = "#073f9c";
        ctx.fillRect(barX + 3, barY + 3, (barW - 6) * .42, 10);

        ctx.fillStyle = "#111";
        const percentSize = fitText("42%", width - 30, 14, 10);
        ctx.font = `900 ${percentSize}px Courier New`;
        ctx.fillText("42%", x + width/2, barY + 38);

      } else {
        const titleMax = textMaxWidth;
        const mainSize = fitText(title, titleMax, compact ? 18 : 21, 12);
        ctx.font = `900 ${mainSize}px Courier New`;

        if(compact) {
          drawWrappedLine(title, textX, centerY - 4, titleMax, mainSize + 4, 2);
        } else {
          ctx.fillText(title, textX, centerY - 8);
        }

        if(body) {
          const bodySize = fitText(body, textMaxWidth, compact ? 12 : 14, 10, "700");
          ctx.font = `700 ${bodySize}px Courier New`;

          if(compact) {
            drawWrappedLine(body, textX, centerY + mainSize + 12, textMaxWidth, bodySize + 4, 2);
          } else {
            drawWrappedLine(body, textX, centerY + 18, textMaxWidth, bodySize + 4, 2);
          }
        }
      }

      if(!compact && !title.includes("404") && !title.includes("CARREGANDO") && height > 130) {
        const okW = 62;
        const okH = 25;
        const okX = x + width/2 - okW/2;
        const okY = y + height - 42;

        ctx.fillStyle = "#d8d2c8";
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.fillRect(okX, okY, okW, okH);
        ctx.strokeRect(okX, okY, okW, okH);

        ctx.fillStyle = "#111";
        ctx.font = "900 15px Courier New";
        ctx.textAlign = "center";
        ctx.fillText("OK", x + width/2, okY + 17);
      }

      ctx.textAlign = "left";
      ctx.restore();
    }

    function spawnChaosObject() {
      if(score < dangerScore || gameEnded) return;
      if(frame % (lowPowerMode ? 70 : 18) !== 0) return;
      if(chaosObjects.length > (lowPowerMode ? 1 : 10)) return;

      chaosObjects.push({
        x: Math.random() * w,
        y: -40,
        vy: 3 + Math.random() * 5 + Math.max(0, score - dangerScore) * .28,
        vx: (Math.random() - .5) * 2,
        size: 28 + Math.random() * 34,
        text: ["404", "BUG", "ERR", "CRASH", "D!"][Math.floor(Math.random() * 5)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - .5) * .12
      });
    }

    function drawChaosObjects() {
      chaosObjects.forEach(o => {
        o.x += o.vx;
        o.y += o.vy;
        o.rot += o.vr;

        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.rot);

        ctx.fillStyle = "#d8d2c8";
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 3;
        ctx.fillRect(-o.size/2, -o.size/2, o.size, o.size * .72);
        ctx.strokeRect(-o.size/2, -o.size/2, o.size, o.size * .72);

        ctx.fillStyle = "#9c1111";
        ctx.fillRect(-o.size/2 + 3, -o.size/2 + 3, o.size - 6, 10);

        ctx.fillStyle = "#111";
        ctx.font = "900 12px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(o.text, 0, 8);
        ctx.textAlign = "left";

        ctx.restore();
      });

      chaosObjects = chaosObjects.filter(o => o.y < h + 80);
    }

    function updateGame() {
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

        pipe.x -= (isMobile ? 2.55 : 3.95) + progressiveSpeed + dangerBoost;

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
        }


        const nearZone = 34;

        if(
          pipe.x + pipe.width > player.x - nearZone &&
          pipe.x + pipe.width < player.x + nearZone &&
          (
            Math.abs((player.y - player.r) - pipe.top) < 24 ||
            Math.abs((h - pipe.bottom) - (player.y + player.r)) < 24
          )
        ) {
          if(frame - lastNearSound > 18) {
            lastNearSound = frame;
            playSound(nearSound, 0.95 + Math.random() * 0.1);
          }
        }

        if(!pipe.scored && pipe.x + pipe.width < player.x) {
          pipe.scored = true;
          score++;
          document.getElementById("score").innerText = score;
          updateProgress();
          addParticles(player.x, player.y, 16);

          if(score >= dangerScore && !dangerStarted) {
            dangerStarted = true;
            document.body.classList.add("danger");
            setMusicMode("chaos");
          }

          if(score >= maxScore) {
            triggerPerfectEnd();
          }
        }
      });

      pipes = pipes.filter(p => p.x + p.width > 0);
      player.y = Math.max(player.r, Math.min(h-player.r, player.y));
    }

    function drawStartCharacter() {
      // Ecrã estático antes do primeiro toque:
      // o personagem fica parado ao centro, só o bigode/animação mexe.
      const x = w * 0.5;
      const y = h * 0.47;
      const r = isMobile ? 54 : 68;

      moustacheFrameFloat += 0.28;
      currentCharacterFrame = Math.floor(moustacheFrameFloat) % characterFrames.length;

      const img = characterFrames[currentCharacterFrame];
      const wingFlap = Math.sin(moustacheFrameFloat * 1.2) * 0.045;
      const floatY = Math.sin(frame * 0.035) * 4;
      const size = r * 3.25;

      ctx.save();
      ctx.translate(x, y + floatY);
      ctx.rotate(wingFlap);

      const dynamicGlow = getDynamicGlow();

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
      }

      ctx.restore();
    }

    function draw(timestamp = 0) {
      if(lowPowerMode && timestamp && lastFrameTime && timestamp - lastFrameTime < 28) {
        requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = timestamp;

      ctx.clearRect(0,0,w,h);
      if(!gameStarted && !gameEnded) frame++;

      const zoom = score >= dangerScore && !gameEnded ? 1 + Math.min((score - dangerScore) * .012, .10) : 1;

      ctx.save();
      ctx.translate(w/2, h/2);
      ctx.scale(zoom, zoom);
      ctx.translate(-w/2, -h/2);

      drawBackground();
      drawParticles();
      drawChaosObjects();

      if(gameStarted) {
        drawPlayer();
      } else {
        drawStartCharacter();
      }

      updateGame();

      ctx.restore();

      requestAnimationFrame(draw);
    }

    function jump() {
      if(!gameStarted || gameEnded) return;

      const now = performance.now();
      const interval = lastTapTime ? now - lastTapTime : 420;
      lastTapTime = now;

      // Toques rápidos = bigode a bater muito rápido.
      if(interval < 130) {
        moustacheSpeed = 1.45;
      } else if(interval < 220) {
        moustacheSpeed = 1.05;
      } else if(interval < 360) {
        moustacheSpeed = 0.72;
      } else {
        moustacheSpeed = 0.38;
      }

      player.velocity = player.jump;
      if(!lowPowerMode && frame % 2 === 0) {
        addParticles(player.x-42, player.y+18, 4);
      }

      if(!lowPowerMode || interval > 240) {
        playSound(jumpSound, 0.98);
      }
    }

    function startGame(event) {
      if(event) event.stopPropagation();

      document.body.classList.add("playing");
      const startScreen = document.getElementById("startScreen");
      if(startScreen) startScreen.style.display = "none";
      gameStarted = true;
      player.x = isMobile ? Math.max(92, Math.min(135, w * 0.28)) : Math.max(135, Math.min(190, w * 0.24));
      trackGameEvent("mister_game_play", { score });
      startMusic();
      gameEnded = false;
      if(pipes.length === 0) frame = 0;
    }

    function triggerPerfectEnd() {
      if(gameEnded) return;
      document.body.classList.add("danger");
      setTimeout(() => endGame(true), 550);
    }

    function endGame(perfect=false) {
      if(gameEnded) return;
      gameEnded = true;

      if(!(perfect || score >= maxScore)) {
        stopMusic();
      }

      document.body.classList.add("shake");
      setTimeout(() => document.body.classList.remove("shake"), 300);

      const gameOver = document.getElementById("gameOver");
      const normalEnd = document.getElementById("normalEnd");
      const perfectEnd = document.getElementById("perfectEnd");

      gameOver.classList.add("active");
      gameOver.style.display = "block";

      normalEnd.classList.remove("active");
      perfectEnd.classList.remove("active");
      normalEnd.style.display = "none";
      perfectEnd.style.display = "none";

      if(perfect || score >= maxScore) {
        perfectEnd.classList.add("active");
        perfectEnd.style.display = "flex";
        setupPerfectEnding();
        playWinMusicHit();
      } else {
        document.getElementById("normalScore").innerText = score;
        const koImg = document.querySelector(".koCharacter");
        if(koImg) koImg.src = koCharacterImage;
        normalEnd.classList.add("active");
        normalEnd.style.display = "flex";
      }
    }

    function setupPerfectEnding() {
      const perfectEnd = document.getElementById("perfectEnd");
      const winImg = document.querySelector(".winCharacter");
      if(winImg) winImg.src = winCharacterImage;

      if(perfectEnd) {
        perfectEnd.classList.remove("ctaReady");
        setTimeout(() => perfectEnd.classList.add("ctaReady"), 300);
      }
    }

    function restartGame(event) {
      if(event) event.stopPropagation();

      pipes = [];
      particles = [];
      chaosObjects = [];
      score = 0;
      frame = 0;
      dangerStarted = false;
      moustacheSpeed = 0.12;
      moustacheFrameFloat = 0;
      currentCharacterFrame = 0;
      lastTapTime = 0;
      bgFlowTime = 0;
      bgLineTime = 0;

      player.x = isMobile ? Math.max(92, Math.min(135, w * 0.28)) : Math.max(135, Math.min(190, w * 0.24));
      player.y = isMobile ? h * .28 : h * .32;
      player.velocity = 0;

      document.body.classList.remove("danger");
      document.body.classList.remove("ended");
      document.body.classList.add("playing");
      document.getElementById("score").innerText = "0";
      updateProgress();
      document.getElementById("perfectEnd").classList.remove("ctaReady");
      const go = document.getElementById("gameOver");
      const ne = document.getElementById("normalEnd");
      const pe = document.getElementById("perfectEnd");

      go.classList.remove("active");
      ne.classList.remove("active");
      pe.classList.remove("active");

      go.style.display = "none";
      ne.style.display = "none";
      pe.style.display = "none";

      gameEnded = false;
      gameStarted = true;

      if(musicCtx && musicMaster) {
        musicMaster.gain.setTargetAtTime(0.04, musicCtx.currentTime, 0.12);
        setMusicMode("normal");
        if(!musicTimer) musicTimer = setInterval(playMusicStep, isMobile ? 220 : 165);
      }
    }

    document.getElementById("retryButton").addEventListener("click", restartGame);

    window.addEventListener("resize", resize);
    let lastTouchInputTime = 0;

    function isInteractiveTarget(target) {
      return target && (
        target.tagName === "BUTTON" ||
        target.closest("button") ||
        target.closest("#gameOver")
      );
    }

    function firstInput(e) {
      if(e && isInteractiveTarget(e.target)) return;
      if(gameEnded) return;

      if(!gameStarted) {
        startGame();
        jump();
        return;
      }

      jump();
    }

    window.addEventListener("click", (e) => {
      if(performance.now() - lastTouchInputTime < 420) return;
      firstInput(e);
    });

    window.addEventListener("touchstart", (e) => {
      if(isInteractiveTarget(e.target)) return;
      e.preventDefault();
      lastTouchInputTime = performance.now();
      firstInput(e);
    }, { passive:false });
resize();
    updateProgress();
    draw();