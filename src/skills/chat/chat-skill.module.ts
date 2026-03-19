import { Module } from '@nestjs/common';
import { ChatSkill } from './chat.skill';
import { LlmModule } from '../../llm/llm.module';

@Module({
  imports: [LlmModule],
  providers: [ChatSkill],
})
export class ChatSkillModule {}
