// app.js – drawing app with pen, eraser, and text tools

(function() {
  "use strict";

  // ----- DOM refs -----
  const canvas = document.getElementById('drawCanvas');
  const ctx = canvas.getContext('2d');
  const toolbar = document.getElementById('toolbar');
  const textInput = document.getElementById('textInput');

  // ----- state -----
  let isDrawing = false;
  let currentTool = 'pen';      // 'pen' | 'eraser' | 'text'
  let lastX = 0;
  let lastY = 0;

  // pen settings
  const penColor = '#1e293b';
  const penWidth = 3;

  // eraser settings (width is larger for comfort)
  const eraserWidth = 18;

  // ----- resize canvas to fill wrapper -----
  function resizeCanvas() {
    const wrapper = document.getElementById('canvas-wrapper');
    const rect = wrapper.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    // re-draw background (white) – but we keep it white anyway
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ----- drawing helpers -----
  function startDraw(e) {
    if (currentTool === 'text') return; // text tool uses click, not drag
    e.preventDefault();
    const pos = getCanvasCoords(e);
    if (!pos) return;
    isDrawing = true;
    lastX = pos.x;
    lastY = pos.y;

    // for pen/eraser: draw a single dot if we only click (mousedown + mouseup)
    // but we handle that in move + up; we just set last pos.
  }

  function draw(e) {
    if (!isDrawing) return;
    if (currentTool === 'text') return; // ignore drag on text tool
    e.preventDefault();

    const pos = getCanvasCoords(e);
    if (!pos) return;

    const x = pos.x;
    const y = pos.y;

    if (currentTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = penColor;
      ctx.lineWidth = penWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else if (currentTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = eraserWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    lastX = x;
    lastY = y;
  }

  function endDraw(e) {
    if (isDrawing) {
      isDrawing = false;
      // optional: finalize, but nothing else needed
    }
  }

  // ----- get coordinates from mouse or touch -----
  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches) {
      // touch event
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return null;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // scale to canvas internal size (if CSS size differs)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // clamp inside canvas
    return {
      x: Math.min(Math.max(x, 0), canvas.width),
      y: Math.min(Math.max(y, 0), canvas.height)
    };
  }

  // ----- text tool: place text on click -----
  function handleTextPlace(e) {
    if (currentTool !== 'text') return;
    e.preventDefault();

    const pos = getCanvasCoords(e);
    if (!pos) return;

    // show text input at click position (approx)
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // convert canvas coords back to page coords for input positioning
    const pageX = rect.left + (pos.x / scaleX);
    const pageY = rect.top + (pos.y / scaleY);

    // position input near click (but keep it inside viewport)
    let left = pageX - 130; // center roughly
    let top = pageY - 30;

    // clamp to viewport
    left = Math.min(Math.max(left, 10), window.innerWidth - 280);
    top = Math.min(Math.max(top, 80), window.innerHeight - 100);

    textInput.style.left = left + 'px';
    textInput.style.top = top + 'px';
    textInput.style.display = 'block';
    textInput.value = '';
    textInput.focus();
  }

  // ----- confirm text input and draw on canvas -----
  function commitText() {
    const text = textInput.value.trim();
    if (text === '') {
      textInput.style.display = 'none';
      return;
    }

    // get position from input style
    const left = parseFloat(textInput.style.left) || 100;
    const top = parseFloat(textInput.style.top) || 100;

    // convert page position to canvas coordinates
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // approximate center of input as anchor
    const inputWidth = textInput.offsetWidth || 200;
    const inputHeight = textInput.offsetHeight || 40;

    const cx = (left + inputWidth / 2 - rect.left) * scaleX;
    const cy = (top + inputHeight / 2 - rect.top) * scaleY;

    // draw text on canvas
    ctx.save();
    ctx.font = '32px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = penColor;
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.fillText(text, cx, cy);
    ctx.restore();

    // hide input
    textInput.style.display = 'none';
    textInput.value = '';
  }

  // ----- toolbar switching -----
  function setTool(tool) {
    currentTool = tool;

    // update active button
    document.querySelectorAll('.toolbar button').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });

    // change cursor style
    if (tool === 'pen') {
      canvas.style.cursor = 'crosshair';
    } else if (tool === 'eraser') {
      canvas.style.cursor = 'cell';
    } else if (tool === 'text') {
      canvas.style.cursor = 'text';
    }

    // hide text input if switching away from text
    if (tool !== 'text') {
      textInput.style.display = 'none';
      textInput.blur();
    }
  }

  // ----- event listeners -----
  function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Toolbar buttons
    toolbar.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const tool = btn.dataset.tool;
      if (tool) {
        setTool(tool);
      }
    });

    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
      if (currentTool === 'text') {
        handleTextPlace(e);
        return;
      }
      startDraw(e);
    });
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', endDraw);

    // Touch events (with passive: false to prevent scrolling)
    canvas.addEventListener('touchstart', (e) => {
      if (currentTool === 'text') {
        handleTextPlace(e);
        return;
      }
      startDraw(e);
    }, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', endDraw, { passive: false });
    canvas.addEventListener('touchcancel', endDraw, { passive: false });

    // Text input: commit on Enter or blur
    textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitText();
      } else if (e.key === 'Escape') {
        textInput.style.display = 'none';
        textInput.value = '';
      }
    });
    textInput.addEventListener('blur', () => {
      // if there is text, commit; else just hide
      if (textInput.value.trim() !== '') {
        commitText();
      } else {
        textInput.style.display = 'none';
      }
    });

    // extra: click on canvas while text input visible -> commit
    canvas.addEventListener('click', (e) => {
      if (textInput.style.display === 'block') {
        // if click outside input, commit
        const target = e.target;
        if (target !== textInput) {
          commitText();
        }
      }
    });

    // set initial tool
    setTool('pen');
  }

  // run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
