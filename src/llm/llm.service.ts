import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ILlmProvider,
  LlmChatOptions,
  LlmResponse,
  LlmTaskConfig,
} from './llm.interface';
import { ClaudeProvider } from './providers/claude.provider';
import { GeminiProvider } from './providers/gemini.provider';

export type LlmTask = 'intent' | 'analysis';

const DEFAULT_TASK_CONFIGS: Record<LlmTask, LlmTaskConfig> = {
  intent: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
  analysis: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
};

@Injectable()
export class LlmService implements OnModuleInit {
  private readonly logger = new Logger(LlmService.name);
  private readonly providers = new Map<string, ILlmProvider>();
  private readonly taskConfigs = new Map<LlmTask, LlmTaskConfig>();
  private totalInputTokens = 0;
  private totalOutputTokens = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly claudeProvider: ClaudeProvider,
    private readonly geminiProvider: GeminiProvider,
  ) {}

  async onModuleInit(): Promise<void> {
    // Initialize all providers (they gracefully skip if keys are missing)
    await Promise.all([
      this.claudeProvider.init(),
      this.geminiProvider.init(),
    ]);

    // Register available providers
    for (const provider of [this.claudeProvider, this.geminiProvider]) {
      this.providers.set(provider.name, provider);
    }

    // Load per-task config from env
    for (const task of ['intent', 'analysis'] as LlmTask[]) {
      const envPrefix = `LLM_${task.toUpperCase()}`;
      const provider = this.configService.get<string>(
        `${envPrefix}_PROVIDER`,
      );
      const model = this.configService.get<string>(`${envPrefix}_MODEL`);

      if (provider && model) {
        this.taskConfigs.set(task, { provider, model });
        this.logger.log(`LLM ${task}: ${provider}/${model}`);
      } else {
        const defaults = DEFAULT_TASK_CONFIGS[task];
        this.taskConfigs.set(task, defaults);
        this.logger.log(
          `LLM ${task}: ${defaults.provider}/${defaults.model} (default)`,
        );
      }
    }

    // Validate that configured providers are available
    for (const [task, config] of this.taskConfigs) {
      const provider = this.providers.get(config.provider);
      if (!provider || !(provider as any).isAvailable()) {
        this.logger.warn(
          `LLM ${task} configured for "${config.provider}" but it's not available. Check API key.`,
        );
      }
    }
  }

  /**
   * Run a chat completion for a specific task.
   * The provider and model are resolved from config.
   */
  async chat(task: LlmTask, options: LlmChatOptions): Promise<string> {
    const config = this.taskConfigs.get(task);
    if (!config) {
      throw new Error(`No LLM configuration for task: ${task}`);
    }

    const provider = this.providers.get(config.provider);
    if (!provider) {
      throw new Error(
        `LLM provider "${config.provider}" not found. Available: ${Array.from(this.providers.keys()).join(', ')}`,
      );
    }

    const response = await provider.chat(config.model, options);

    this.totalInputTokens += response.inputTokens;
    this.totalOutputTokens += response.outputTokens;

    this.logger.debug(
      `[${task}] ${config.provider}/${config.model} — in: ${response.inputTokens}, out: ${response.outputTokens} | session total in: ${this.totalInputTokens}, out: ${this.totalOutputTokens}`,
    );

    return response.text;
  }

  getTokenUsage(): { input: number; output: number } {
    return {
      input: this.totalInputTokens,
      output: this.totalOutputTokens,
    };
  }

  getTaskConfig(task: LlmTask): LlmTaskConfig | undefined {
    return this.taskConfigs.get(task);
  }
}
