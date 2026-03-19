import { Module } from '@nestjs/common';
import { SlackService } from './slack.service';
import { SlackDmSkill } from './slack-dm.skill';

@Module({
  providers: [SlackService, SlackDmSkill],
  exports: [SlackService],
})
export class SlackSkillModule {}
