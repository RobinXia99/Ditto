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
      'summarize my latest pull request',
      'what was the last PR',
    ],
    parameters: [
      {
        name: 'owner',
        type: 'string',
        description: 'GitHub repository owner (optional — omit for auto-detect)',
        required: false,
      },
      {
        name: 'repo',
        type: 'string',
        description: 'GitHub repository name (optional — omit for auto-detect)',
        required: false,
      },
      {
        name: 'pullNumber',
        type: 'number',
        description: 'Pull request number (optional — omit or use 0 for latest)',
        required: false,
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
    let owner = params.owner as string | undefined;
    let repo = params.repo as string | undefined;
    let pullNumber = Number(params.pullNumber) || 0;

    // If missing owner/repo/pullNumber, auto-detect the latest PR
    if (!owner || !repo || !pullNumber) {
      this.logger.debug('Missing params — looking up latest PR automatically');
      const latest = await this.github.getLatestPullRequest(owner, repo);
      if (!latest) {
        return {
          success: false,
          spokenResponse:
            "I couldn't find any pull requests on your accessible repositories.",
        };
      }
      owner = latest.owner;
      repo = latest.repo;
      pullNumber = latest.pullNumber;
      this.logger.debug(`Auto-detected latest PR: ${owner}/${repo}#${pullNumber}`);
    }

    this.logger.debug(`Summarizing ${owner}/${repo}#${pullNumber}`);

    try {
      const pr = await this.github.getPullRequest(owner, repo, pullNumber);

      const prompt = `Summarize this GitHub pull request for a spoken response.

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

Provide a thorough spoken summary covering:
1. What the PR does and why (1-2 sentences)
2. Key files and changes in detail (2-3 sentences)
3. Code quality observations or potential concerns (1-2 sentences)
4. Overall assessment (1 sentence)

Keep it conversational and natural — this will be read aloud by a voice assistant. Aim for about 6-8 sentences total.`;

      const summary = await this.llm.chat('analysis', {
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1024,
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
