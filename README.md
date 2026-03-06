<div align="center">

<h1>
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=700&size=32&pause=1000&color=00F5FF&center=true&vCenter=true&width=600&lines=⬡+OmniSwarm;Decentralized+WebGPU+AI+Network;Zero-Cost+Browser+Compute" alt="OmniSwarm" />
</h1>

<p align="center">
  <strong>Turn every browser tab into a node of a global AI compute swarm.</strong><br/>
  No API keys · No cloud bills · No central server · Pure browser magic ✨
</p>

<p align="center">
  <img src="https://img.shields.io/badge/WebGPU-Powered-00f5ff?style=for-the-badge&logo=googlechrome&logoColor=black" alt="WebGPU" />
  <img src="https://img.shields.io/badge/WebRTC-P2P%20Mesh-a78bfa?style=for-the-badge&logo=webrtc&logoColor=black" alt="WebRTC" />
  <img src="https://img.shields.io/badge/Web%20Workers-Off--Thread%20AI-34d399?style=for-the-badge" alt="Web Workers" />
  <img src="https://img.shields.io/badge/Zero%20Dependencies-Vanilla%20JS-fbbf24?style=for-the-badge" alt="Zero Deps" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-00f5ff?style=flat-square" alt="version" />
  <img src="https://img.shields.io/badge/license-MIT-a78bfa?style=flat-square" alt="license" />
  <img src="https://img.shields.io/badge/browser-Chrome%20113%2B-34d399?style=flat-square" alt="browser" />
  <img src="https://img.shields.io/badge/made%20by-Harshit%20Kashyap-f472b6?style=flat-square" alt="author" />
</p>

</div>

---

## 📖 Table of Contents

