# 🏗️ BuildSense AI — Predictive Maintenance for Smart Campuses

> **Predict Early. Act Smart.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-f59e0b?style=for-the-badge)](https://buildsense-ai-9yzh.vercel.app)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript)]()
[![Vite](https://img.shields.io/badge/Vite-Build-646cff?style=for-the-badge&logo=vite)]()
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=for-the-badge&logo=tailwindcss)]()
[![Twilio](https://img.shields.io/badge/SMS%20Alerts-Twilio-f22f46?style=for-the-badge&logo=twilio)]()

**BuildSense AI** is an AI-powered predictive maintenance platform that monitors campus equipment in real time, predicts failures *before they happen*, prescribes corrective actions, and instantly alerts the technical team via SMS — turning reactive maintenance into proactive intelligence.

🔗 **Live Demo:** [https://buildsense-ai-9yzh.vercel.app](https://buildsense-ai-9yzh.vercel.app)

---

## 🎬 One-Click Demo

Press **▶ START HACKATHON DEMO** and watch the full autonomous loop in 18 seconds:

```
Sensor Drift → AI Detection → Risk Escalation (4% → 82%) → 
Auto Work Order → Technician Resolution → Machine Recovery
```

---

## 🤔 The Problem

Institutions lose **lakhs every year** to unexpected equipment failures:

- ❌ **Run-to-failure** — fix machines only after they break (costly downtime)
- ❌ **Fixed schedules** — service everything whether it needs it or not (wasted budget)
- ❌ **No real-time visibility** — nobody is watching the machines 24/7
- ❌ **Slow communication** — technicians find out about problems too late

---

## 💡 Our Solution

BuildSense AI closes the loop between **sensing → thinking → acting → communicating**:

| Stage | What BuildSense Does |
|---|---|
| 📡 **Sense** | Streams live IoT telemetry (temperature, vibration, current, humidity) every 2s |
| 🧠 **Think** | Weighted multi-feature risk scoring + threshold classification (0–99% failure probability) |
| 🛠️ **Act** | Auto-generates prioritized maintenance work orders (Critical → Completed kanban) |
| 📱 **Communicate** | Sends real SMS alerts to the technical team via **Twilio** |

---

## ✨ Key Features

- ️ **Live Command Center** — campus-wide building health at a glance
- 📈 **Real-time Telemetry** — streaming charts (Recharts) updating every 2 seconds
- 🧠 **AI Failure Prediction** — per-equipment risk % + health score
- 💡 **Prescriptive AI** — doesn't just warn; tells you *exactly* what to do
- 📋 **Maintenance Kanban** — auto-generated, priority-sorted work orders
- 🤖 **AI Copilot** — ask *"Which equipment should I inspect first?"* and get data-driven answers
- 📱 **SMS Alerts** — one-click Twilio notification to the technical team
- 🎬 **Autonomous Demo Mode** — the entire value story plays itself
- 🎨 **Industrial Solar-Amber UI** — animated, responsive, dark-theme design system

---

## 🧠 The Algorithm

**Weighted Multi-Feature Risk Scoring with Threshold Classification**

```
IF temperature > 70°C    → risk += 35   (thermal overload)
IF vibration  > 8 mm/s   → risk += 40   (bearing degradation — highest weight, per ISO 10816)
IF current    > 14 A     → risk += 25   (electrical spike)
IF multiple anomalies    → risk += 15   (compound cascade penalty)

risk ≥ 75  →  CRITICAL  →  Immediate shutdown & inspection
risk ≥ 40  →  WARNING   →  Inspect within 48 hours
else       →  HEALTHY   →  Continue monitoring
```

> In production, this explainable rule-based layer is designed as a clean seam for an **LSTM / Random Forest** model trained on historical failure data — because in industrial AI, **trust matters more than complexity**.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| UI | React 19 |
| Build | Vite |
| Styling | Tailwind CSS v4 (custom design system) |
| Charts | Recharts |
| Icons | Lucide React |
| SMS Alerts | Twilio (Vercel Serverless Function) |
| State | React Hooks + localStorage persistence |
| Version Control | Git + GitHub |
| Deployment | Vercel (CI/CD on every push) |

---

## 🚀 Getting Started

```bash
# Clone
git clone https://github.com/aravindhrameshkumar879-cse/-buildsense-ai.git
cd -buildsense-ai

# Install
npm install

# Run locally
npm run dev

# Build for production
npm run build
```

### Environment Variables (for SMS)
```
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
```

---

## 🗺️ Roadmap

- [ ] Real ESP32 + MQTT sensor integration
- [ ] LSTM failure-prediction model on historical data
- [ ] PostgreSQL + InfluxDB time-series storage
- [ ] Role-based auth (admin / technician)
- [ ] Push notifications + email digests
- [ ] Energy optimization analytics

---

## 🏆 Built For

Hackathon 2026 — *Smart Campus / Industry 4.0 Track*

**Team BuildSense** — built with ☕ and one very long night.

---

<div align="center">

### Predict Early. Act Smart. 🟠

</div>