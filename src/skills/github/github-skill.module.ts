import { Module } from '@nestjs/common';
import { GitHubService } from './github.service';
import { PrSummarySkill } from './pr-summary.skill';

@Module({
  providers: [GitHubService, PrSummarySkill],
  exports: [GitHubService, PrSummarySkill],
})
export class GitHubSkillModule {}
