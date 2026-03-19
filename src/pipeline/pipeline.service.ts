import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { AudioPipelineService } from '../audio/audio-pipeline.service';
import { WhisperService } from '../stt/whisper.service';
import { IntentService } from '../intent/intent.service';
import { SkillRunnerService } from '../skills/skill-runner.service';
import { TtsService } from '../tts/tts.service';
import {
  PipelineEvents,
  PipelineState,
  SpeechCapturedEvent,
} from '../common/events/pipeline.events';

@Injectable()
export class PipelineService implements OnModuleInit {
  private readonly logger = new Logger(PipelineService.name);

  constructor(
    private readonly audioPipeline: AudioPipelineService,
    private readonly whisper: WhisperService,
    private readonly intent: IntentService,
    private readonly skillRunner: SkillRunnerService,
    private readonly tts: TtsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Pipeline service initialized');
  }

  async start(): Promise<void> {
    this.logger.log('Starting Ditto pipeline...');
    await this.audioPipeline.start();
    this.logger.log('🎤 Ditto is listening...');
  }

  @OnEvent(PipelineEvents.SPEECH_CAPTURED)
  async handleSpeechCaptured(event: SpeechCapturedEvent): Promise<void> {
    this.logger.debug(
      `Speech captured: ${event.audioBuffer.length} bytes, ${Math.round(event.durationMs)}ms`,
    );

    try {
      // 1. Transcribe
      const text = await this.whisper.transcribe(event.audioBuffer);
      const isBlank = !text || text.trim().length === 0 || /^\[.*AUDIO.*\]$/i.test(text.trim());
      if (isBlank) {
        this.logger.warn('Empty transcription — resuming listening');
        await this.tts.speak("I didn't catch that. Could you say it again?");
        this.eventEmitter.emit(PipelineEvents.RESPONSE_SPOKEN);
        return;
      }

      this.logger.log(`Transcription: "${text}"`);
      this.eventEmitter.emit(PipelineEvents.TRANSCRIPTION_COMPLETE, {
        text,
        durationMs: event.durationMs,
      });

      // 2. Parse intent
      const result = await this.intent.parse(text);

      if (!result.intent) {
        this.logger.debug('No intent matched — speaking fallback');
        await this.tts.speak(
          result.fallbackResponse || "I'm not sure what to do with that.",
        );
        this.eventEmitter.emit(PipelineEvents.RESPONSE_SPOKEN);
        return;
      }

      this.logger.log(
        `Intent: ${result.intent.skillKey} (confidence: ${result.intent.confidence})`,
      );
      this.eventEmitter.emit(PipelineEvents.INTENT_PARSED, {
        skillKey: result.intent.skillKey,
        parameters: result.intent.parameters,
        confidence: result.intent.confidence,
        rawText: text,
      });

      // 3. Execute skill
      this.audioPipeline.setState(PipelineState.PROCESSING);
      const skillResult = await this.skillRunner.execute(
        result.intent.skillKey,
        result.intent.parameters,
      );

      this.logger.log(
        `Skill result (${result.intent.skillKey}): success=${skillResult.success}`,
      );
      this.eventEmitter.emit(PipelineEvents.SKILL_EXECUTED, {
        skillKey: result.intent.skillKey,
        spokenResponse: skillResult.spokenResponse,
        success: skillResult.success,
      });

      // 4. Speak response
      this.audioPipeline.setState(PipelineState.SPEAKING);
      await this.tts.speak(skillResult.spokenResponse);

      this.eventEmitter.emit(PipelineEvents.RESPONSE_SPOKEN);
    } catch (err) {
      this.logger.error(`Pipeline error: ${err}`);
      this.eventEmitter.emit(PipelineEvents.PIPELINE_ERROR, {
        stage: 'processing',
        error: err,
      });

      try {
        await this.tts.speak(
          'Sorry, something went wrong. Please try again.',
        );
      } catch {
        // Don't let TTS failure block recovery
      }
      this.eventEmitter.emit(PipelineEvents.RESPONSE_SPOKEN);
    }
  }
}
