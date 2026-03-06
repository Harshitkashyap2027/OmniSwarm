/**
 * OmniSwarm – Swarm Visualiser (canvas.js)
 * Physics-based interactive node grid rendered on a Canvas element.
 * Every peer is a glowing node; animated data-packet "lasers" fire between
 * nodes when data is being processed.
 *
 * Made by Harshit Kashyap
 */

'use strict';

class SwarmCanvas {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._nodes = [];
    this._packets = [];
    this._animFrame = null;
    this._running = false;
    this._nodeCount = 6;
    this._localNodeIdx = 0;

    this._resize();
    window.addEventListener('resize', () => this._resize());
    canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  start() {
    if (this._running) return;
    this._running = true;
    this._spawnNodes(this._nodeCount);
    this._loop();
  }

  stop() {
    this._running = false;
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
  }

  setNodeCount(n) {
    this._nodeCount = Math.max(1, n);
    this._spawnNodes(this._nodeCount);
  }

  /** Fire a data-packet laser from src node to dst node */
  firePacket(srcIdx, dstIdx, color = '#00f5ff') {
    if (!this._nodes[srcIdx] || !this._nodes[dstIdx]) return;
    this._packets.push({
      src: srcIdx,
      dst: dstIdx,
      progress: 0,
      speed: 0.012 + Math.random() * 0.018,
      color,
      size: 3 + Math.random() * 3,
    });
  }

  /** Pulse all nodes (e.g. when a new peer joins) */
  pulseAll() {
    this._nodes.forEach((n) => { n.pulseRadius = 0; n.pulsing = true; });
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  _resize() {
    const rect = this._canvas.parentElement
      ? this._canvas.parentElement.getBoundingClientRect()
      : { width: 600, height: 400 };
    this._canvas.width = rect.width || 600;
    this._canvas.height = rect.height || 400;
    if (this._nodes.length) this._repositionNodes();
  }

  _spawnNodes(count) {
    this._nodes = [];
    const w = this._canvas.width;
    const h = this._canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.32;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      const isLocal = i === this._localNodeIdx;
      this._nodes.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        baseX: cx + Math.cos(angle) * radius,
        baseY: cy + Math.sin(angle) * radius,
        r: isLocal ? 10 : 7,
        color: isLocal ? '#a78bfa' : this._randomPeerColor(),
        glow: isLocal ? '#a78bfa' : '#00f5ff',
        label: isLocal ? 'YOU' : `P${i}`,
        pulsing: false,
        pulseRadius: 0,
        hover: false,
        isLocal,
        activity: 0,
      });
    }
  }

  _repositionNodes() {
    const w = this._canvas.width;
    const h = this._canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.32;
    const count = this._nodes.length;
    this._nodes.forEach((n, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      n.baseX = cx + Math.cos(angle) * radius;
      n.baseY = cy + Math.sin(angle) * radius;
      n.x = n.baseX;
      n.y = n.baseY;
    });
  }

  _loop() {
    if (!this._running) return;
    this._update();
    this._draw();
    this._animFrame = requestAnimationFrame(() => this._loop());
  }

  _update() {
    const t = Date.now() / 1000;
    this._nodes.forEach((n, i) => {
      // Gentle float
      n.x = n.baseX + Math.sin(t * 0.7 + i * 1.2) * 6;
      n.y = n.baseY + Math.cos(t * 0.5 + i * 0.9) * 6;

      // Pulse animation
      if (n.pulsing) {
        n.pulseRadius += 1.4;
        if (n.pulseRadius > 60) { n.pulsing = false; n.pulseRadius = 0; }
      }

      // Activity decay
      if (n.activity > 0) n.activity = Math.max(0, n.activity - 0.02);
    });

    // Update packets
    this._packets = this._packets.filter((p) => {
      p.progress += p.speed;
      if (p.progress >= 1) {
        if (this._nodes[p.dst]) {
          this._nodes[p.dst].activity = 1;
          this._nodes[p.dst].pulsing = true;
          this._nodes[p.dst].pulseRadius = 0;
        }
        return false;
      }
      return true;
    });
  }

  _draw() {
    const ctx = this._ctx;
    const w = this._canvas.width;
    const h = this._canvas.height;

    // Background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(5, 5, 20, 0.92)';
    ctx.fillRect(0, 0, w, h);

    // Grid dots
    this._drawGrid(ctx, w, h);

    // Edges between nodes
    this._drawEdges(ctx);

    // Data packets
    this._drawPackets(ctx);

    // Nodes
    this._nodes.forEach((n) => this._drawNode(ctx, n));
  }

  _drawGrid(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 245, 255, 0.04)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawEdges(ctx) {
    const nodes = this._nodes;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const activity = Math.max(a.activity, b.activity);
        const alpha = 0.08 + activity * 0.35;
        ctx.save();
        ctx.strokeStyle = `rgba(0, 245, 255, ${alpha})`;
        ctx.lineWidth = 0.8 + activity;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  _drawPackets(ctx) {
    this._packets.forEach((p) => {
      const src = this._nodes[p.src];
      const dst = this._nodes[p.dst];
      if (!src || !dst) return;

      const x = src.x + (dst.x - src.x) * p.progress;
      const y = src.y + (dst.y - src.y) * p.progress;

      // Trail
      ctx.save();
      const grad = ctx.createLinearGradient(src.x, src.y, x, y);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, p.color);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();

      // Packet dot
      ctx.save();
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 14;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  _drawNode(ctx, n) {
    // Pulse ring
    if (n.pulsing && n.pulseRadius > 0) {
      ctx.save();
      ctx.strokeStyle = n.glow;
      ctx.globalAlpha = 1 - n.pulseRadius / 60;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + n.pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Glow
    ctx.save();
    ctx.shadowColor = n.glow;
    ctx.shadowBlur = n.hover ? 28 : 16 + n.activity * 20;

    // Core circle
    const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, n.color);
    grad.addColorStop(1, n.glow + '88');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Label
    ctx.save();
    ctx.fillStyle = n.hover ? '#ffffff' : 'rgba(200,230,255,0.85)';
    ctx.font = `bold ${n.isLocal ? 11 : 9}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n.label, n.x, n.y + n.r + 13);
    ctx.restore();
  }

  _onMouseMove(e) {
    const rect = this._canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    this._nodes.forEach((n) => {
      const dx = n.x - mx;
      const dy = n.y - my;
      n.hover = Math.sqrt(dx * dx + dy * dy) < n.r + 10;
    });
  }

  _randomPeerColor() {
    const colors = ['#22d3ee', '#34d399', '#f472b6', '#fbbf24', '#60a5fa', '#a3e635'];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

window.SwarmCanvas = SwarmCanvas;
