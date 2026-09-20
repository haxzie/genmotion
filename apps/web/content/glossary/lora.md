---
term: "LoRA"
description: "A small, efficient fine-tune layered on top of a base generative model to teach it a specific style or subject."
faqs:
  - q: "What does LoRA stand for?"
    a: "LoRA stands for Low-Rank Adaptation, a technique for fine-tuning a large generative model efficiently by training a small set of additional parameters instead of the entire model."
  - q: "Why are LoRAs popular for AI image and video generation?"
    a: "A LoRA is small — often tens of megabytes instead of gigabytes — quick to train, and can be swapped in and out of a base model, making it a practical way to teach a model a specific character, style, or product without retraining it from scratch."
---

A **LoRA** (Low-Rank Adaptation) is a small, efficient fine-tune layered on top of a base generative model to teach it a specific style, character, or subject — without retraining the whole model. Because a LoRA only adds a small set of new parameters, it's cheap to train and easy to swap in and out of a base [diffusion model](/glossary/diffusion-model).

LoRAs are how creators get a consistent character or brand style out of an otherwise general-purpose model, rather than re-prompting and hoping for consistency each time.

See also: [Diffusion Model](/glossary/diffusion-model), [ControlNet](/glossary/controlnet).
