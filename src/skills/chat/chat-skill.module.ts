import { Module } from '@nestjs/common';
import { ChatSkill } from './chat.skill';

@Module({
  providers: [ChatSkill],
})
export class ChatSkillModule {}
