# EcoCity AI

**Smart waste management for a cleaner city.** Built for the *Fix My City* hackathon in Skopje.

EcoCity AI monitors bin fill levels, flags containers that are about to overflow, and plans efficient garbage collection routes. Residents can also photograph an item and instantly learn which bin it belongs in.

> **Prototype notice:** all sensor readings, bin locations and the street grid are **simulated**. The project demonstrates the concept; it is not connected to real bins.

# Hackathon

This project was created during a hackathon in Skopje, North Macedonia, on the theme "Fix My City". It was built by our team within the time limits of the event, so it is a working prototype and proof of concept rather than a production system.

- Event: AI Hackathon HACKTOBERFEST 2026
- Date: 17.10.2026
- Challenge: Fix My City
- Event Information: https://42.mk/events/hacktoberfest-2026

## Team

| Name | Role |
| --- | --- |
| Katerina Vasileva | Developer |
| David Stanojkovski | Developer |
| Nikola Antic | Developer |

---

## The problem

Collection trucks often follow fixed rounds, emptying bins that are half empty while others overflow. That wastes fuel and driver time, leaves litter on the street, and people put recyclables in the wrong bin because they are unsure where things go.

## The solution

| Feature | What it does |
| --- | --- |
| **AI waste scanner** | Take or upload a photo of an item. The app names it, gives its waste category, the bin colour it goes in, whether it is recyclable, and how to prepare it, with a confidence score. |
| **Fill-level monitoring** | 18 simulated smart bins with live fill percentages and a "full in X h" estimate. |
| **Overflow alerts** | A warning banner appears when any bin reaches 90% or more. |
| **Route optimization** | Only bins above an adjustable threshold are collected. The route is planned with nearest-neighbour search followed by 2-opt improvement, using street-grid (Manhattan) distance. |
| **Savings comparison** | The planned route is compared with a fixed round that visits every bin, with an estimated diesel saving. |
| **Nearest bin finder** | After a scan, jump to the map and highlight the closest bin of the right type that is not almost full. |
| **Time simulation** | "+2 hours" ages the bins, "Run route" empties the collected ones, "Reset" starts over. |

## Tech stack

- Plain **HTML, CSS and JavaScript** in a single file, no build step
- [**Leaflet 1.9.4**](https://leafletjs.com/) (loaded from cdnjs) using a simple coordinate system for the demo map
- Google Fonts (Bricolage Grotesque, IBM Plex Sans, IBM Plex Mono)
- Vision AI for the scanner (see below)

## Getting started

No installation is needed.

```bash
git clone https://github.com/katerinavasileva2004/EcoSkopje.git
cd <EcoSkopje>
```

Then open `index.html` (or `EcoCity_AI.html`) in a browser. An internet connection is needed to load Leaflet and the fonts.

To serve it locally instead:

```bash
python -m http.server 8000
# open http://localhost:8000
```

## The AI scanner

The scanner sends the photo to a vision model with a prompt that forces a JSON reply using a fixed list of categories:
`plastic, metal, paper, glass, organic, ewaste, hazardous, textile, residual`.

The reply is validated before it is shown: unknown categories fall back to `residual`, confidence is clamped to 0-100, and text is length-limited.

**Current implementation:** the scanner calls Claude's vision capability through the Claude viewer (`window.claude.use('sample')`). This only works when the page is opened inside that viewer. Anywhere else (a local file, GitHub Pages), live scanning is disabled and the **example chips** still demonstrate the result format.

### Running the scanner with Ollama (free, local)

Replace the model call inside `scan()` with a request to a local [Ollama](https://ollama.com/) server:

```js
async function ollamaJson(file) {
  const b64 = await new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.readAsDataURL(file);
  });
  const resp = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      model: 'gemma3:4b',
      stream: false,
      format: 'json',
      messages: [{ role: 'user', content: PROMPT, images: [b64] }]
    })
  });
  return JSON.parse((await resp.json()).message.content);
}
```

Then use `var raw = await ollamaJson(file);` in place of the existing `sample.json(...)` call, and enable the scan buttons (for example by setting `aiReady = true` and calling `setScanEnabled(true)`).

Set up Ollama:

```bash
ollama pull gemma3:4b
OLLAMA_ORIGINS="*" ollama serve
```

Serve the page locally (`python -m http.server`) rather than over HTTPS, so the browser can reach `http://localhost:11434`. Keep `normalize()` as it is, because small local models sometimes return unexpected JSON.

## How the route planning works

1. Select every bin at or above the collection threshold (default 70%, adjustable from 40% to 95%).
2. Build a tour starting and ending at the depot using **nearest neighbour**.
3. Improve it with **2-opt**: reverse route segments whenever that shortens the total distance, until no improvement is found.
4. Draw the route on the map as paths that follow the street grid.

**Assumptions:** one map unit is one metre; fuel use is 0.45 L/km for a collection truck. The "fixed round" used for comparison visits all bins in a fixed, unoptimized order, so the reported savings reflect both skipping low-fill bins and ordering the stops.

## Project structure

```
.
├── index.html    # the whole app (markup, styles and scripts)
└── README.md
```

## Roadmap

- Connect real fill-level sensors (ultrasonic or weight) over MQTT or an HTTP API
- Use real map tiles and real bin coordinates (OpenStreetMap)
- Predict fill rates per bin from history instead of fixed rates
- Multiple trucks and capacity limits in the route planner
- Citizen reports for illegal dumping and damaged bins
- Fine-tune a dedicated image classifier on a dataset such as TrashNet or TACO