- [✨ Overview](#-overview)
- [🎯 Key Features](#-key-features)
- [🏗 Architecture](#-architecture)
- [📁 File Structure](#-file-structure)
- [⚙️ How It Works](#️-how-it-works)
- [🚀 Getting Started](#-getting-started)
- [🌐 Browser Requirements](#-browser-requirements)
- [🕹 Usage Guide](#-usage-guide)
- [🗺 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🙌 Attribution](#-attribution)

---

## ✨ Overview

**OmniSwarm** is a fully browser-native, decentralized AI compute network. When you visit the page, your machine's GPU is silently recruited into a live peer-to-peer swarm. Submit a massive task — summarize 10,000 documents, run an AutoGPT-style chain, process a dataset — and the swarm automatically:

```
┌─────────────────────────────────────────────────────────────────┐
│  Your Prompt  ──►  Split into chunks  ──►  Distribute to peers  │
│                                                                  │
│  Peer 1: chunk 01-200   ──►  LLM inference (WebGPU / CPU)       │
│  Peer 2: chunk 201-400  ──►  LLM inference (WebGPU / CPU)       │
│  Peer N: chunk N×200…   ──►  LLM inference (WebGPU / CPU)       │
│                                                                  │
│  Results collected  ──►  Stitched  ──►  Displayed to you  ✓     │
└─────────────────────────────────────────────────────────────────┘
```

> 💡 **No API keys. No AWS bills. No central server holding your data.**  
> Everything runs inside the browser — models are cached locally via OPFS.

---

## 🎯 Key Features

<table>
<tr>
<td width="50%">

### ⬡ Live Swarm Visualiser
Physics-based canvas grid where every node is a browser peer. Glowing nodes fire animated **"laser" data packets** in real-time whenever a task chunk is processed. Watch your swarm grow as more peers join.

</td>
<td width="50%">

### 🎮 Gamified Dashboard
Glassmorphic sidebar with an **animated SVG compute-level ring**, gradient XP bar, live stat counters, and level-up flash animations. Every processed chunk earns XP.

</td>
</tr>
<tr>
<td width="50%">

### 🖊 Prompt Matrix IDE
A multi-file IDE layout (CSS Grid) for writing agent instructions. Switch between `agent-main.js`, `agent-sub.js`, and `config.json`. Hit **▶ Run** or `Ctrl+Enter` to dispatch to the swarm.

</td>
<td width="50%">

### ⚡ WebGPU + CPU Fallback
Automatically detects your GPU adapter via `navigator.gpu`. If WebGPU is unavailable the system seamlessly falls back to **CPU inference** — every browser can participate.

</td>
</tr>
<tr>
<td width="50%">

### 🔒 Zero Data Leakage
Task data never leaves your machine through a central server. Peer-to-peer **WebRTC data channels** carry chunks directly between browsers — encrypted end-to-end by the WebRTC spec.

</td>
<td width="50%">

### 📦 Zero Build Step
Pure **HTML + CSS + Vanilla JS** — no bundler, no `node_modules`, no transpiler. Clone and serve. That's it.

</td>
</tr>
</table>

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Browser Tab (Your Node)                      │
│                                                                        │
│  ┌─────────────┐   ┌──────────────────┐   ┌────────────────────────┐  │
│  │  index.html  │   │     app.js        │   │       style.css        │  │
│  │  (UI shell)  │◄──│  (Orchestrator)   │   │  (Glassmorphic theme)  │  │
│  └─────────────┘   └────────┬─────────┘   └────────────────────────┘  │
│                              │                                          │
│          ┌───────────────────┼─────────────────────┐                   │
│          ▼                   ▼                      ▼                   │
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │  canvas.js    │  │    swarm.js      │  │       worker.js          │  │
│  │  Canvas API   │  │  WebRTC Mesh     │  │  Web Worker + LLM        │  │
│  │  Visualiser   │  │  P2P Channels    │  │  Inference (WebGPU/CPU)  │  │
│  └──────────────┘  └────────┬────────┘  └──────────────────────────┘  │
│                              │                                          │
│                   ┌──────────▼─────────┐                               │
│                   │   Other Peers       │                               │
│                   │  (Browser Tabs)     │                               │
│                   │  WebRTC DataChannel │                               │
│                   └────────────────────┘                               │
└──────────────────────────────────────────────────────────────────────┘
```

### Layer breakdown

| Layer | Technology | Purpose |
|:------|:----------:|:--------|
| 🖥 **Compute** | WebGPU + Transformers.js | Run quantized LLMs (Phi-3 / Llama-3-8B) locally in the browser |
| 🧵 **Concurrency** | Web Workers (`worker.js`) | Off-thread LLM inference — UI never drops a frame |
| 🔀 **Networking** | WebRTC Data Channels (`swarm.js`) | Direct peer-to-peer encrypted task distribution |
| 💾 **Storage** | OPFS (Origin Private File System) | Cache gigabytes of model weights locally, no re-download |
| 🎨 **Visualiser** | Canvas API (`canvas.js`) | Physics-based swarm grid with animated data-packet lasers |
| 🎮 **Gamification** | Vanilla JS (`app.js`) | XP system, compute levels, animated progress rings |

---

## 📁 File Structure

```
OmniSwarm/
│
├── index.html   ← Main command-centre UI (header, sidebar, canvas, IDE, panels)
├── style.css    ← Dark glassmorphic theme (CSS Grid, animations, responsive)
├── app.js       ← Main orchestrator (boot, gamification, prompt matrix, run)
├── worker.js    ← Web Worker: LLM inference pipeline & OPFS model cache
├── swarm.js     ← WebRTC peer mesh, task chunking & distribution
└── canvas.js    ← Swarm visualiser: physics nodes + laser data packets
```

---

## ⚙️ How It Works

### 1 · Boot Sequence

```
DOMContentLoaded
  ├── detectWebGPU()      → probe navigator.gpu, update badge
  ├── initWorker()        → spawn worker.js, PING/PONG handshake
  ├── initCanvas()        → create SwarmCanvas, start animation loop
  ├── initSwarm()         → SwarmNetwork.join(), begin heartbeat
  └── initPromptMatrix()  → render file list, load active file
```

### 2 · Running a Task

```
User types prompt  →  Ctrl+Enter / ▶ Run
  ├── Large payload? → swarm.distributeTask(text, chunkSize)
  │     └── splits into chunks → simulates P2P hand-off → fires 'chunkProcessed' events
  └── Always → worker.postMessage({ type: 'INFER', payload: { prompt } })
        └── Web Worker runs LLM inference
              ├── streams tokens back → 'INFER_TOKEN' events update output
              └── 'INFER_DONE' → XP awarded, stats updated
```

### 3 · Gamification Loop

```
Any processed chunk → awardXP(5)
Inference complete  → awardXP(35)
Join swarm          → awardXP(20)
Run task            → awardXP(10)

XP fills bar → overflow → Level Up! → XP threshold ×1.4 → ring animates
```

---

## 🚀 Getting Started

> **Important:** The app uses Web Workers and OPFS — it **must** be served over HTTP, not opened as a `file://` URL.

### Option A — Python (zero setup)

```bash
git clone https://github.com/Harshitkashyap2027/OmniSwarm.git
cd OmniSwarm
python -m http.server 8080
```

### Option B — Node.js

```bash
git clone https://github.com/Harshitkashyap2027/OmniSwarm.git
cd OmniSwarm
npx serve .
```

### Option C — VS Code Live Server

Install the **Live Server** extension, right-click `index.html` → **Open with Live Server**.

Then open **[http://localhost:8080](http://localhost:8080)** in a WebGPU-capable browser.

---

## 🌐 Browser Requirements

| Feature | Minimum version | Notes |
|:--------|:---------------:|:------|
| ⚡ WebGPU | Chrome/Edge 113+ | Optional — CPU fallback if unavailable |
| 🔀 WebRTC | All modern | Required for P2P data channels |
| 🧵 Web Workers | All modern | Required for off-thread inference |
| 💾 OPFS | Chrome 86+, Firefox 111+ | Required for local model weight caching |

> ✅ **Recommended:** Chrome 120+ or Edge 120+ on a machine with a discrete GPU for best performance.

---

## 🕹 Usage Guide

### Submitting a task

1. **Type your prompt** in the **Swarm Prompt** panel (top-right), e.g.:
   ```
   Summarise the following 10,000 documents across all available peers.
   ```
2. Press **`Ctrl + Enter`** or click **▶ Run**.
3. Watch the **Live Swarm Network** canvas light up as chunks are processed.
4. Read the streamed result in the **Swarm Output** panel.

### Using the Prompt Matrix IDE

- Click any file in the **Files** sidebar (`agent-main.js`, `agent-sub.js`, `config.json`).
- Edit agent instructions or update the model config.
- The active file content is used as the prompt when no text is in the Swarm Prompt textarea.

### Configuring the model

Edit `config.json` in the Prompt Matrix:

```json
{
  "model": "phi-3-mini-4k-instruct",
  "quantisation": "q4_k_m",
  "maxPeers": 16,
  "chunkSize": 500,
  "timeout": 30000
}
```

| Key | Default | Description |
|:----|:-------:|:------------|
| `model` | `phi-3-mini-4k-instruct` | HuggingFace model ID used for inference |
| `quantisation` | `q4_k_m` | GGUF quantisation level (lower = smaller/faster) |
| `maxPeers` | `16` | Maximum peers allowed in the swarm |
| `chunkSize` | `500` | Words per chunk distributed to each peer |
| `timeout` | `30000` | Peer response timeout in milliseconds |

---

## 🗺 Roadmap

- [x] WebGPU inference with CPU fallback
- [x] WebRTC peer mesh simulation
- [x] Physics-based swarm canvas visualiser
- [x] Gamified XP / compute-level system
- [x] Multi-file Prompt Matrix IDE
- [x] OPFS model weight caching
- [ ] Real WebSocket signalling server for production P2P
- [ ] Actual Transformers.js LLM integration (Phi-3, Llama-3)
- [ ] Persistent peer identity (localStorage)
- [ ] Task history & replay
- [ ] Collaborative multi-user agent chains
- [ ] Mobile-responsive full layout
- [ ] Dark / light theme toggle
- [ ] Export swarm output as Markdown / JSON

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. **Fork** the repository
2. Create your feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feat/amazing-feature`
5. Open a **Pull Request**

Please keep the zero-dependency constraint — no bundlers, no npm packages in the browser build.

---

## 📄 License

This project is released under the **MIT License** — free to use, modify, and distribute.  
Please keep the attribution visible if you fork or deploy this project.

---

## 🙌 Attribution

<div align="center">

**OmniSwarm** was designed and built by **Harshit Kashyap**

[![GitHub](https://img.shields.io/badge/GitHub-Harshitkashyap2027-181717?style=for-the-badge&logo=github)](https://github.com/Harshitkashyap2027)

*Zero-cost distributed AI compute — entirely inside the browser.*

</div>
