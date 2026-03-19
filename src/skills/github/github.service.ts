import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Octokit } from '@octokit/rest';
import { SecretsService } from '../../secrets/secrets.service';

interface CachedPR {
  data: any;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class GitHubService implements OnModuleInit {
  private readonly logger = new Logger(GitHubService.name);
  private octokit!: Octokit;
  private prCache = new Map<string, CachedPR>();

  constructor(private readonly secrets: SecretsService) {}

  async onModuleInit(): Promise<void> {
    const token = await this.secrets.getSecret('GITHUB_TOKEN');
    if (!token) {
      this.logger.warn(
        'GITHUB_TOKEN not found — GitHub skills will not work. Set it via env or: npm run setup',
      );
      this.octokit = new Octokit();
      return;
    }
    this.octokit = new Octokit({ auth: token });
    this.logger.log('GitHub client initialized');
  }

  async getPullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
  ): Promise<{
    title: string;
    body: string | null;
    state: string;
    user: string;
    additions: number;
    deletions: number;
    changedFiles: number;
    diff: string;
    comments: string[];
  }> {
    const cacheKey = `${owner}/${repo}#${pullNumber}`;
    const cached = this.prCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      this.logger.debug(`PR cache hit: ${cacheKey}`);
      return cached.data;
    }

    this.logger.debug(`Fetching PR: ${cacheKey}`);

    const [pr, diff, comments] = await Promise.all([
      this.octokit.pulls.get({ owner, repo, pull_number: pullNumber }),
      this.octokit.pulls
        .get({
          owner,
          repo,
          pull_number: pullNumber,
          mediaType: { format: 'diff' },
        })
        .then((r) => r.data as unknown as string),
      this.octokit.issues
        .listComments({ owner, repo, issue_number: pullNumber })
        .then((r) => r.data.map((c) => `${c.user?.login}: ${c.body}`)),
    ]);

    // Truncate diff to ~8000 tokens (~32000 chars)
    const truncatedDiff =
      diff.length > 32000 ? diff.substring(0, 32000) + '\n... (truncated)' : diff;

    const result = {
      title: pr.data.title,
      body: pr.data.body,
      state: pr.data.state,
      user: pr.data.user?.login || 'unknown',
      additions: pr.data.additions,
      deletions: pr.data.deletions,
      changedFiles: pr.data.changed_files,
      diff: truncatedDiff,
      comments,
    };

    this.prCache.set(cacheKey, { data: result, fetchedAt: Date.now() });
    return result;
  }
}
