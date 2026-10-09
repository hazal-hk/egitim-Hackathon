// ═══════ Partikuller ═══════
        (function createParticles() {
            const container = document.getElementById('partikuller');
            for (let i = 0; i < 30; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                p.style.left = Math.random() * 100 + '%';
                p.style.animationDuration = (8 + Math.random() * 14) + 's';
                p.style.animationDelay = (Math.random() * 10) + 's';
                p.style.width = p.style.height = (1 + Math.random() * 2) + 'px';
                if (Math.random() > 0.7) p.style.background = 'var(--magenta)';
                container.appendChild(p);

                // ═══════ HUD CLOCK ═══════
        function updateHudTime() {
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            const s = String(now.getSeconds()).padStart(2, '0');
            document.getElementById('hud-zaman').textContent = `${h}:${m}:${s} UTC+3`;
        }
        setInterval(updateHudTime, 1000);
        updateHudTime();
            }
        })();

        // ═══════ Yukleme animasyonu ═══════
        let loadProgress = 0;
        const loadingScreen = document.getElementById('yukleme-ekrani');
        const loadInterval = setInterval(() => {
            loadProgress += Math.random() * 15 + 5;
            if (loadProgress > 100) loadProgress = 100;
            document.getElementById('yukleme-bar').style.width = loadProgress + '%';
            if (loadProgress >= 100) {
                clearInterval(loadInterval);
                const showStartPrompt = () => {
                    setTimeout(() => loadingScreen.classList.add('ready'), 600);
                };

                if (map.loaded()) {
                    showStartPrompt();
                } else {
                    map.once('idle', showStartPrompt);
                }
            }
        }, 200);

        loadingScreen.addEventListener('click', (event) => {
            if (!loadingScreen.classList.contains('ready') || event.button !== 0) return;
            loadingScreen.classList.add('hidden');
        });