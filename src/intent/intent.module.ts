import { Module, forwardRef } from '@nestjs/common';
import { IntentService } from './intent.service';
import { SkillsModule } from '../skills/skills.module';

@Module({
  imports: [forwardRef(() => SkillsModule)],
  providers: [IntentService],
  exports: [IntentService],
})
export class IntentModule {}
