document.addEventListener('DOMContentLoaded', () => {

    // ─────────────────────────────────────────
    // MODE CONFIGURATION
    // ─────────────────────────────────────────
    const MODES = {
        truco: {
            id: 'truco', label: 'Truco', icon: '🃏', type: 'truco',
            maxScores: [15, 30], defaultMaxScore: 30, layout: 'two-col',
            players: [
                { id: 'nosotros', defaultName: 'Nosotros', colorClass: 'player-blue' },
                { id: 'ellos', defaultName: 'Ellos', colorClass: 'player-red' }
            ]
        },
        gallo: {
            id: 'gallo', label: 'Truco Gallo', icon: '🐓', type: 'truco',
            maxScores: [15, 30], defaultMaxScore: 30, layout: 'three-col',
            players: [
                { id: 'j1', defaultName: 'Jugador 1', colorClass: 'player-blue' },
                { id: 'j2', defaultName: 'Jugador 2', colorClass: 'player-red' },
                { id: 'j3', defaultName: 'Jugador 3', colorClass: 'player-green' }
            ]
        },
        pedro: {
            id: 'pedro', label: 'Pedro', icon: '🎯', type: 'pedro',
            maxScores: [], defaultMaxScore: null, layout: 'pedro', players: []
        }
    };

    const CASITAS_COUNT = 6;
    const POINTS_PER_CASITA = 5;
    const STORAGE_KEY = 'anotador-v5';

    // ─────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────
    const state = {
        modeId: 'truco',
        theme: 'light',
        modes: {},
        maxScore: 30,
        scores: {},
        names: {},
        pedro: { players: [], nextId: 1 }
    };

    // ─────────────────────────────────────────
    // STORAGE
    // ─────────────────────────────────────────

    function initModeDefaults(modeId) {
        const mode = MODES[modeId];
        if (mode.type === 'pedro') {
            return { players: [], nextId: 1 };
        }
        const scores = {}, names = {};
        mode.players.forEach(pl => {
            scores[pl.id] = 0;
            names[pl.id] = pl.defaultName;
        });
        return { maxScore: mode.defaultMaxScore, scores, names };
    }

    function activateModeSlot(modeId) {
        if (!state.modes[modeId]) {
            state.modes[modeId] = initModeDefaults(modeId);
        }
        state.modeId = modeId;
        const slot = state.modes[modeId];
        const mode = MODES[modeId];

        if (mode.type === 'pedro') {
            state.pedro = slot;
            state.scores = {};
            state.names = {};
            state.maxScore = null;
        } else {
            if (!slot.scores) { slot.scores = {}; slot.names = {}; }
            mode.players.forEach(pl => {
                if (!(pl.id in slot.scores)) slot.scores[pl.id] = 0;
                if (!(pl.id in slot.names)) slot.names[pl.id] = pl.defaultName;
            });
            if (!mode.maxScores.includes(slot.maxScore)) slot.maxScore = mode.defaultMaxScore;

            state.scores = slot.scores;
            state.names = slot.names;
            state.maxScore = slot.maxScore;
            state.pedro = { players: [], nextId: 1 };
        }
    }

    function loadState() {
        const OLD_KEY = 'truco-state-v4';
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            const old = localStorage.getItem(OLD_KEY);
            if (old) {
                try {
                    const p = JSON.parse(old);
                    state.theme = p.theme || 'light';
                    state.modes = {};
                    const migratedId = (p.modeId && MODES[p.modeId]) ? p.modeId : 'truco';
                    const migratedMode = MODES[migratedId];

                    if (migratedMode.type === 'pedro') {
                        state.modes[migratedId] = {
                            players: (p.pedro && Array.isArray(p.pedro.players))
                                ? p.pedro.players.map(pl => ({
                                    id: pl.id || `p_${Date.now()}`,
                                    name: pl.name || 'Jugador',
                                    score: parseInt(pl.score) || 0
                                }))
                                : [],
                            nextId: (p.pedro && p.pedro.nextId) || 1
                        };
                    } else {
                        const scores = {}, names = {};
                        const ms = migratedMode.maxScores.includes(p.maxScore)
                            ? p.maxScore : migratedMode.defaultMaxScore;
                        migratedMode.players.forEach(pl => {
                            scores[pl.id] = Math.min(Math.max(0, (p.scores && p.scores[pl.id]) || 0), ms);
                            names[pl.id] = (p.names && p.names[pl.id]) ? p.names[pl.id] : pl.defaultName;
                        });
                        state.modes[migratedId] = { maxScore: ms, scores, names };
                        if (p.pedro && Array.isArray(p.pedro.players) && p.pedro.players.length > 0) {
                            state.modes.pedro = {
                                players: p.pedro.players.map(pl => ({
                                    id: pl.id || `p_${Date.now()}`,
                                    name: pl.name || 'Jugador',
                                    score: parseInt(pl.score) || 0
                                })),
                                nextId: p.pedro.nextId || 1
                            };
                        }
                    }

                    activateModeSlot(migratedId);
                    saveState();
                    console.info('[Storage] Migrated truco-state-v4 → anotador-v5');
                    return;
                } catch (e) {
                    console.error('[Storage] Migration error', e);
                }
            }
            state.theme = 'light';
            state.modes = {};
            activateModeSlot('truco');
            return;
        }

        try {
            const p = JSON.parse(saved);
            state.theme = p.theme || 'light';
            state.modes = p.modes || {};
            Object.keys(state.modes).forEach(id => { if (!MODES[id]) delete state.modes[id]; });
            const modeId = (p.activeMode && MODES[p.activeMode]) ? p.activeMode : 'truco';
            activateModeSlot(modeId);
        } catch (e) {
            console.error('[Storage] Error loading state', e);
            state.theme = 'light';
            state.modes = {};
            activateModeSlot('truco');
        }
    }

    function saveState() {
        if (MODES[state.modeId].type !== 'pedro') {
            state.modes[state.modeId].maxScore = state.maxScore;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            activeMode: state.modeId,
            theme: state.theme,
            modes: state.modes
        }));
    }

    // ─────────────────────────────────────────
    // ENGINE
    // ─────────────────────────────────────────
    function setScore(playerId, newScore) {
        if (newScore < 0) newScore = 0;
        if (newScore > state.maxScore) {
            if (state.scores[playerId] === state.maxScore) checkWinner();
            newScore = state.maxScore;
        }
        if (state.scores[playerId] !== newScore) {
            state.scores[playerId] = newScore;
            saveState();
            Renderer.updatePlayerUI(playerId);
            checkWinner();
        }
    }

    function addPoint(id) { setScore(id, state.scores[id] + 1); }
    function removePoint(id) { setScore(id, state.scores[id] - 1); }

    function resetGame() {
        const mode = MODES[state.modeId];
        if (mode.type === 'pedro') {
            state.pedro.players.forEach(pl => { pl.score = 0; });
            saveState();
            PedroMode.render();
        } else {
            mode.players.forEach(pl => { state.scores[pl.id] = 0; });
            saveState();
            Renderer.updateAllPlayers();
            document.getElementById('winner-modal').classList.add('hidden');
        }
    }

    function checkWinner() {
        const mode = MODES[state.modeId];
        if (mode.type === 'pedro') return;
        const winner = mode.players.find(pl => state.scores[pl.id] >= state.maxScore);
        if (winner) Modal.showWinner(state.names[winner.id]);
    }

    function switchMode(newModeId) {
        if (newModeId === state.modeId || !MODES[newModeId]) return;
        if (MODES[state.modeId].type !== 'pedro') {
            state.modes[state.modeId].maxScore = state.maxScore;
        }
        activateModeSlot(newModeId);
        saveState();
        Renderer.buildBoard();
        updateModeLabel();
        ModeMenu.sync();
    }

    function changeMaxScore(newMax) {
        newMax = parseInt(newMax);
        const mode = MODES[state.modeId];
        if (mode.type === 'pedro') return;
        if (!mode.maxScores.includes(newMax) || newMax === state.maxScore) return;
        const hasOver = Object.values(state.scores).some(s => s > newMax);
        if (hasOver) {
            Modal.showConfirm(
                `¿Cambiar a ${newMax} puntos?`,
                'Los puntajes actuales se perderán. ¿Continuar?',
                () => { state.maxScore = newMax; mode.players.forEach(pl => { state.scores[pl.id] = 0; }); saveState(); Renderer.updateAllPlayers(); ModeMenu.sync(); },
                () => { ModeMenu.sync(); }
            );
        } else {
            state.maxScore = newMax;
            saveState();
            Renderer.updateAllPlayers();
            ModeMenu.sync();
        }
    }

    // ─────────────────────────────────────────
    // HEADER MODE LABEL
    // ─────────────────────────────────────────
    function updateModeLabel() {
        const el = document.getElementById('header-mode-label');
        if (el) el.textContent = MODES[state.modeId].label.toUpperCase();
    }

    const Renderer = (() => {
        const scoreBoard = document.getElementById('score-board');

        function buildBoard() {
            scoreBoard.classList.add('board-exit');
            setTimeout(() => {
                scoreBoard.innerHTML = '';
                const mode = MODES[state.modeId];
                if (mode.type === 'pedro') {
                    scoreBoard.className = 'score-board layout-pedro';
                    PedroMode.render();
                    scoreBoard.offsetHeight;
                    scoreBoard.classList.add('board-enter');
                    setTimeout(() => scoreBoard.classList.remove('board-enter'), 300);
                    return;
                }
                scoreBoard.className = `score-board layout-${mode.layout}`;
                mode.players.forEach((pc, idx) => {
                    scoreBoard.appendChild(buildSection(pc));
                    if (mode.layout === 'two-col' && idx === 0) {
                        const d = document.createElement('div');
                        d.className = 'col-divider';
                        scoreBoard.appendChild(d);
                    }
                });
                updateAllPlayers();
                EventBus.bindAllPlayers();
                scoreBoard.offsetHeight;
                scoreBoard.classList.add('board-enter');
                setTimeout(() => scoreBoard.classList.remove('board-enter'), 300);
            }, 150);
        }

        function buildSection(pc) {
            const { id, colorClass } = pc;
            const section = document.createElement('section');
            section.className = `player-section ${colorClass}`;
            section.id = `player-${id}`;
            section.dataset.playerId = id;

            // Header
            const header = document.createElement('div');
            header.className = 'team-header';

            const nameEl = document.createElement('h2');
            nameEl.className = 'player-name';
            nameEl.textContent = state.names[id];
            nameEl.title = 'Toca para editar';
            nameEl.setAttribute('role', 'button');
            nameEl.setAttribute('tabindex', '0');

            const scoreNum = document.createElement('span');
            scoreNum.className = 'score-number';
            scoreNum.id = `score-num-${id}`;
            scoreNum.textContent = state.scores[id];

            header.appendChild(nameEl);
            header.appendChild(scoreNum);
            section.appendChild(header);

            // Casitas
            const casitasContainer = document.createElement('div');
            casitasContainer.className = 'casitas-container';
            casitasContainer.id = `casitas-${id}`;
            renderCasitas(casitasContainer);
            section.appendChild(casitasContainer);

            // Controls
            const controls = document.createElement('div');
            controls.className = 'controls';

            const btnMinus = document.createElement('button');
            btnMinus.className = 'btn-control btn-minus';
            btnMinus.dataset.action = 'minus';
            btnMinus.setAttribute('aria-label', `Restar punto ${state.names[id]}`);
            btnMinus.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-minus"></use></svg>';

            const btnPlus = document.createElement('button');
            btnPlus.className = 'btn-control btn-plus';
            btnPlus.dataset.action = 'plus';
            btnPlus.setAttribute('aria-label', `Sumar punto ${state.names[id]}`);
            btnPlus.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-plus"></use></svg>';

            controls.appendChild(btnMinus);
            controls.appendChild(btnPlus);
            section.appendChild(controls);

            // Touch overlay
            const overlay = document.createElement('div');
            overlay.className = 'touch-overlay';
            section.appendChild(overlay);

            return section;
        }

        function renderCasitas(container) {
            container.innerHTML = '';
            for (let i = 0; i < CASITAS_COUNT; i++) {
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 0 100 100');
                svg.classList.add('casita-wrapper');

                const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                dot.setAttribute('cx', '50'); dot.setAttribute('cy', '50'); dot.setAttribute('r', '4');
                dot.classList.add('casita-dot');
                svg.appendChild(dot);

                const linesDef = [
                    { x1: 20, y1: 20, x2: 20, y2: 80 },
                    { x1: 20, y1: 80, x2: 80, y2: 80 },
                    { x1: 80, y1: 80, x2: 80, y2: 20 },
                    { x1: 80, y1: 20, x2: 20, y2: 20 },
                    { x1: 20, y1: 20, x2: 80, y2: 80 }
                ];

                linesDef.forEach((ld, idx) => {
                    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', ld.x1); line.setAttribute('y1', ld.y1);
                    line.setAttribute('x2', ld.x2); line.setAttribute('y2', ld.y2);
                    line.classList.add('stick');
                    const len = idx === 4 ? 84.85 : 60;
                    line.style.strokeDasharray = len;
                    line.style.strokeDashoffset = len;
                    line.style.opacity = '0';
                    line.dataset.length = len;
                    line.dataset.stickIndex = idx + 1;
                    svg.appendChild(line);
                });

                container.appendChild(svg);
                if (i === 2) {
                    const div = document.createElement('div');
                    div.classList.add('casita-divider');
                    container.appendChild(div);
                }
            }
        }

        function updateCasitas(container, score) {
            container.querySelectorAll('svg').forEach((svg, idx) => {
                const start = idx * POINTS_PER_CASITA;
                const filled = Math.max(0, Math.min(POINTS_PER_CASITA, score - start));
                svg.classList.toggle('has-points', filled > 0);
                svg.querySelectorAll('line').forEach(line => {
                    const active = parseInt(line.dataset.stickIndex) <= filled;
                    line.style.opacity = active ? '1' : '0';
                    line.style.strokeDashoffset = active ? '0' : line.dataset.length;
                });
            });
        }

        function updatePlayerUI(playerId) {
            const mode = MODES[state.modeId];
            const score = state.scores[playerId];

            const scoreEl = document.getElementById(`score-num-${playerId}`);
            if (scoreEl) scoreEl.textContent = score;

            const casitasEl = document.getElementById(`casitas-${playerId}`);
            if (casitasEl) updateCasitas(casitasEl, score);

            // Recalculate leading for ALL players so highlights are always in sync
            const maxScore = Math.max(...mode.players.map(p => state.scores[p.id]));
            mode.players.forEach(p => {
                const sec = document.getElementById(`player-${p.id}`);
                if (sec) {
                    const s = state.scores[p.id];
                    sec.classList.toggle('leading', s > 0 && s === maxScore && s > Math.max(0, ...mode.players.filter(o => o.id !== p.id).map(o => state.scores[o.id])));
                }
            });
        }

        function updateAllPlayers() {
            document.body.setAttribute('data-mode', state.maxScore);
            MODES[state.modeId].players.forEach(pl => updatePlayerUI(pl.id));
        }

        return { buildBoard, updatePlayerUI, updateAllPlayers };
    })();

    // ─────────────────────────────────────────
    // EVENT BUS
    // ─────────────────────────────────────────
    const EventBus = (() => {
        function bindAllPlayers() {
            MODES[state.modeId].players.forEach(pl => {
                const section = document.getElementById(`player-${pl.id}`);
                if (section) bindPlayer(section, pl.id);
            });
        }

        function startNameEdit(nameEl, playerId) {
            if (nameEl.querySelector('input')) return;
            const current = state.names[playerId];
            const input = document.createElement('input');
            input.type = 'text';
            input.value = current;
            input.className = 'player-name-input';
            input.maxLength = 14;
            nameEl.textContent = '';
            nameEl.appendChild(input);
            input.focus();
            input.select();

            const save = () => {
                const val = input.value.trim() || current;
                state.names[playerId] = val;
                saveState();
                nameEl.textContent = val;
                const section = document.getElementById(`player-${playerId}`);
                if (section) {
                    section.querySelector('.btn-plus').setAttribute('aria-label', `Sumar punto ${val}`);
                    section.querySelector('.btn-minus').setAttribute('aria-label', `Restar punto ${val}`);
                }
            };
            input.addEventListener('blur', save);
            input.addEventListener('keydown', e => {
                if (e.key === 'Enter') input.blur();
                if (e.key === 'Escape') { nameEl.textContent = current; }
            });
        }

        function bindPlayer(section, playerId) {
            const overlay = section.querySelector('.touch-overlay');
            const btnPlus = section.querySelector('.btn-plus');
            const btnMinus = section.querySelector('.btn-minus');
            const nameEl = section.querySelector('.player-name');

            // Explicit buttons
            btnPlus.addEventListener('pointerdown', e => e.stopPropagation());
            btnPlus.addEventListener('click', e => { e.stopPropagation(); addPoint(playerId); });
            btnMinus.addEventListener('pointerdown', e => e.stopPropagation());
            btnMinus.addEventListener('click', e => { e.stopPropagation(); removePoint(playerId); });

            // Editable name
            nameEl.addEventListener('click', () => startNameEdit(nameEl, playerId));
            nameEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') startNameEdit(nameEl, playerId); });

            // Mobile tap feedback on buttons
            [btnPlus, btnMinus].forEach(btn => {
                btn.addEventListener('touchstart', function () {
                    this.classList.add('active-tap');
                    setTimeout(() => this.classList.remove('active-tap'), 150);
                }, { passive: true });
            });

            // Touch overlay — tap = +1, long press = −1
            let pressTimer = null, intervalTimer = null, isLongPress = false;
            let startX = 0, startY = 0;
            const MOVE_THRESHOLD = 15;
            const LONG_PRESS_DELAY = 600;
            const SUBTRACT_INTERVAL = 400;

            const clearTimers = () => {
                clearTimeout(pressTimer); clearInterval(intervalTimer);
                pressTimer = intervalTimer = null;
                section.classList.remove('active-tap');
            };

            overlay.addEventListener('pointerdown', e => {
                if (e.button !== 0 && e.pointerType === 'mouse') return;
                overlay.setPointerCapture(e.pointerId);
                isLongPress = false; startX = e.clientX; startY = e.clientY;
                section.classList.add('active-tap');
                clearTimers();
                pressTimer = setTimeout(() => {
                    isLongPress = true;
                    if (navigator.vibrate) navigator.vibrate(50);
                    removePoint(playerId);
                    intervalTimer = setInterval(() => {
                        removePoint(playerId);
                        if (navigator.vibrate) navigator.vibrate(30);
                    }, SUBTRACT_INTERVAL);
                }, LONG_PRESS_DELAY);
            });

            overlay.addEventListener('pointermove', e => {
                if (!pressTimer && !intervalTimer) return;
                if (Math.abs(e.clientX - startX) > MOVE_THRESHOLD || Math.abs(e.clientY - startY) > MOVE_THRESHOLD) clearTimers();
            });

            overlay.addEventListener('pointerup', e => {
                overlay.releasePointerCapture(e.pointerId);
                const wasLong = isLongPress;
                const wasActive = pressTimer !== null;
                clearTimers();
                if (!wasLong && wasActive) addPoint(playerId);
            });

            overlay.addEventListener('pointercancel', clearTimers);
            overlay.addEventListener('pointerleave', clearTimers);
            overlay.addEventListener('contextmenu', e => e.preventDefault());
        }

        return { bindAllPlayers };
    })();

    // ─────────────────────────────────────────
    // MODE MENU  (hamburger → right side panel)
    // ─────────────────────────────────────────
    const ModeMenu = (() => {
        const btnMenu = document.getElementById('btn-menu');
        const btnClose = document.getElementById('btn-close-panel');
        const panel = document.getElementById('mode-panel');
        const backdrop = document.getElementById('mode-backdrop');
        const panelList = document.getElementById('mode-panel-list');
        const maxScoreSelect = document.getElementById('select-maxscore');

        function init() {
            // Build panel items from MODES config
            Object.values(MODES).forEach(mode => {
                const btn = document.createElement('button');
                btn.className = 'mode-panel-item';
                btn.dataset.modeId = mode.id;
                btn.setAttribute('role', 'menuitem');
                btn.innerHTML = `<span class="mode-item-icon">${mode.icon}</span>${mode.label}`;
                btn.addEventListener('click', () => {
                    switchMode(mode.id);
                    closePanel();
                });
                panelList.appendChild(btn);
            });

            // Hamburger opens panel
            btnMenu.addEventListener('click', e => {
                e.stopPropagation();
                panel.classList.contains('open') ? closePanel() : openPanel();
            });

            // Close button inside panel
            btnClose.addEventListener('click', closePanel);

            // Backdrop click closes panel
            backdrop.addEventListener('click', closePanel);

            // Escape closes panel
            document.addEventListener('keydown', e => {
                if (e.key === 'Escape') closePanel();
            });

            // Max score select (footer)
            maxScoreSelect.addEventListener('change', e => changeMaxScore(e.target.value));

            sync();
        }

        function openPanel() {
            panel.classList.add('open');
            backdrop.classList.add('open');
            btnMenu.setAttribute('aria-expanded', 'true');
            panel.removeAttribute('aria-hidden');
        }

        function closePanel() {
            panel.classList.remove('open');
            backdrop.classList.remove('open');
            btnMenu.setAttribute('aria-expanded', 'false');
            panel.setAttribute('aria-hidden', 'true');
        }

        function sync() {
            const mode = MODES[state.modeId];
            const isPedro = mode.type === 'pedro';

            // Update active state on panel items
            panelList.querySelectorAll('.mode-panel-item').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.modeId === state.modeId);
            });

            // Hide footer select for Pedro (no max score)
            const footer = document.querySelector('.app-footer');
            if (footer) footer.style.display = isPedro ? 'none' : '';

            // Rebuild max score options
            maxScoreSelect.innerHTML = '';
            mode.maxScores.forEach(pts => {
                const opt = document.createElement('option');
                opt.value = pts;
                opt.textContent = `A ${pts} pts`;
                maxScoreSelect.appendChild(opt);
            });
            if (!isPedro) maxScoreSelect.value = state.maxScore;
        }

        return { init, sync };
    })();

    // ─────────────────────────────────────────
    // MODAL
    // ─────────────────────────────────────────
    const Modal = (() => {
        const winnerModal = document.getElementById('winner-modal');
        const winnerTitle = document.getElementById('winner-title');
        const winnerMessage = document.getElementById('winner-message');
        const confirmModal = document.getElementById('confirm-modal');
        const confirmTitle = document.getElementById('confirm-title');
        const confirmMsg = document.getElementById('confirm-message');
        let onAccept = null, onCancel = null;

        function showWinner(name) {
            winnerTitle.textContent = `¡Ganó ${name}!`;
            winnerMessage.textContent = `Ha llegado a ${state.maxScore} puntos.`;
            winnerModal.classList.remove('hidden');
        }

        function showConfirm(title, message, accept, cancel = null) {
            confirmTitle.textContent = title;
            confirmMsg.textContent = message;
            onAccept = accept; onCancel = cancel;
            confirmModal.classList.remove('hidden');
        }

        function init() {
            document.getElementById('btn-close-modal').addEventListener('click', () => winnerModal.classList.add('hidden'));
            document.getElementById('btn-new-game').addEventListener('click', resetGame);
            document.getElementById('btn-cancel-confirm').addEventListener('click', () => {
                if (onCancel) onCancel();
                confirmModal.classList.add('hidden');
            });
            document.getElementById('btn-accept-confirm').addEventListener('click', () => {
                if (onAccept) onAccept();
                confirmModal.classList.add('hidden');
            });
        }

        function showInput(title, placeholder, accept) {
            confirmTitle.textContent = title;
            confirmMsg.innerHTML = '';
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.placeholder = placeholder || '';
            inp.className = 'pedro-modal-input';
            inp.maxLength = 20;
            confirmMsg.appendChild(inp);
            onAccept = () => { accept(inp.value); };
            onCancel = null;
            confirmModal.classList.remove('hidden');
            requestAnimationFrame(() => inp.focus());
        }

        return { showWinner, showConfirm, showInput, init };
    })();

    // ─────────────────────────────────────────
    // PEDRO MODE
    // ─────────────────────────────────────────
    const PedroMode = (() => {
        const board = document.getElementById('score-board');

        function render() {
            board.innerHTML = '';
            if (state.pedro.players.length === 0) {
                renderEmpty();
            } else {
                board.appendChild(buildList());
                board.appendChild(buildBar());
            }
        }

        function renderEmpty() {
            const wrap = document.createElement('div');
            wrap.className = 'pedro-empty';
            wrap.innerHTML = `
                <div class="pedro-empty-icon">🎯</div>
                <p class="pedro-empty-msg">No hay jugadores aún</p>`;
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.textContent = 'Agregar jugador';
            btn.addEventListener('click', promptAdd);
            wrap.appendChild(btn);
            board.appendChild(wrap);
        }

        function buildList() {
            const list = document.createElement('div');
            list.className = 'pedro-list';
            list.id = 'pedro-list';
            state.pedro.players.forEach(pl => list.appendChild(buildRow(pl)));

            const btnAdd = document.createElement('button');
            btnAdd.className = 'pedro-btn-add pedro-btn-add--inline';
            btnAdd.id = 'pedro-btn-add-player';
            btnAdd.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-user-plus"></use></svg> Agregar jugador';
            btnAdd.addEventListener('click', promptAdd);
            list.appendChild(btnAdd);

            return list;
        }

        function buildRow(pl) {
            const row = document.createElement('div');
            row.className = 'pedro-row';
            row.id = `pedro-row-${pl.id}`;

            // Name
            const nameEl = document.createElement('h2');
            nameEl.className = 'pedro-player-name';
            nameEl.textContent = pl.name;
            nameEl.title = 'Toca para editar';
            nameEl.setAttribute('role', 'button');
            nameEl.setAttribute('tabindex', '0');
            nameEl.addEventListener('click', () => startNameEdit(nameEl, pl.id));
            nameEl.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') startNameEdit(nameEl, pl.id); });

            // Score
            const scoreEl = document.createElement('span');
            scoreEl.className = 'pedro-score-display';
            scoreEl.id = `pedro-score-${pl.id}`;
            scoreEl.textContent = pl.score;

            // Buttons
            const btnMinus = document.createElement('button');
            btnMinus.className = 'btn-control';
            btnMinus.setAttribute('aria-label', `Restar a ${pl.name}`);
            btnMinus.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-minus"></use></svg>';
            btnMinus.addEventListener('click', () => updateScore(pl.id, -1));

            const btnPlus = document.createElement('button');
            btnPlus.className = 'btn-control';
            btnPlus.setAttribute('aria-label', `Sumar a ${pl.name}`);
            btnPlus.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-plus"></use></svg>';
            btnPlus.addEventListener('click', () => updateScore(pl.id, 1));

            const btnDel = document.createElement('button');
            btnDel.className = 'btn-icon pedro-btn-delete';
            btnDel.setAttribute('aria-label', `Eliminar ${pl.name}`);
            btnDel.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-trash"></use></svg>';
            btnDel.addEventListener('click', () => {
                Modal.showConfirm(`¿Eliminar a ${pl.name}?`, 'Esta acción no se puede deshacer.', () => {
                    state.pedro.players = state.pedro.players.filter(p => p.id !== pl.id);
                    saveState();
                    render();
                });
            });

            const controls = document.createElement('div');
            controls.className = 'pedro-row-controls';
            controls.appendChild(btnMinus);
            controls.appendChild(btnPlus);
            controls.appendChild(btnDel);

            row.appendChild(nameEl);
            row.appendChild(scoreEl);
            row.appendChild(controls);
            return row;
        }

        function buildBar() {
            const bar = document.createElement('div');
            bar.className = 'pedro-quick-add';

            // Single row: player select + points input + sumar
            const select = document.createElement('select');
            select.className = 'pedro-player-select';
            select.id = 'pedro-player-select';
            state.pedro.players.forEach(pl => {
                const opt = document.createElement('option');
                opt.value = pl.id; opt.textContent = pl.name;
                select.appendChild(opt);
            });

            const input = document.createElement('input');
            input.type = 'text'; input.className = 'pedro-points-input';
            input.id = 'pedro-points-input'; input.placeholder = 'Pts';
            input.inputMode = 'numeric';
            // Allow only digits; no decimals
            input.addEventListener('input', () => {
                const cleaned = input.value.replace(/[^0-9]/g, '');
                if (input.value !== cleaned) input.value = cleaned;
            });

            // Sign toggle button (+/−)
            const btnSign = document.createElement('button');
            btnSign.className = 'pedro-btn-sign';
            btnSign.id = 'pedro-btn-sign';
            btnSign.type = 'button';
            btnSign.dataset.sign = 'pos';
            btnSign.innerHTML = '<span class="pedro-btn-sign-label">+</span>';
            btnSign.setAttribute('aria-label', 'Cambiar signo');
            btnSign.addEventListener('click', () => {
                const isNeg = btnSign.classList.toggle('active');
                btnSign.dataset.sign = isNeg ? 'neg' : 'pos';
                btnSign.querySelector('.pedro-btn-sign-label').textContent = isNeg ? '−' : '+';
            });

            const btnSumar = document.createElement('button');
            btnSumar.className = 'pedro-btn-sumar';
            btnSumar.id = 'pedro-btn-sumar';
            btnSumar.textContent = 'Aplicar';
            btnSumar.addEventListener('click', () => {
                const digits = parseInt(input.value, 10);
                if (!select.value || isNaN(digits) || digits === 0) return;
                const pts = btnSign.classList.contains('active') ? -digits : digits;
                updateScore(select.value, pts);
                input.value = '';
                btnSign.classList.remove('active');
                input.focus();
            });
            input.addEventListener('keydown', e => { if (e.key === 'Enter') btnSumar.click(); });

            const row = document.createElement('div');
            row.className = 'pedro-bar-row';
            row.appendChild(select); row.appendChild(input); row.appendChild(btnSign); row.appendChild(btnSumar);

            bar.appendChild(row);
            return bar;
        }

        function updateScore(id, delta) {
            const pl = state.pedro.players.find(p => p.id === id);
            if (!pl) return;
            pl.score = pl.score + delta;
            saveState();
            const scoreEl = document.getElementById(`pedro-score-${id}`);
            if (scoreEl) scoreEl.textContent = pl.score;
            const row = document.getElementById(`pedro-row-${id}`);
            if (row) {
                row.classList.remove('pedro-row--updated');
                void row.offsetWidth; // reflow to restart animation
                row.classList.add('pedro-row--updated');
                setTimeout(() => row.classList.remove('pedro-row--updated'), 650);
            }
            // keep select in sync if visible
            const sel = document.getElementById('pedro-player-select');
            if (sel) sel.value = id;
        }

        function promptAdd() {
            Modal.showInput('Nombre del jugador', 'Jugador...', name => {
                const n = state.pedro.nextId++;
                const playerName = (name || '').trim() || `Jugador ${n}`;
                state.pedro.players.push({ id: `p_${n}`, name: playerName, score: 0 });
                saveState();
                render();
            });
        }

        function startNameEdit(nameEl, id) {
            if (nameEl.querySelector('input')) return;
            const pl = state.pedro.players.find(p => p.id === id);
            if (!pl) return;
            const current = pl.name;
            const inp = document.createElement('input');
            inp.type = 'text'; inp.value = current;
            inp.className = 'pedro-name-input'; inp.maxLength = 20;
            nameEl.textContent = '';
            nameEl.appendChild(inp);
            inp.focus(); inp.select();
            const save = () => {
                const val = inp.value.trim() || current;
                pl.name = val; saveState();
                nameEl.textContent = val;
                const opt = document.querySelector(`#pedro-player-select option[value="${id}"]`);
                if (opt) opt.textContent = val;
            };
            inp.addEventListener('blur', save);
            inp.addEventListener('keydown', e => {
                if (e.key === 'Enter') inp.blur();
                if (e.key === 'Escape') { nameEl.textContent = current; }
            });
        }

        return { render };
    })();

    // ─────────────────────────────────────────
    // PWA
    // ─────────────────────────────────────────
    const PWA = (() => {
        function init() {
            setupServiceWorker();
            setupInstall();
            setupUpdate();
        }

        function setupServiceWorker() {
            if (!('serviceWorker' in navigator)) return;
            const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            if (isDev) {
                navigator.serviceWorker.getRegistrations()
                    .then(regs => Promise.all(regs.map(r => r.unregister())))
                    .then(() => caches.keys())
                    .then(keys => Promise.all(keys.map(k => caches.delete(k))))
                    .then(() => console.info('[SW] Dev mode — SW unregistered, caches cleared.'))
                    .catch(err => console.warn('[SW] Dev cleanup error:', err));
                return;
            }
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js').catch(err => console.error('[SW] Registration failed:', err));
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (!refreshing) { refreshing = true; window.location.reload(); }
                });
            });
        }

        function setupInstall() {
            let deferredPrompt;
            const btn = document.getElementById('btn-install');
            window.addEventListener('beforeinstallprompt', e => {
                e.preventDefault(); deferredPrompt = e;
                if (btn) btn.style.display = 'inline-flex';
            });
            if (btn) {
                btn.addEventListener('click', async () => {
                    if (!deferredPrompt) return;
                    deferredPrompt.prompt();
                    await deferredPrompt.userChoice;
                    deferredPrompt = null;
                    btn.style.display = 'none';
                });
            }
            window.addEventListener('appinstalled', () => {
                deferredPrompt = null;
                if (btn) btn.style.display = 'none';
            });
        }

        function setupUpdate() {
            const btn = document.getElementById('btn-update');
            if (!btn) return;
            btn.addEventListener('click', () => {
                if (!('serviceWorker' in navigator)) return;
                Modal.showConfirm(
                    '¿Buscar actualización?',
                    'Si hay una versión nueva, la página se recargará automáticamente (tus puntos no se perderán).',
                    async () => {
                        btn.style.opacity = '0.5';
                        try {
                            const reg = await navigator.serviceWorker.ready;
                            await reg.update();
                            if (reg.waiting) { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); return; }
                            if (reg.installing) {
                                reg.installing.addEventListener('statechange', function () {
                                    if (this.state === 'installed') this.postMessage({ type: 'SKIP_WAITING' });
                                });
                                return;
                            }
                            Modal.showConfirm('App Actualizada', 'Ya tienes la última versión instalada.', null);
                        } catch (err) {
                            console.error('Error al buscar actualizaciones', err);
                        } finally {
                            btn.style.opacity = '1';
                        }
                    }
                );
            });
        }

        return { init };
    })();

    // ─────────────────────────────────────────
    // THEME
    // ─────────────────────────────────────────
    function applyTheme() {
        const dark = state.theme === 'dark';
        document.body.classList.toggle('dark-mode', dark);
        document.getElementById('theme-icon-use').setAttribute('href', dark ? '#icon-sun' : '#icon-moon');
    }

    function toggleTheme() {
        state.theme = state.theme === 'light' ? 'dark' : 'light';
        saveState();
        applyTheme();
    }

    // ─────────────────────────────────────────
    // RESET
    // ─────────────────────────────────────────
    function setupResetButton() {
        document.getElementById('btn-reset').addEventListener('click', () => {
            Modal.showConfirm(
                '¿Reiniciar juego?',
                'Los puntajes actuales volverán a cero.',
                resetGame
            );
        });
    }

    // ─────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────
    function init() {
        loadState();
        applyTheme();
        updateModeLabel();
        Modal.init();
        ModeMenu.init();
        Renderer.buildBoard();
        setupResetButton();
        document.getElementById('btn-theme-toggle').addEventListener('click', toggleTheme);
        PWA.init();
    }

    init();
});
