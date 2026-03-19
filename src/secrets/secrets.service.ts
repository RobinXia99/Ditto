import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const SERVICE_NAME = 'ditto-assistant';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);
  private keytar: typeof import('keytar') | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    try {
      this.keytar = await import('keytar');
      this.logger.log('Keytar loaded — using OS keychain for secrets');
    } catch {
      this.logger.warn(
        'Keytar not available — falling back to env variables only',
      );
    }
  }

  async getSecret(key: string): Promise<string | null> {
    // Try keychain first
    if (this.keytar) {
      try {
        const value = await this.keytar.getPassword(SERVICE_NAME, key);
        if (value) return value;
      } catch (err) {
        this.logger.debug(`Keychain lookup failed for ${key}: ${err}`);
      }
    }

    // Fall back to env
    const envValue = this.configService.get<string>(key);
    return envValue || null;
  }

  async setSecret(key: string, value: string): Promise<void> {
    if (!this.keytar) {
      throw new Error(
        'Keytar not available. Install keytar or set secrets via environment variables.',
      );
    }
    await this.keytar.setPassword(SERVICE_NAME, key, value);
    this.logger.log(`Secret "${key}" stored in OS keychain`);
  }

  async deleteSecret(key: string): Promise<void> {
    if (this.keytar) {
      await this.keytar.deletePassword(SERVICE_NAME, key);
    }
  }
}
