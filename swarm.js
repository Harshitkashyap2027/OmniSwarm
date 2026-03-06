/**
 * OmniSwarm – WebRTC Peer Mesh (swarm.js)
 * Manages peer discovery, direct data channels, and task distribution.
 *
 * Made by Harshit Kashyap
 */

'use strict';

class SwarmNetwork extends EventTarget {
  constructor() {
    super();

    /** @type {Map<string, RTCPeerConnection>} */
    this._peers = new Map();

    /** @type {Map<string, RTCDataChannel>} */
    this._channels = new Map();

    /** @type {string} */
    this.peerId = this._generateId();

    /** @type {boolean} */
    this.connected = false;

    // Simulated peer list (in production this comes from a signalling server)
    this._simulatedPeers = [];
    this._taskQueue = [];
    this._onlineCount = 1; // includes self
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Joins the swarm – in production this opens a WebSocket to the signalling server */
  async join() {
    this.connected = true;
    this._onlineCount = Math.floor(Math.random() * 12) + 2;
    this._startHeartbeat();
    this._dispatchSwarmEvent('joined', { peerId: this.peerId, peerCount: this._onlineCount });
    return this.peerId;
  }

  /** Leaves the swarm and closes all peer connections */
  leave() {
    this._peers.forEach((pc) => pc.close());
    this._channels.forEach((ch) => ch.close());
    this._peers.clear();
    this._channels.clear();
    this.connected = false;
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
    this._dispatchSwarmEvent('left', { peerId: this.peerId });
  }

  /**
   * Distributes a large task by splitting text into chunks and simulating
   * hand-off to peer nodes over WebRTC data channels.
   * @param {string} text
   * @param {number} [chunkSize=500]
   * @returns {Promise<string[]>}  array of per-chunk summaries
   */
  async distributeTask(text, chunkSize = 500) {
    const words = text.split(/\s+/);
    const chunks = [];
    for (let i = 0; i < words.length; i += chunkSize) {
      chunks.push(words.slice(i, i + chunkSize).join(' '));
    }

    const results = await Promise.all(
      chunks.map((chunk, idx) => this._processChunk(chunk, idx))
    );

    return results;
  }

  get peerCount() {
    return this._onlineCount;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Simulate processing a chunk (locally or on a peer) */
  _processChunk(chunk, idx) {
    return new Promise((resolve) => {
      const delay = 200 + Math.random() * 600;
      setTimeout(() => {
        const words = chunk.split(/\s+/);
        const result = `[Peer ${this._onlineCount > 1 ? (idx % (this._onlineCount - 1)) + 1 : 1}] Processed ${words.length} words: "${words.slice(0, 8).join(' ')}…"`;
        this._dispatchSwarmEvent('chunkProcessed', { idx, result, total: chunk.length });
        resolve(result);
      }, delay);
    });
  }

  /** Creates a raw RTCPeerConnection (wired up, but signalling is simulated) */
  _createPeerConnection(remotePeerId) {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this._dispatchSwarmEvent('iceCandidate', { remotePeerId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      this._dispatchSwarmEvent('peerStateChange', {
        remotePeerId,
        state: pc.connectionState,
      });
    };

    this._peers.set(remotePeerId, pc);
    return pc;
  }

  _startHeartbeat() {
    this._heartbeatTimer = setInterval(() => {
      // Randomly fluctuate peer count to simulate real network churn
      const delta = Math.random() < 0.4 ? (Math.random() < 0.5 ? 1 : -1) : 0;
      this._onlineCount = Math.max(1, this._onlineCount + delta);
      this._dispatchSwarmEvent('heartbeat', {
        peerId: this.peerId,
        peerCount: this._onlineCount,
        timestamp: Date.now(),
      });
    }, 3000);
  }

  _generateId() {
    return 'peer-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  }

  _dispatchSwarmEvent(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { detail }));
  }
}

// Export as module-compatible global
window.SwarmNetwork = SwarmNetwork;
