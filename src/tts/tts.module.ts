import { Module } from '@nestjs/common';
import { TtsService } from './tts.service';
import { PiperTtsProvider } from './piper-tts.provider';
import { MacOSSayProvider } from './macos-say.provider';

@Module({
  providers: [TtsService, PiperTtsProvider, MacOSSayProvider],
  exports: [TtsService],
})
export class TtsModule {}
