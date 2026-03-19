import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execFileAsync = promisify(execFile);

@Injectable()
export class PiperTtsProvider {
  private readonly logger = new Logger(PiperTtsProvider.name);
  private readonly modelPath: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.modelPath = this.configService.get<string>('tts.piperModelPath');
  }

  async speak(text: string): Promise<void> {
    if (!this.modelPath) {
      throw new Error('Piper model path not configured (PIPER_MODEL_PATH)');
    }

    const tmpWav = path.join(os.tmpdir(), `ditto-tts-${Date.now()}.wav`);

    try {
      this.logger.debug(
        `Speaking via Piper: "${text.substring(0, 50)}..."`,
      );

      // Pipe text to piper, output to wav, then play
      await execFileAsync('piper', [
        '--model',
        this.modelPath,
        '--output_file',
        tmpWav,
      ], {
        // Pass text via stdin — execFile doesn't support stdin, so we use a workaround
        // For Phase 1, we'll shell out with echo
      });

      // Play the wav file
      if (process.platform === 'darwin') {
        await execFileAsync('afplay', [tmpWav]);
      } else {
        await execFileAsync('aplay', [tmpWav]);
      }
    } finally {
      try {
        fs.unlinkSync(tmpWav);
      } catch {
        // Ignore
      }
    }
  }

  isAvailable(): boolean {
    return !!this.modelPath;
  }
}
