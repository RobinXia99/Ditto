import { Module } from '@nestjs/common';
import { PipelineService } from './pipeline.service';
import { AudioModule } from '../audio/audio.module';
import { SttModule } from '../stt/stt.module';
import { TtsModule } from '../tts/tts.module';
import { IntentModule } from '../intent/intent.module';
import { SkillsModule } from '../skills/skills.module';

@Module({
  imports: [AudioModule, SttModule, TtsModule, IntentModule, SkillsModule],
  providers: [PipelineService],
  exports: [PipelineService],
})
export class PipelineModule {}
