# Nexa Assets & AI Server Models

Official asset repository and model distribution hub for **NEXA Android** AI Voice Assistant.

---

## 🚀 Overview

This repository hosts all the machine learning models, voice models, neural speech assets, and mobile skills required by the Nexa Android app:
- **STT (Speech-to-Text)**: Onnx CTC Conformer speech recognition models & vocabulary.
- **Turn VAD**: Voice activity and end-of-turn detection models.
- **Addressee Detection**: Hotword and user-intent detection models.
- **Guardian Safety**: Safety evaluation and acoustic cohort models.
- **TTS Voices**: Dost neural voice models (v1 and v2) for lifelike multi-lingual synthesis.
- **Mobile Skills**: Claude-Code style tool playbooks for device automation.
- **Avatar Catalog**: 3D avatars, characters, and live scene presets.

---

## 📦 Releases & Model Endpoints

All release assets are distributed via GitHub Releases CDN:
- **`stt`**: Nexa Speech-to-Text (`model.onnx`, `pieces.tsv`, `nexa_stt.json`, `manifest.json`)
- **`turn`**: Nexa Turn VAD (`model.onnx`, `pieces.tsv`, `turn_detector.json`, `manifest.json`)
- **`addressee`**: Nexa Addressee Detection (`model.onnx`, `pieces.tsv`, `addressee.json`, `manifest.json`)
- **`guardian`**: Safety models (`ecapa6s.tflite`, `rdn2b6s.tflite`, `cohort.bin`, `cohort_rdn2b6s.bin`, `manifest.json`)
- **`tts-v1`**: Dost Voice Pack V1 (`flow.mvp`, `text.mvp`, `decoder.mvp`, `tokenizer.mvp`, `main.mvp`, `manifest.json`)
- **`tts-v2`**: Dost Voice Pack V2 (`flow.mvp`, `text.mvp`, `decoder.mvp`, `tokenizer.mvp`, `main.mvp`, `manifest.json`)
- **`avatar`**: Avatar presets and configuration (`catalog.json`)
- **`v1.0.0`**: Master monolithic release containing all server assets.

---

## 🛠️ Maintained By

Developed and maintained by **Rohit** for **Nexa Android**.
All assets are optimized for ultra-low latency mobile inference.
