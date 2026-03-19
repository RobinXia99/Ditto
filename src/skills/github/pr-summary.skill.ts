import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ISkill, SkillMetadata, SkillResult } from '../../common/interfaces/skill.interface';
import { GitHubService } from './github.service';
import { LlmService } from '../../llm/llm.service';
import { SkillRegistryService } from '../skill-registry.service';

@Injectable()
export class PrSummarySkill implements ISkill, OnModuleInit {
  private readonly logger = new Logger(PrSummarySkill.name);

  readonly metadata: SkillMetadata = {
    key: 'github.pr.summary',
    description: 'Summarize a GitHub pull request — what it does, key changes, and any concerns',
    examples: [
      'summarize PR 42 on acme/widgets',
      'what does pull request 7 on owner/repo do',
      'give me a summary of PR 123 on myorg/myrepo',
    ],
    parameters: [
      {
        name: 'owner',
        type: 'string',
        description: 'GitHub repository owner',
        required: true,
      },
      {
        name: 'repo',
        type: 'string',
        description: 'GitHub repository name',
        required: true,
      },
      {
        name: 'pullNumber',
        type: 'number',
        description: 'Pull request number',
        required: true,
      },
    ],
  };

  constructor(
    private readonly github: GitHubService,
    private readonly llm: LlmService,
    private readonly registry: SkillRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(params: Record<string, unknown>): Promise<SkillResult> {
    const owner = params.owner as string;
    const repo = params.repo as string;
    const pullNumber = Number(params.pullNumber);

    if (!owner || !repo || !pullNumber) {
      return {
        success: false,
        spokenResponse:
          'I need a repository owner, name, and pull request number. For example: summarize PR 42 on acme/widgets.',
      };
    }

    this.logger.debug(`Summarizing ${owner}/${repo}#${pullNumber}`);

    try {
      const pr = await this.github.getPullRequest(owner, repo, pullNumber);

      const prompt = `Summarize this GitHub pull request concisely for a spoken response (2-4 sentences max).

PR: ${owner}/${repo}#${pullNumber}
Title: ${pr.title}
Author: ${pr.user}
State: ${pr.state}
Changes: +${pr.additions} -${pr.deletions} across ${pr.changedFiles} files

Description:
${pr.body || '(none)'}

Diff:
${pr.diff}

${pr.comments.length > 0 ? `Comments:\n${pr.comments.join('\n')}` : ''}

Provide a natural spoken summary covering:
1. What the PR does (one sentence)
2. Key changes (one sentence)
3. Any concerns or notable items (if any)

Keep it conversational — this will be read aloud by a voice assistant.`;

      const summary = await this.llm.chat('analysis', {
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        temperature: 0.3,
      });

      return {
        success: true,
        spokenResponse: summary,
        data: {
          owner,
          repo,
          pullNumber,
          title: pr.title,
          state: pr.state,
        },
      };
    } catch (err) {
      this.logger.error(`PR summary failed: ${err}`);
      return {
        success: false,
        spokenResponse: `I couldn't fetch pull request ${pullNumber} on ${owner}/${repo}. Make sure the repository exists and I have access.`,
      };
    }
  }
}
