# Ditto

A local voice-controlled AI developer assistant. Say a wake word, speak a command, and Ditto handles the rest — transcription, intent parsing, and execution all happen through a hands-free voice pipeline.

**Phase 1** ships with one skill: **GitHub PR summaries**. Ask Ditto to summarize a pull request and it will fetch the PR, analyze it with an LLM, and speak the summary back to you.

## How it works

```
Wake word → Record speech → Transcribe (local Whisper) → Parse intent (LLM) → Execute skill → Speak response (TTS)
```

- **All audio stays local** — wake word detection (Porcupine) and speech-to-text (whisper.cpp) run entirely on your machine.
- **Pluggable LLM providers** — choose between Claude (Anthropic) and Gemini (Google) per task. Mix and match for cost vs quality.
- **Event-driven pipeline** — built on NestJS with a state machine (`LISTENING → RECORDING → PROCESSING → SPEAKING → LISTENING`).

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 9
- **SoX** — for microphone capture: `brew install sox`
- **Whisper model** — downloaded during setup
- **API keys** (at least one LLM provider):
  - [Anthropic API key](https://console.anthropic.com/) — for Claude
  - [Google AI API key](https://aistudio.google.com/apikey) — for Gemini
  - [Picovoice access key](https://picovoice.ai/) — required for wake word
  - [GitHub token](https://github.com/settings/tokens) — required for PR skills

## Setup

```bash
# Install dependencies
pnpm install

# Store API keys in your OS keychain (interactive)
pnpm setup

# Or set them via environment variables
cp .env.example .env
# Edit .env with your keys

# Download a Whisper model
npx whisper-node download
```

## LLM configuration

Ditto routes two tasks — **intent parsing** and **analysis** — independently to any configured provider. Set these in `.env`:

```bash
# Use Gemini for cheap intent parsing, Claude for deep analysis
LLM_INTENT_PROVIDER=gemini
LLM_INTENT_MODEL=gemini-2.5-flash
LLM_ANALYSIS_PROVIDER=claude
LLM_ANALYSIS_MODEL=claude-sonnet-4-20250514
```

Presets in `.env.example`:

| Preset | Intent | Analysis | ~Cost at 100 cmds/day |
|--------|--------|----------|-----------------------|
| Default | Claude Sonnet | Claude Sonnet | ~$3/day |
| Best mix | Gemini Flash | Claude Sonnet | ~$2.70/day |
| Cheapest | Gemini Flash | Gemini Flash | ~$0.15/day |

## Usage

```bash
# Build
pnpm build

# Start Ditto
pnpm start

# Start in watch mode (development)
pnpm start:dev
```

Once running, you'll see `Ditto is listening...` in the console. Then:

1. Say the wake word (default: **"porcupine"**)
2. Speak your command, e.g. *"Summarize PR 42 on acme/widgets"*
3. Ditto transcribes, parses, fetches the PR, and speaks a summary

## Project structure

```
src/
├── main.ts              # Bootstrap standalone NestJS app (no HTTP server)
├── app.module.ts        # Root module
├── common/              # Interfaces, constants, decorators, events
├── config/              # Env validation (Joi)
├── secrets/             # OS keychain (keytar) with env fallback
├── llm/                 # LLM provider abstraction
│   └── providers/       # Claude + Gemini implementations
├── audio/               # Mic capture, wake word, silence detection, audio pipeline
├── stt/                 # Local Whisper transcription
├── tts/                 # Piper TTS + macOS say fallback
├── intent/              # LLM-powered intent parsing
├── skills/              # Skill registry + runner
│   └── github/          # PR summary skill
└── pipeline/            # Top-level orchestrator
```

## Adding skills

Create a new skill by implementing `ISkill`, decorating it with `@Skill()` metadata, and registering it with the `SkillRegistryService` in `onModuleInit`. The intent parser automatically picks up new skills from the registry.

## License

MIT
