import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { WebClient } from '@slack/web-api';
import { SecretsService } from '../../secrets/secrets.service';

interface SlackUser {
  id: string;
  name: string;
  realName: string;
}

@Injectable()
export class SlackService implements OnModuleInit {
  private readonly logger = new Logger(SlackService.name);
  private client!: WebClient;
  private userCache: SlackUser[] = [];

  constructor(private readonly secrets: SecretsService) {}

  async onModuleInit(): Promise<void> {
    const token = await this.secrets.getSecret('SLACK_USER_TOKEN');
    if (!token) {
      this.logger.warn(
        'SLACK_USER_TOKEN not found — Slack skills will not work.',
      );
      this.client = new WebClient();
      return;
    }
    this.client = new WebClient(token);
    this.logger.log('Slack client initialized');

    // Pre-cache workspace users
    try {
      await this.refreshUserCache();
    } catch (err) {
      this.logger.warn(`Failed to cache Slack users: ${err}`);
    }
  }

  private async refreshUserCache(): Promise<void> {
    const result = await this.client.users.list({});
    if (result.members) {
      this.userCache = result.members
        .filter((m) => !m.is_bot && !m.deleted && m.id !== 'USLACKBOT')
        .map((m) => ({
          id: m.id!,
          name: (m.name || '').toLowerCase(),
          realName: (m.real_name || m.name || '').toLowerCase(),
        }));
      this.logger.log(`Cached ${this.userCache.length} Slack users`);
    }
  }

  findUser(query: string): SlackUser | null {
    const q = query.toLowerCase().trim();

    // Exact match on display name or real name
    const exact = this.userCache.find(
      (u) => u.name === q || u.realName === q,
    );
    if (exact) return exact;

    // First name match
    const firstName = this.userCache.find(
      (u) => u.realName.split(' ')[0] === q,
    );
    if (firstName) return firstName;

    // Partial match
    const partial = this.userCache.find(
      (u) => u.name.includes(q) || u.realName.includes(q),
    );
    if (partial) return partial;

    // Fuzzy match — handles STT misspellings (Eric/Erik, John/Jon, etc.)
    const fuzzy = this.findFuzzyMatch(q);
    if (fuzzy) {
      this.logger.debug(
        `Fuzzy matched "${query}" → "${fuzzy.realName}" (${fuzzy.name})`,
      );
    }
    return fuzzy;
  }

  private findFuzzyMatch(query: string): SlackUser | null {
    let bestMatch: SlackUser | null = null;
    let bestScore = Infinity;

    for (const user of this.userCache) {
      const targets = [user.name, user.realName.split(' ')[0]];
      for (const target of targets) {
        if (!target) continue;
        const dist = this.editDistance(query, target);
        // Allow up to 2 edits for short names, scale for longer ones
        const maxDist = Math.max(1, Math.floor(target.length / 3));
        if (dist <= maxDist && dist < bestScore) {
          bestScore = dist;
          bestMatch = user;
        }
      }
    }

    return bestMatch;
  }

  private editDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      Array(n + 1).fill(0),
    );

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] =
          a[i - 1] === b[j - 1]
            ? dp[i - 1][j - 1]
            : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }

    return dp[m][n];
  }

  async sendDm(userId: string, text: string): Promise<void> {
    // Open a DM channel
    const conv = await this.client.conversations.open({ users: userId });
    if (!conv.channel?.id) {
      throw new Error('Could not open DM channel');
    }

    await this.client.chat.postMessage({
      channel: conv.channel.id,
      text: `${text}\n\n_/ Ditto Bot_`,
      as_user: true,
    });
  }
}
