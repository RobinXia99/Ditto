import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PiperTtsProvider } from './piper-tts.provider';
import { MacOSSayProvider } from './macos-say.provider';

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly engine: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly piper: PiperTtsProvider,
    private readonly macosSay: MacOSSayProvider,
  ) {
    this.engine = this.configService.get<string>('tts.engine', 'macos-say');
    this.logger.log(`TTS engine: ${this.engine}`);
  }

  async speak(text: string): Promise<void> {
    if (!text || text.trim().length === 0) {
      this.logger.warn('Empty text passed to TTS — skipping');
      return;
    }

    try {
      if (this.engine === 'piper' && this.piper.isAvailable()) {
        await this.piper.speak(text);
      } else if (this.macosSay.isAvailable()) {
        await this.macosSay.speak(text);
      } else {
        this.logger.error(
          'No TTS engine available. Install Piper or run on macOS.',
        );
      }
    } catch (err) {
      this.logger.error(`TTS failed: ${err}`);
      // Try fallback
      if (this.engine === 'piper' && this.macosSay.isAvailable()) {
        this.logger.warn('Falling back to macOS say');
        await this.macosSay.speak(text);
      }
    }
  }
}
