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
    return partial || null;
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
