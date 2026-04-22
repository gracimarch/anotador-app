document.addEventListener('DOMContentLoaded', () => {
    const state = {
        nosotros: 0,
        ellos: 0,
        mode: 30,
        theme: 'light'
    };

    const CASITAS_COUNT = 6;
    const POINTS_PER_CASITA = 5;

    const elements = {
        nosotros: {
            section: document.getElementById('team-nosotros'),
            scoreText: document.getElementById('score-num-nosotros'),
            casitasContainer: document.getElementById('casitas-nosotros'),
            overlay: document.querySelector('#team-nosotros .touch-overlay'),
            btnPlus: document.querySelector('#team-nosotros .btn-plus'),
            btnMinus: document.querySelector('#team-nosotros .btn-minus')
        },
        ellos: {
            section: document.getElementById('team-ellos'),
            scoreText: document.getElementById('score-num-ellos'),
            casitasContainer: document.getElementById('casitas-ellos'),
            overlay: document.querySelector('#team-ellos .touch-overlay'),
            btnPlus: document.querySelector('#team-ellos .btn-plus'),
            btnMinus: document.querySelector('#team-ellos .btn-minus')
        },
        modal: document.getElementById('winner-modal'),
        winnerTitle: document.getElementById('winner-title'),
        winnerMessage: document.getElementById('winner-message'),
        btnCloseModal: document.getElementById('btn-close-modal'),
        btnNewGame: document.getElementById('btn-new-game'),
        btnReset: document.getElementById('btn-reset'),
        btnInstall: document.getElementById('btn-install'),
        btnThemeToggle: document.getElementById('btn-theme-toggle'),
        btnUpdate: document.getElementById('btn-update'),
        modeSelect: document.getElementById('game-mode-select'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmTitle: document.getElementById('confirm-title'),
        confirmMessage: document.getElementById('confirm-message'),
        btnCancelConfirm: document.getElementById('btn-cancel-confirm'),
        btnAcceptConfirm: document.getElementById('btn-accept-confirm')
    };

    function init() {
        loadState();
        applyModeToUI();
        applyThemeToUI();
        renderInitialCasitas();
        updateUI();
        setupEventListeners();
        setupServiceWorker();
    }

    function setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js').catch(err => {
                    console.error('Service Worker registration failed: ', err);
                });

                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) {
                        window.location.reload();
                        refreshing = true;
                    }
                });
            });
        }
    }

    // almacenamiento
    function loadState() {
        const saved = localStorage.getItem('truco-scores-v2');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                state.mode = parsed.mode || 30;
                state.theme = parsed.theme || 'light';
                // asegurar que los puntajes no excedan el modo cargado
                state.nosotros = Math.min(parsed.nosotros || 0, state.mode);
                state.ellos = Math.min(parsed.ellos || 0, state.mode);
            } catch (e) {
                console.error("Error parsing local storage", e);
            }
        }
    }

    function saveState() {
        localStorage.setItem('truco-scores-v2', JSON.stringify(state));
    }

    // lógica
    function setScore(team, newScore) {
        if (newScore < 0) newScore = 0;

        // mostrar modal de ganador de nuevo si se intenta agregar puntos más allá del límite
        if (newScore > state.mode) {
            if (state[team] === state.mode) {
                checkWinner();
            }
            newScore = state.mode;
        }

        if (state[team] !== newScore) {
            state[team] = newScore;
            saveState();
            updateUI();
            checkWinner();
        }
    }

    function addPoint(team) {
        setScore(team, state[team] + 1);
    }

    function removePoint(team) {
        setScore(team, state[team] - 1);
    }

    function resetGame() {
        state.nosotros = 0;
        state.ellos = 0;
        saveState();
        updateUI();
        elements.modal.classList.add('hidden');
    }

    function checkWinner() {
        if (state.nosotros === state.mode) {
            showWinnerModal('Nosotros');
        } else if (state.ellos === state.mode) {
            showWinnerModal('Ellos');
        }
    }

    function showWinnerModal(teamName) {
        elements.winnerTitle.textContent = `¡Ganó ${teamName}!`;
        elements.winnerMessage.textContent = `Han llegado a ${state.mode} puntos.`;
        elements.modal.classList.remove('hidden');
    }

    let confirmCallback = null;
    let cancelCallback = null;

    function showConfirmModal(title, message, onAccept, onCancel = null) {
        elements.confirmTitle.textContent = title;
        elements.confirmMessage.textContent = message;
        elements.confirmModal.classList.remove('hidden');
        confirmCallback = onAccept;
        cancelCallback = onCancel;
    }

    function closeConfirmModal() {
        elements.confirmModal.classList.add('hidden');
        confirmCallback = null;
        cancelCallback = null;
    }

    function changeMode(newMode) {
        newMode = parseInt(newMode);
        if (newMode === state.mode) return;

        // si se cambia de 30 a 15, y un puntaje es > 15, reiniciar juego o limitarlo
        if (newMode === 15 && (state.nosotros > 15 || state.ellos > 15)) {
            showConfirmModal(
                "¿Cambiar a 15 puntos?",
                "Los puntajes actuales se perderán. ¿Continuar?",
                () => {
                    state.mode = newMode;
                    applyModeToUI();
                    resetGame();
                },
                () => {
                    // revertir selección
                    elements.modeSelect.value = state.mode;
                }
            );
            return;
        } else {
            state.mode = newMode;
        }

        saveState();
        applyModeToUI();
        updateUI(); // para arreglar la visibilidad de las casitas
    }

    function applyModeToUI() {
        document.body.setAttribute('data-mode', state.mode);
        elements.modeSelect.value = state.mode;
    }

    function applyThemeToUI() {
        if (state.theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.getElementById('theme-icon-use').setAttribute('href', '#icon-sun');
        } else {
            document.body.classList.remove('dark-mode');
            document.getElementById('theme-icon-use').setAttribute('href', '#icon-moon');
        }
    }

    function toggleTheme() {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        saveState();
        applyThemeToUI();
    }

    // actualizaciones de ui
    function updateUI() {
        ['nosotros', 'ellos'].forEach(team => {
            elements[team].scoreText.textContent = state[team];
            updateCasitas(team, state[team]);

            // resaltado visual si va ganando
            if (state[team] > 0 && state[team] > state[team === 'nosotros' ? 'ellos' : 'nosotros']) {
                elements[team].section.classList.add('leading');
            } else {
                elements[team].section.classList.remove('leading');
            }
        });
    }

    function renderInitialCasitas() {
        ['nosotros', 'ellos'].forEach(team => {
            elements[team].casitasContainer.innerHTML = '';
            for (let i = 0; i < CASITAS_COUNT; i++) {
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 0 100 100');
                svg.classList.add('casita-wrapper');

                // marcador de punto
                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', '50');
                dot.setAttribute('cy', '50');
                dot.setAttribute('r', '4');
                dot.classList.add('casita-dot');
                svg.appendChild(dot);

                // definiciones para los 5 fosforos
                // 1. izquierda
                // 2. abajo
                // 3. derecha
                // 4. arriba
                // 5. diagonal
                const lines = [
                    { id: 'l1', x1: 20, y1: 20, x2: 20, y2: 80 },
                    { id: 'l2', x1: 20, y1: 80, x2: 80, y2: 80 },
                    { id: 'l3', x1: 80, y1: 80, x2: 80, y2: 20 },
                    { id: 'l4', x1: 80, y1: 20, x2: 20, y2: 20 },
                    { id: 'l5', x1: 20, y1: 20, x2: 80, y2: 80 }
                ];

                lines.forEach((lineData, index) => {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', lineData.x1);
                    line.setAttribute('y1', lineData.y1);
                    line.setAttribute('x2', lineData.x2);
                    line.setAttribute('y2', lineData.y2);
                    line.classList.add('stick');
                    // oculto por defecto usando dash array para la animación de dibujo
                    const length = (index === 4) ? 84.85 : 60; // longitud aproximada
                    line.style.strokeDasharray = length;
                    line.style.strokeDashoffset = length;
                    line.style.opacity = '0';
                    line.dataset.length = length;
                    line.dataset.stickIndex = index + 1; // 1 to 5
                    svg.appendChild(line);
                });

                elements[team].casitasContainer.appendChild(svg);

                // agregar un divisor después de la 3ra casita (índice 2)
                if (i === 2) {
                    const divider = document.createElement('div');
                    divider.classList.add('casita-divider');
                    elements[team].casitasContainer.appendChild(divider);
                }
            }
        });
    }

    function updateCasitas(team, score) {
        const container = elements[team].casitasContainer;
        const svgs = container.querySelectorAll('svg');

        svgs.forEach((svg, index) => {
            const casitaStartScore = index * POINTS_PER_CASITA;
            const pointsInThisCasita = Math.max(0, Math.min(POINTS_PER_CASITA, score - casitaStartScore));

            if (pointsInThisCasita > 0) {
                svg.classList.add('has-points');
            } else {
                svg.classList.remove('has-points');
            }

            const lines = svg.querySelectorAll('line');
            lines.forEach((line) => {
                const stickIndex = parseInt(line.dataset.stickIndex);
                if (stickIndex <= pointsInThisCasita) {
                    line.style.opacity = '1';
                    line.style.strokeDashoffset = '0';
                } else {
                    line.style.opacity = '0';
                    line.style.strokeDashoffset = line.dataset.length;
                }
            });
        });
    }

    // escuchar eventos
    function setupEventListeners() {
        // selector de modo
        elements.modeSelect.addEventListener('change', (e) => {
            changeMode(e.target.value);
        });

        // interacción de equipos
        ['nosotros', 'ellos'].forEach(team => {
            const el = elements[team];

            // botones explícitos (detener propagación para que el overlay no se active)
            el.btnPlus.addEventListener('pointerdown', (e) => e.stopPropagation());
            el.btnPlus.addEventListener('click', (e) => {
                e.stopPropagation();
                addPoint(team);
            });

            el.btnMinus.addEventListener('pointerdown', (e) => e.stopPropagation());
            el.btnMinus.addEventListener('click', (e) => {
                e.stopPropagation();
                removePoint(team);
            });

            // eventos de puntero modernos para overlay
            let pressTimer = null;
            let intervalTimer = null;
            let isLongPress = false;
            let startX = 0, startY = 0;
            const MOVE_THRESHOLD = 15;
            const LONG_PRESS_DELAY = 600;
            const SUBTRACT_INTERVAL = 400;

            const clearTimers = () => {
                if (pressTimer) clearTimeout(pressTimer);
                if (intervalTimer) clearInterval(intervalTimer);
                pressTimer = null;
                intervalTimer = null;
                el.section.classList.remove('active-tap');
            };

            el.overlay.addEventListener('pointerdown', (e) => {
                if (e.button !== 0 && e.pointerType === 'mouse') return;

                // prevenir clics fantasma en móviles (capturar puntero)
                el.overlay.setPointerCapture(e.pointerId);

                isLongPress = false;
                startX = e.clientX;
                startY = e.clientY;
                el.section.classList.add('active-tap');

                clearTimers();

                pressTimer = setTimeout(() => {
                    isLongPress = true;
                    if (navigator.vibrate) navigator.vibrate(50);

                    removePoint(team);
                    intervalTimer = setInterval(() => {
                        removePoint(team);
                        if (navigator.vibrate) navigator.vibrate(30);
                    }, SUBTRACT_INTERVAL);
                }, LONG_PRESS_DELAY);
            });

            el.overlay.addEventListener('pointermove', (e) => {
                if (!pressTimer && !intervalTimer) return;

                const diffX = Math.abs(e.clientX - startX);
                const diffY = Math.abs(e.clientY - startY);

                if (diffX > MOVE_THRESHOLD || diffY > MOVE_THRESHOLD) {
                    // es un arrastre/deslizamiento, cancelar toque y presión larga
                    clearTimers();
                }
            });

            el.overlay.addEventListener('pointerup', (e) => {
                el.overlay.releasePointerCapture(e.pointerId);

                const wasLongPress = isLongPress;
                const wasActive = pressTimer !== null;

                clearTimers();

                if (!wasLongPress && wasActive) {
                    addPoint(team);
                }
            });

            el.overlay.addEventListener('pointercancel', (e) => {
                clearTimers();
            });

            // pointerleave maneja cuando el ratón sale de los límites
            el.overlay.addEventListener('pointerleave', (e) => {
                clearTimers();
            });

            // prevenir comportamientos táctiles por defecto como el menú contextual en presión larga
            el.overlay.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        });

        // modales y encabezados
        elements.btnCloseModal.addEventListener('click', () => {
            elements.modal.classList.add('hidden');
        });

        elements.btnNewGame.addEventListener('click', resetGame);

        elements.btnThemeToggle.addEventListener('click', toggleTheme);

        // PWA Install prompt logic
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (elements.btnInstall) {
                elements.btnInstall.style.display = 'inline-flex';
            }
        });

        if (elements.btnInstall) {
            elements.btnInstall.addEventListener('click', async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`User response to the install prompt: ${outcome}`);
                    deferredPrompt = null;
                    elements.btnInstall.style.display = 'none';
                }
            });
        }

        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            console.log('PWA was installed');
            if (elements.btnInstall) {
                elements.btnInstall.style.display = 'none';
            }
        });

        elements.btnUpdate.addEventListener('click', () => {
            if (!('serviceWorker' in navigator)) return;

            showConfirmModal(
                "¿Buscar actualización?",
                "Si hay una versión nueva, la página se recargará automáticamente (tus puntos no se perderán).",
                async () => {
                    elements.btnUpdate.style.opacity = '0.5';
                    try {
                        const reg = await navigator.serviceWorker.ready;
                        await reg.update();

                        if (reg.waiting) {
                            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                            return;
                        }

                        if (reg.installing) {
                            const newWorker = reg.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed') {
                                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                                }
                            });
                            return;
                        }

                        showConfirmModal(
                            "App Actualizada",
                            "Ya tienes la última versión instalada.",
                            null
                        );
                    } catch (error) {
                        console.error("Error al buscar actualizaciones", error);
                    } finally {
                        elements.btnUpdate.style.opacity = '1';
                    }
                }
            );
        });

        elements.btnReset.addEventListener('click', () => {
            showConfirmModal(
                "¿Reiniciar juego?",
                "Los puntajes actuales volverán a cero.",
                () => {
                    resetGame();
                }
            );
        });

        elements.btnCancelConfirm.addEventListener('click', () => {
            if (cancelCallback) cancelCallback();
            closeConfirmModal();
        });

        elements.btnAcceptConfirm.addEventListener('click', () => {
            if (confirmCallback) confirmCallback();
            closeConfirmModal();
        });

        // efecto visual de tap para móviles en botones
        document.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('touchstart', function () {
                this.classList.add('active-tap');
                setTimeout(() => {
                    this.classList.remove('active-tap');
                }, 150);
            }, { passive: true });
        });
    }

    init();
});
