# Taste profile
- Strongly prefers standard, conventional project scaffolding over ad-hoc layouts: a real monorepo with workspace layout, clear folder structure, and standard config (lint/format/CI/scripts) rather than loose sibling projects. Confidence: 0.8
- Wants infrastructure/structure work sequenced first: set up the proper skeleton (folders, monorepo, tooling) before touching code, then fix the code incrementally "one by one" rather than in one big-bang pass. Confidence: 0.75
- Dislikes source that reads like compiled/generated output (dense one-liners, very long lines); wants readable, hand-editable source as the baseline. Confidence: 0.7
- Wants this project to stay single-chain (Solana only): no EVM/second-chain support, and no generic chain-abstraction layers kept around for hypothetical other chains. Scope stays as narrow as the product needs. Confidence: 0.7
- When something is cut, wants it removed completely — code, adapters, deps, CSS, deploy configs, docs and i18n strings — rather than left behind as dead or half-disabled paths. Confidence: 0.6
- Values being asked for input and opinions ("What do you think?"): expects the agent to propose concrete options with a recommendation (naming, tooling choices) instead of silently executing. Confidence: 0.55
