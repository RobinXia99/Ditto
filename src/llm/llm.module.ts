import { Global, Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Global()
@Module({
  providers: [LlmService, ClaudeProvider, GeminiProvider],
  exports: [LlmService],
})
export class LlmModule {}
