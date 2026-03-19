import { Module } from '@nestjs/common';
import { SkillRegistryService } from './skill-registry.service';
import { SkillRunnerService } from './skill-runner.service';
import { GitHubSkillModule } from './github/github-skill.module';

@Module({
  imports: [GitHubSkillModule],
  providers: [SkillRegistryService, SkillRunnerService],
  exports: [SkillRegistryService, SkillRunnerService],
})
export class SkillsModule {}
