import { Global, Module } from '@nestjs/common';
import { SkillRegistryService } from './skill-registry.service';
import { SkillRunnerService } from './skill-runner.service';
import { GitHubSkillModule } from './github/github-skill.module';
import { ChatSkillModule } from './chat/chat-skill.module';
import { SlackSkillModule } from './slack/slack-skill.module';

@Global()
@Module({
  imports: [GitHubSkillModule, ChatSkillModule, SlackSkillModule],
  providers: [SkillRegistryService, SkillRunnerService],
  exports: [SkillRegistryService, SkillRunnerService],
})
export class SkillsModule {}
