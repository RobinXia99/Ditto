import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SecretsService } from '../secrets/secrets.service';
import { PipelineEvents } from '../common/events/pipeline.events';

@Injectable()
export class WakeWordService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WakeWordService.name);
  private porcupine: any = null;
  private frameLength = 512;
  private paused = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly secrets: SecretsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const { Porcupine, BuiltinKeyword } = await import(
        '@picovoice/porcupine-node'
      );

      const accessKey = await this.secrets.getSecret('PICOVOICE_ACCESS_KEY');
      if (!accessKey) {
        this.logger.warn(
          'PICOVOICE_ACCESS_KEY not set — wake word detection disabled. Set it via env or: npm run setup',
        );
        return;
      }

      const keyword = this.configService.get<string>(
        'wakeWord.keyword',
        'porcupine',
      );
      const modelPath = this.configService.get<string>('wakeWord.modelPath');

      if (modelPath) {
        this.porcupine = new Porcupine(accessKey, [modelPath], [0.5]);
      } else {
        const builtinKeyword =
          BuiltinKeyword[keyword.toUpperCase() as keyof typeof BuiltinKeyword];
        if (!builtinKeyword) {
          throw new Error(
            `Unknown built-in keyword: ${keyword}. Use one of: ${Object.keys(BuiltinKeyword).join(', ')}`,
          );
        }
        this.porcupine = new Porcupine(accessKey, [builtinKeyword], [0.5]);
      }

      this.frameLength = this.porcupine.frameLength;
      this.logger.log(
        `Wake word detection ready (keyword: "${keyword}", frame: ${this.frameLength})`,
      );
    } catch (err) {
      this.logger.error(`Failed to initialize Porcupine: ${err}`);
    }
  }

  processAudioFrame(frame: Int16Array): boolean {
    if (!this.porcupine || this.paused) return false;

    const keywordIndex = this.porcupine.process(frame);
    if (keywordIndex >= 0) {
      this.logger.log('Wake word detected!');
      this.eventEmitter.emit(PipelineEvents.WAKE_WORD_DETECTED, {
        timestamp: Date.now(),
      });
      return true;
    }
    return false;
  }

  pause(): void {
    this.paused = true;
    this.logger.debug('Wake word detection paused');
  }

  resume(): void {
    this.paused = false;
    this.logger.debug('Wake word detection resumed');
  }

  getFrameLength(): number {
    return this.frameLength;
  }

  isReady(): boolean {
    return this.porcupine !== null;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.porcupine) {
      this.porcupine.release();
      this.porcupine = null;
    }
  }
}
