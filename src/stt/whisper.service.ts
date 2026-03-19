import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);

@Injectable()
export class WhisperService {
  private readonly logger = new Logger(WhisperService.name);
  private readonly modelPath: string;
  private readonly whisperBin: string;

  constructor(private readonly configService: ConfigService) {
    this.modelPath = this.configService.get<string>(
      'whisper.modelPath',
      './models/ggml-base.en.bin',
    );

    // Resolve the whisper.cpp binary path
    this.whisperBin = path.resolve(
      __dirname,
      '../../node_modules/.pnpm/whisper-node@1.1.1/node_modules/whisper-node/lib/whisper.cpp/main',
    );
  }

  async transcribe(audioBuffer: Buffer): Promise<string> {
    this.logger.debug(
      `Transcribing ${audioBuffer.length} bytes of audio...`,
    );

    const tmpPath = path.join(
      os.tmpdir(),
      `ditto-${Date.now()}.wav`,
    );

    try {
      const wavBuffer = this.pcmToWav(audioBuffer, 16000, 1, 16);
      fs.writeFileSync(tmpPath, wavBuffer);

      const { stdout } = await execFileAsync(this.whisperBin, [
        '-m', this.modelPath,
        '-f', tmpPath,
        '-l', 'en',
        '--no-timestamps',
      ], { timeout: 15000 });

      const text = stdout
        .replace(/\[.*?\]/g, '') // strip any remaining timestamp brackets
        .trim();

      if (!text) {
        this.logger.warn('Whisper returned empty transcription');
        return '';
      }

      this.logger.debug(`Transcription: "${text}"`);
      return text;
    } finally {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private pcmToWav(
    pcmData: Buffer,
    sampleRate: number,
    channels: number,
    bitsPerSample: number,
  ): Buffer {
    const byteRate = (sampleRate * channels * bitsPerSample) / 8;
    const blockAlign = (channels * bitsPerSample) / 8;
    const dataSize = pcmData.length;
    const headerSize = 44;
    const buffer = Buffer.alloc(headerSize + dataSize);

    // RIFF header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write('WAVE', 8);

    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(channels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);

    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(dataSize, 40);
    pcmData.copy(buffer, headerSize);

    return buffer;
  }
}
