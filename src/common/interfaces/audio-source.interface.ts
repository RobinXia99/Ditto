import { Readable } from 'stream';

export interface IAudioSource {
  start(): Readable;
  stop(): void;
  isRecording(): boolean;
}
