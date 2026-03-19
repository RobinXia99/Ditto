import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MicrophoneService } from './microphone.service';
import { WakeWordService } from './wake-word.service';
import { RecorderService } from './recorder.service';
import {
  PipelineEvents,
  PipelineState,
} from '../common/events/pipeline.events';
import { Readable } from 'stream';

@Injectable()
export class AudioPipelineService implements OnModuleInit {
  private readonly logger = new Logger(AudioPipelineService.name);
  private state: PipelineState = PipelineState.LISTENING;
  private micStream: Readable | null = null;
  private frameBuffer = Buffer.alloc(0);

  constructor(
    private readonly microphone: MicrophoneService,
    private readonly wakeWord: WakeWordService,
    private readonly recorder: RecorderService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit(): void {
    // Listen for state transitions from the main pipeline
    this.eventEmitter.on(
      PipelineEvents.RESPONSE_SPOKEN,
      () => this.resumeListening(),
    );
    this.eventEmitter.on(PipelineEvents.PIPELINE_ERROR, () =>
      this.resumeListening(),
    );
  }

  async start(): Promise<void> {
    if (!this.wakeWord.isReady()) {
      this.logger.warn(
        'Wake word not ready — audio pipeline will not start. Check PICOVOICE_ACCESS_KEY.',
      );
      return;
    }

    this.logger.log('Audio pipeline starting...');
    this.startMicrophone();
  }

  private startMicrophone(): void {
    this.micStream = this.microphone.start();
    this.setState(PipelineState.LISTENING);

    this.micStream.on('data', (chunk: Buffer) => {
      this.handleAudioData(chunk);
    });

    this.micStream.on('error', (err) => {
      this.logger.error(`Microphone error: ${err.message}`);
    });
  }

  private handleAudioData(chunk: Buffer): void {
    if (this.state === PipelineState.LISTENING) {
      this.processForWakeWord(chunk);
    } else if (this.state === PipelineState.RECORDING) {
      const result = this.recorder.processChunk(chunk);
      if (result) {
        this.onSpeechCaptured(result);
      }
    }
    // In PROCESSING or SPEAKING states, audio is discarded
  }

  private processForWakeWord(chunk: Buffer): void {
    // Accumulate audio into frame-sized chunks for Porcupine
    this.frameBuffer = Buffer.concat([this.frameBuffer, chunk]);
    const frameLength = this.wakeWord.getFrameLength();
    const bytesPerFrame = frameLength * 2; // 16-bit samples

    while (this.frameBuffer.length >= bytesPerFrame) {
      const frameBytes = this.frameBuffer.subarray(0, bytesPerFrame);
      this.frameBuffer = this.frameBuffer.subarray(bytesPerFrame);

      // Convert to Int16Array
      const frame = new Int16Array(frameLength);
      for (let i = 0; i < frameLength; i++) {
        frame[i] = frameBytes.readInt16LE(i * 2);
      }

      if (this.wakeWord.processAudioFrame(frame)) {
        this.onWakeWordDetected();
        return;
      }
    }
  }

  private onWakeWordDetected(): void {
    this.setState(PipelineState.RECORDING);
    this.wakeWord.pause();
    this.recorder.startRecording();
    this.frameBuffer = Buffer.alloc(0);
  }

  private onSpeechCaptured(audioBuffer: Buffer): void {
    this.setState(PipelineState.PROCESSING);
    const durationMs =
      (audioBuffer.length / 2 / 16000) * 1000; // 16-bit, 16kHz

    this.eventEmitter.emit(PipelineEvents.SPEECH_CAPTURED, {
      audioBuffer,
      durationMs,
    });
  }

  resumeListening(): void {
    this.wakeWord.resume();
    this.setState(PipelineState.LISTENING);
    this.frameBuffer = Buffer.alloc(0);
    this.logger.debug('Resumed listening for wake word');
  }

  setState(newState: PipelineState): void {
    const oldState = this.state;
    this.state = newState;
    this.logger.debug(`State: ${oldState} → ${newState}`);
    this.eventEmitter.emit(PipelineEvents.STATE_CHANGED, {
      from: oldState,
      to: newState,
    });
  }

  getState(): PipelineState {
    return this.state;
  }

  stop(): void {
    this.microphone.stop();
    this.micStream = null;
    this.logger.log('Audio pipeline stopped');
  }
}
