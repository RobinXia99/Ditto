import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RecorderService {
  private readonly logger = new Logger(RecorderService.name);
  private chunks: Buffer[] = [];
  private recording = false;
  private silenceStart: number | null = null;

  private silenceThreshold: number;
  private silenceDurationMs: number;
  private maxRecordingMs: number;
  private recordingStart = 0;

  constructor(private readonly configService: ConfigService) {
    this.silenceThreshold = this.configService.get<number>(
      'recording.silenceThreshold',
      500,
    );
    this.silenceDurationMs = this.configService.get<number>(
      'recording.silenceDurationMs',
      1500,
    );
    this.maxRecordingMs = this.configService.get<number>(
      'recording.maxRecordingMs',
      10000,
    );
  }

  startRecording(): void {
    this.chunks = [];
    this.recording = true;
    this.silenceStart = null;
    this.recordingStart = Date.now();
    this.logger.debug('Recording started');
  }

  /**
   * Process an audio chunk. Returns the complete buffer if recording is done
   * (silence detected or max duration reached), or null if still recording.
   */
  processChunk(chunk: Buffer): Buffer | null {
    if (!this.recording) return null;

    this.chunks.push(chunk);

    // Check max duration
    const elapsed = Date.now() - this.recordingStart;
    if (elapsed >= this.maxRecordingMs) {
      this.logger.debug(`Max recording duration reached (${elapsed}ms)`);
      return this.stopAndReturn();
    }

    // Energy-based silence detection
    const energy = this.calculateEnergy(chunk);
    if (energy < this.silenceThreshold) {
      if (!this.silenceStart) {
        this.silenceStart = Date.now();
      } else if (Date.now() - this.silenceStart >= this.silenceDurationMs) {
        this.logger.debug(
          `Silence detected after ${elapsed}ms of recording`,
        );
        return this.stopAndReturn();
      }
    } else {
      this.silenceStart = null;
    }

    return null;
  }

  isRecording(): boolean {
    return this.recording;
  }

  cancel(): void {
    this.recording = false;
    this.chunks = [];
    this.logger.debug('Recording cancelled');
  }

  private stopAndReturn(): Buffer {
    this.recording = false;
    const buffer = Buffer.concat(this.chunks);
    const durationMs = Date.now() - this.recordingStart;
    this.chunks = [];
    this.logger.debug(
      `Recording complete: ${buffer.length} bytes, ${durationMs}ms`,
    );
    return buffer;
  }

  private calculateEnergy(chunk: Buffer): number {
    let sum = 0;
    // 16-bit PCM: 2 bytes per sample
    const sampleCount = Math.floor(chunk.length / 2);
    for (let i = 0; i < sampleCount; i++) {
      const sample = chunk.readInt16LE(i * 2);
      sum += Math.abs(sample);
    }
    return sampleCount > 0 ? sum / sampleCount : 0;
  }
}
