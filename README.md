# OmniSwarm – Decentralized WebGPU AI Agent Network

> **Made by Harshit Kashyap**  
> Zero-cost distributed AI compute — entirely inside the browser.

---

## Overview

OmniSwarm turns every browser tab into a node in a global AI compute swarm.
When you open the URL your machine's GPU is temporarily added to the network.
You can assign a massive task (summarizing 10,000 documents, running an AutoGPT-style agent, etc.) and the browsers in the network will automatically:

1. **Split** the work into chunks
2. **Process** each chunk locally using WebGPU matrix operations
3. **Stitch** the results back together and return them to you

No API keys. No AWS bills. No central server holding your data.

---

## Architecture

| Layer | Technology | Purpose |
|---|---|---|
| Compute | **WebGPU** + Transformers.js | Run quantized LLMs (Phi-3 / Llama-3-8B) locally in the browser |
| Concurrency | **Web Workers** (`worker.js`) | Off-thread LLM inference — UI never drops a frame |
| Networking | **WebRTC** Data Channels (`swarm.js`) | Direct peer-to-peer task distribution |
| Storage | **OPFS** (Origin Private File System) | Cache gigabytes of model weights locally |
| Visualiser | **Canvas API** (`canvas.js`) | Physics-based swarm grid with animated data-packet lasers |

---

## File Structure

```
OmniSwarm/
├── index.html   – Main command-centre UI
├── style.css    – Dark glassmorphic theme
├── app.js       – Main orchestrator (boot, gamification, prompt matrix)
├── worker.js    – Web Worker: LLM inference & OPFS
├── swarm.js     – WebRTC peer mesh & task distribution
└── canvas.js    – Swarm visualiser (Canvas)
```

---

## Features

- **Swarm Visualiser** — interactive physics-based grid; glowing nodes fire animated "laser" data packets in real-time
- **Gamified Dashboard** — glassmorphic sidebar with an animated compute-level ring, XP bar, and dynamic stats
- **Prompt Matrix** — multi-file IDE layout (CSS Grid, drag-and-drop ready) for writing agent instructions
- **WebGPU Detection** — automatic fallback to CPU mode when WebGPU is unavailable
- **Zero external dependencies** — pure HTML / CSS / vanilla JS; no bundler required

---

## Running Locally

Because the app uses Web Workers and OPFS, it must be served over HTTP (not opened as a `file://` URL).

```bash
# Python 3
python -m http.server 8080

# Node.js (npx)
npx serve .
```

Then open **http://localhost:8080** in a WebGPU-capable browser (Chrome 113+, Edge 113+).

---

## Browser Requirements

| Feature | Minimum browser |
|---|---|
| WebGPU | Chrome/Edge 113+, Chrome Canary |
| WebRTC | All modern browsers |
| Web Workers | All modern browsers |
| OPFS | Chrome 86+, Firefox 111+ |

WebGPU is optional — the swarm falls back to CPU inference automatically.

---

## Attribution

OmniSwarm was designed and built by **Harshit Kashyap**.  
GitHub: [@Harshitkashyap2027](https://github.com/Harshitkashyap2027)

Please keep the attribution visible if you fork or deploy this project.
