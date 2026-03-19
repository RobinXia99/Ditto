import { Module } from '@nestjs/common';
import { MicrophoneService } from './microphone.service';
import { WakeWordService } from './wake-word.service';
import { RecorderService } from './recorder.service';
import { AudioPipelineService } from './audio-pipeline.service';

@Module({
  providers: [
    MicrophoneService,
    WakeWordService,
    RecorderService,
    AudioPipelineService,
  ],
  exports: [AudioPipelineService, WakeWordService],
})
export class AudioModule {}
