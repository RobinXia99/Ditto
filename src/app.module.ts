import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from './config/config.module';
import { SecretsModule } from './secrets/secrets.module';
import { LlmModule } from './llm/llm.module';
import { PipelineModule } from './pipeline/pipeline.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    AppConfigModule,
    SecretsModule,
    LlmModule,
    PipelineModule,
  ],
})
export class AppModule {}
