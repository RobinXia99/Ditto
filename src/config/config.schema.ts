import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // LLM providers (set the ones you use)
  ANTHROPIC_API_KEY: Joi.string().optional(),
  GOOGLE_AI_API_KEY: Joi.string().optional(),

  // LLM task routing
  LLM_INTENT_PROVIDER: Joi.string().valid('claude', 'gemini').optional(),
  LLM_INTENT_MODEL: Joi.string().optional(),
  LLM_ANALYSIS_PROVIDER: Joi.string().valid('claude', 'gemini').optional(),
  LLM_ANALYSIS_MODEL: Joi.string().optional(),

  // GitHub
  GITHUB_TOKEN: Joi.string().optional(),

  // Picovoice
  PICOVOICE_ACCESS_KEY: Joi.string().optional(),

  // Wake word
  WAKE_WORD: Joi.string().default('porcupine'),
  WAKE_WORD_MODEL_PATH: Joi.string().optional(),

  // Whisper
  WHISPER_MODEL_PATH: Joi.string().default('./models/ggml-base.en.bin'),

  // TTS
  TTS_ENGINE: Joi.string().valid('piper', 'macos-say').default('macos-say'),
  PIPER_MODEL_PATH: Joi.string().optional(),

  // Recording
  SILENCE_THRESHOLD: Joi.number().default(500),
  SILENCE_DURATION_MS: Joi.number().default(1500),
  MAX_RECORDING_MS: Joi.number().default(10000),
  SAMPLE_RATE: Joi.number().default(16000),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('debug'),
});
