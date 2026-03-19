export const PipelineEvents = {
  WAKE_WORD_DETECTED: 'pipeline.wakeWord.detected',
  SPEECH_CAPTURED: 'pipeline.speech.captured',
  TRANSCRIPTION_COMPLETE: 'pipeline.transcription.complete',
  INTENT_PARSED: 'pipeline.intent.parsed',
  SKILL_EXECUTED: 'pipeline.skill.executed',
  RESPONSE_SPOKEN: 'pipeline.response.spoken',
  PIPELINE_ERROR: 'pipeline.error',
  STATE_CHANGED: 'pipeline.state.changed',
} as const;

export enum PipelineState {
  LISTENING = 'LISTENING',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  SPEAKING = 'SPEAKING',
}

export interface WakeWordEvent {
  timestamp: number;
}

export interface SpeechCapturedEvent {
  audioBuffer: Buffer;
  durationMs: number;
}

export interface TranscriptionEvent {
  text: string;
  durationMs: number;
}

export interface IntentParsedEvent {
  skillKey: string;
  parameters: Record<string, unknown>;
  confidence: number;
  rawText: string;
}

export interface SkillExecutedEvent {
  skillKey: string;
  spokenResponse: string;
  success: boolean;
}

export interface PipelineErrorEvent {
  stage: string;
  error: Error;
}

export interface StateChangedEvent {
  from: PipelineState;
  to: PipelineState;
}
