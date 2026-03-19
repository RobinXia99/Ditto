export default () => ({
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  github: {
    token: process.env.GITHUB_TOKEN,
  },
  slack: {
    userToken: process.env.SLACK_USER_TOKEN,
  },
  picovoice: {
    accessKey: process.env.PICOVOICE_ACCESS_KEY,
  },
  wakeWord: {
    keyword: process.env.WAKE_WORD || 'porcupine',
    modelPath: process.env.WAKE_WORD_MODEL_PATH,
  },
  whisper: {
    modelPath: process.env.WHISPER_MODEL_PATH || './models/ggml-base.en.bin',
  },
  tts: {
    engine: process.env.TTS_ENGINE || 'macos-say',
    piperModelPath: process.env.PIPER_MODEL_PATH,
  },
  recording: {
    silenceThreshold: parseInt(process.env.SILENCE_THRESHOLD || '500', 10),
    silenceDurationMs: parseInt(process.env.SILENCE_DURATION_MS || '1500', 10),
    maxRecordingMs: parseInt(process.env.MAX_RECORDING_MS || '10000', 10),
    sampleRate: parseInt(process.env.SAMPLE_RATE || '16000', 10),
  },
  logLevel: process.env.LOG_LEVEL || 'debug',
});
