/* ============================================================
   mbsm-colorpicker.js
   Selector de color propio (cuadro de saturación/valor + barra de
   tono + hex), para no depender del selector nativo del sistema
   operativo -- que en Android se ve genérico y distinto en cada
   dispositivo, y es inconsistente entre móvil y PC. Inspirado en el
   selector por rueda/cuadro de Blockbench, implementado sin
   dependencias.

   Uso:
     const picker = MBSMColorPicker.create(containerEl, {
       initial: '#e0ac7cff',   // hex de 6 u 8 dígitos (con o sin alpha)
       alpha: false,           // true para mostrar control de opacidad
       onChange: (hex) => {...}
     });
     picker.setColor('#ffffffff');
     picker.getColor(); // -> '#rrggbbaa'
   ============================================================ */
const MBSMColorPicker = (() => {
  function hexToHsv(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h, s, v, a };
  }
  function hsvToRgb(h, s, v) {
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
  }
  function toHex2(n) { return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0'); }
  function hsvaToHex(h, s, v, a) {
    const [r, g, b] = hsvToRgb(h, s, v);
    return '#' + toHex2(r) + toHex2(g) + toHex2(b) + toHex2(a * 255);
  }

  function create(container, opts) {
    opts = opts || {};
    const showAlpha = !!opts.alpha;
    let hsv = hexToHsv(opts.initial || '#e0ac7cff');

    container.classList.add('mbsmcp');
    container.innerHTML = `
      <div class="mbsmcp-sv" tabindex="0">
        <div class="mbsmcp-sv-white"></div>
        <div class="mbsmcp-sv-black"></div>
        <div class="mbsmcp-sv-handle"></div>
      </div>
      <div class="mbsmcp-hue-row">
        <div class="mbsmcp-hue" tabindex="0">
          <div class="mbsmcp-hue-handle"></div>
        </div>
      </div>
      ${showAlpha ? `
      <div class="mbsmcp-alpha-row">
        <div class="mbsmcp-alpha" tabindex="0">
          <div class="mbsmcp-alpha-fill"></div>
          <div class="mbsmcp-alpha-handle"></div>
        </div>
      </div>` : ''}
      <div class="mbsmcp-bottom">
        <span class="mbsmcp-swatch"></span>
        <input type="text" class="mbsmcp-hex" spellcheck="false" maxlength="9">
      </div>
    `;

    const sv = container.querySelector('.mbsmcp-sv');
    const svHandle = container.querySelector('.mbsmcp-sv-handle');
    const hue = container.querySelector('.mbsmcp-hue');
    const hueHandle = container.querySelector('.mbsmcp-hue-handle');
    const alpha = container.querySelector('.mbsmcp-alpha');
    const alphaHandle = container.querySelector('.mbsmcp-alpha-handle');
    const alphaFill = container.querySelector('.mbsmcp-alpha-fill');
    const swatch = container.querySelector('.mbsmcp-swatch');
    const hexInput = container.querySelector('.mbsmcp-hex');

    function currentHex() { return hsvaToHex(hsv.h, hsv.s, hsv.v, showAlpha ? hsv.a : 1); }

    function render() {
      const hueRgb = hsvToRgb(hsv.h, 1, 1);
      const hueColor = `rgb(${hueRgb[0]},${hueRgb[1]},${hueRgb[2]})`;
      sv.style.background = hueColor;
      svHandle.style.left = (hsv.s * 100) + '%';
      svHandle.style.top = ((1 - hsv.v) * 100) + '%';
      svHandle.style.background = currentHex().slice(0, 7);
      hueHandle.style.left = (hsv.h / 360 * 100) + '%';
      const hex = currentHex();
      swatch.style.background = hex.slice(0, 7);
      swatch.style.opacity = showAlpha ? hsv.a : 1;
      hexInput.value = hex;
      if (showAlpha) {
        alphaFill.style.background = `linear-gradient(to right, transparent, ${hex.slice(0, 7)})`;
        alphaHandle.style.left = (hsv.a * 100) + '%';
      }
    }

    function emit() {
      if (typeof opts.onChange === 'function') opts.onChange(currentHex());
    }

    function dragify(el, onMove) {
      function pos(e) {
        const rect = el.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
        return { x, y };
      }
      let dragging = false;
      const start = (e) => { e.preventDefault(); dragging = true; onMove(pos(e)); };
      const move = (e) => { if (!dragging) return; e.preventDefault(); onMove(pos(e)); };
      const end = () => { dragging = false; };
      el.addEventListener('mousedown', start);
      window.addEventListener('mousemove', move);
      window.addEventListener('mouseup', end);
      el.addEventListener('touchstart', start, { passive: false });
      el.addEventListener('touchmove', move, { passive: false });
      window.addEventListener('touchend', end);
      el.style.touchAction = 'none';
    }

    dragify(sv, (p) => { hsv.s = p.x; hsv.v = 1 - p.y; render(); emit(); });
    dragify(hue, (p) => { hsv.h = p.x * 360; render(); emit(); });
    if (showAlpha) dragify(alpha, (p) => { hsv.a = p.x; render(); emit(); });

    hexInput.addEventListener('change', () => {
      const v = hexInput.value.trim();
      if (/^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) {
        hsv = hexToHsv(v);
        if (!showAlpha) hsv.a = 1;
        render();
        emit();
      } else {
        hexInput.value = currentHex();
      }
    });

    render();

    return {
      getColor: currentHex,
      setColor(hex) { hsv = hexToHsv(hex); if (!showAlpha) hsv.a = 1; render(); }
    };
  }

  return { create };
})();
