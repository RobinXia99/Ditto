import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class MicrophoneService {
  private readonly logger = new Logger(MicrophoneService.name);
  private recording: ReturnType<typeof import('node-record-lpcm16').record> | null = null;

  constructor(private readonly configService: ConfigService) {}

  start(): Readable {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const record = require('node-record-lpcm16');
    const sampleRate = this.configService.get<number>('recording.sampleRate', 16000);

    this.recording = record.record({
      sampleRate,
      channels: 1,
      audioType: 'raw',
      recorder: 'rec', // SoX recorder
      silence: '0', // We handle silence detection ourselves
    });

    this.logger.debug(`Microphone started at ${sampleRate}Hz`);
    return this.recording!.stream();
  }

  stop(): void {
    if (this.recording) {
      this.recording.stop();
      this.recording = null;
      this.logger.debug('Microphone stopped');
    }
  }

  isRecording(): boolean {
    return this.recording !== null;
  }
}
