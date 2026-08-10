// app.js – Pro drawing app with glassmorphism

(function() {
    const canvas = document.getElementById('drawCanvas');
    const ctx = canvas.getContext('2d');
    const settingsContent = document.getElementById('settingsContent');

    // ---- canvas sizing ----
    function resizeCanvas() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.scale(dpr, dpr);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        applySettings();
    }

    // ---- tool state ----
    let currentTool = 'pen';
    let isDrawing = false;
    let lastX = 0, lastY = 0;
    let strokeHistory = [];

    // ---- settings ----
    const settings = {
        // pen
        size: 8,
        opacity: 100,
        blur: 0,
        pressure: true,
        pressureSize: 50,
        startWidth: 0,
        endWidth: 0,
        color: '#000000',
        // eraser
        eraserSize: 20,
        eraserOpacity: 100,
        // text
        fontSize: 24,
        fontFamily: 'Arial',
        textColor: '#000000'
    };

    // ---- DOM refs for settings ----
    function updateSettingsUI() {
        if (!settingsContent) return;

        if (currentTool === 'pen') {
            settingsContent.innerHTML = `
                <div class="setting-row">
                    <label>Size</label>
                    <input type="range" min="1" max="50" value="${settings.size}" class="w-24" data-setting="size" />
                    <span class="value">${settings.size}</span>
                </div>
                <div class="setting-row">
                    <label>Opacity</label>
                    <input type="range" min="1" max="100" value="${settings.opacity}" class="w-24" data-setting="opacity" />
                    <span class="value">${settings.opacity}%</span>
                </div>
                <div class="setting-row">
                    <label>Blur</label>
                    <input type="range" min="0" max="20" value="${settings.blur}" class="w-24" data-setting="blur" />
                    <span class="value">${settings.blur}</span>
                </div>
                <div class="setting-row">
                    <label>Pressure</label>
                    <div class="toggle-switch ${settings.pressure ? 'active' : ''}" data-setting="pressure">
                        <div class="knob"></div>
                    </div>
                </div>
                <div class="setting-row">
                    <label>Pressure Size</label>
                    <input type="range" min="0" max="100" value="${settings.pressureSize}" class="w-24" data-setting="pressureSize" />
                    <span class="value">${settings.pressureSize}</span>
                </div>
                <div class="setting-row">
                    <label>Start Width</label>
                    <input type="range" min="-50" max="50" value="${settings.startWidth}" class="w-24" data-setting="startWidth" />
                    <span class="value">${settings.startWidth}</span>
                </div>
                <div class="setting-row">
                    <label>End Width</label>
                    <input type="range" min="-50" max="50" value="${settings.endWidth}" class="w-24" data-setting="endWidth" />
                    <span class="value">${settings.endWidth}</span>
                </div>
            `;
        } else if (currentTool === 'eraser') {
            settingsContent.innerHTML = `
                <div class="setting-row">
                    <label>Size</label>
                    <input type="range" min="5" max="80" value="${settings.eraserSize}" class="w-24" data-setting="eraserSize" />
                    <span class="value">${settings.eraserSize}</span>
                </div>
                <div class="setting-row">
                    <label>Opacity</label>
                    <input type="range" min="10" max="100" value="${settings.eraserOpacity}" class="w-24" data-setting="eraserOpacity" />
                    <span class="value">${settings.eraserOpacity}%</span>
                </div>
            `;
        } else if (currentTool === 'text') {
            settingsContent.innerHTML = `
                <div class="setting-row">
                    <label>Font Size</label>
                    <input type="range" min="8" max="72" value="${settings.fontSize}" class="w-24" data-setting="fontSize" />
                    <span class="value">${settings.fontSize}</span>
                </div>
                <div class="setting-row">
                    <label>Font</label>
                    <select class="bg-white/10 border border-white/10 rounded px-2 py-1 text-xs" data-setting="fontFamily">
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Courier New">Courier New</option>
                    </select>
                </div>
                <div class="setting-row">
                    <label>Color</label>
                    <input type="color" value="${settings.textColor}" class="w-8 h-8 rounded border border-white/20" data-setting="textColor" />
                </div>
            `;
        }

        // attach events
        attachSettingEvents();
    }

    function attachSettingEvents() {
        // range inputs
        document.querySelectorAll('#settingsContent input[type="range"]').forEach(input => {
            input.addEventListener('input', function() {
                const key = this.dataset.setting;
                const val = parseFloat(this.value);
                settings[key] = val;
                const display = this.parentElement.querySelector('.value');
                if (display) {
                    if (key === 'opacity' || key === 'eraserOpacity') {
                        display.textContent = val + '%';
                    } else {
                        display.textContent = val;
                    }
                }
                if (key === 'size' || key === 'opacity' || key === 'blur') {
                    applySettings();
                }
                if (key === 'eraserSize' || key === 'eraserOpacity') {
                    applySettings();
                }
            });
        });

        // toggle switches (pressure)
        document.querySelectorAll('.toggle-switch').forEach(toggle => {
            toggle.addEventListener('click', function() {
                const key = this.dataset.setting;
                settings[key] = !settings[key];
                this.classList.toggle('active');
            });
        });

        // color pickers
        document.querySelectorAll('#settingsContent input[type="color"]').forEach(input => {
            input.addEventListener('input', function() {
                const key = this.dataset.setting;
                settings[key] = this.value;
                if (key === 'textColor') {
                    // text color update
                }
            });
        });

        // select dropdowns
        document.querySelectorAll('#settingsContent select').forEach(select => {
            select.addEventListener('change', function() {
                const key = this.dataset.setting;
                settings[key] = this.value;
            });
        });
    }

    // ---- apply settings to canvas ----
    function applySettings() {
        if (currentTool === 'pen') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = settings.opacity / 100;
            ctx.lineWidth = settings.size;
            ctx.shadowBlur = settings.blur;
            ctx.shadowColor = settings.color;
            ctx.strokeStyle = settings.color;
            ctx.fillStyle = settings.color;
        } else if (currentTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.globalAlpha = settings.eraserOpacity / 100;
            ctx.lineWidth = settings.eraserSize;
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#ffffff';
            ctx.fillStyle = '#ffffff';
        } else if (currentTool === 'text') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
            ctx.font = `${settings.fontSize}px ${settings.fontFamily}`;
            ctx.fillStyle = settings.textColor;
        }
    }

    // ---- drawing functions ----
    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
        const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        const { x, y } = getCoords(e);
        lastX = x;
        lastY = y;

        if (currentTool === 'pen') {
            ctx.beginPath();
            ctx.arc(x, y, settings.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x, y);
            applySettings();
        } else if (currentTool === 'eraser') {
            ctx.beginPath();
            ctx.arc(x, y, settings.eraserSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(x, y);
            applySettings();
        } else if (currentTool === 'text') {
            // text input via prompt
            const text = prompt('Enter text:');
            if (text) {
                ctx.fillText(text, x, y);
                saveStroke();
            }
            isDrawing = false;
        }
    }

    function draw(e) {
        if (!isDrawing || currentTool === 'text') return;
        e.preventDefault();
        const { x, y } = getCoords(e);

        if (currentTool === 'pen' || currentTool === 'eraser') {
            // pressure simulation (if enabled)
            let width = settings.size;
            if (currentTool === 'pen' && settings.pressure) {
                // simulate pressure based on speed (simplified)
                const dx = x - lastX;
                const dy = y - lastY;
                const speed = Math.sqrt(dx*dx + dy*dy);
                const pressureFactor = Math.min(1, speed / 20);
                const pressureRange = settings.pressureSize / 100;
                const sizeVariation = settings.size * pressureRange * pressureFactor;
                width = settings.size + (settings.startWidth > 0 ? sizeVariation : -sizeVariation);
                width = Math.max(1, Math.min(50, width));
            }

            ctx.lineWidth = width;
            ctx.lineTo(x, y);
            ctx.stroke();
            lastX = x;
            lastY = y;
            ctx.beginPath();
            ctx.moveTo(x, y);
            applySettings();
        }
    }

    function stopDrawing(e) {
        if (isDrawing) {
            isDrawing = false;
            ctx.closePath();
            saveStroke();
        }
    }

    // ---- undo (right-click) ----
    function saveStroke() {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        strokeHistory.push(imageData);
        if (strokeHistory.length > 30) strokeHistory.shift();
    }

    function undoLastStroke() {
        if (strokeHistory.length === 0) return;
        const prev = strokeHistory.pop();
        ctx.putImageData(prev, 0, 0);
        applySettings();
        isDrawing = false;
        ctx.beginPath();
    }

    // ---- tool switching ----
    function switchTool(tool) {
        currentTool = tool;
        // update active button
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
        // reset composite operation
        ctx.globalCompositeOperation = 'source-over';
        applySettings();
        updateSettingsUI();
    }

    // ---- init ----
    function init() {
        resizeCanvas();
        applySettings();
        switchTool('pen');
        updateSettingsUI();

        // canvas events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseleave', stopDrawing);
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchcancel', stopDrawing);
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            undoLastStroke();
        });

        // tool buttons
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                switchTool(this.dataset.tool);
            });
        });

        // resize
        window.addEventListener('resize', () => {
            const oldData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resizeCanvas();
            ctx.putImageData(oldData, 0, 0);
            applySettings();
        });

        // color wheel click (demo)
        const wheel = document.querySelector('.color-wheel-mock');
        if (wheel) {
            wheel.addEventListener('click', function() {
                const hue = Math.floor(Math.random() * 360);
                settings.color = `hsl(${hue}, 80%, 50%)`;
                applySettings();
            });
        }

        // presets (simple demo)
        document.querySelectorAll('#rightSidebar .grid span').forEach((cell, index) => {
            cell.addEventListener('click', function() {
                const size = 4 + (index % 10);
                settings.size = Math.min(40, Math.max(2, size));
                const hue = (index * 25) % 360;
                settings.color = `hsl(${hue}, 80%, 50%)`;
                applySettings();
                updateSettingsUI();
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
