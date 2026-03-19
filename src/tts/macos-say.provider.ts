import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

@Injectable()
export class MacOSSayProvider {
  private readonly logger = new Logger(MacOSSayProvider.name);

  async speak(text: string): Promise<void> {
    this.logger.debug(`Speaking via macOS say: "${text.substring(0, 50)}..."`);
    try {
      await execFileAsync('say', ['-v', 'Samantha', text]);
    } catch (err) {
      this.logger.error(`macOS say failed: ${err}`);
      throw err;
    }
  }

  isAvailable(): boolean {
    return process.platform === 'darwin';
  }
}
