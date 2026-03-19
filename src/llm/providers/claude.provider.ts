import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ILlmProvider, LlmChatOptions, LlmResponse } from '../llm.interface';
import { SecretsService } from '../../secrets/secrets.service';

@Injectable()
export class ClaudeProvider implements ILlmProvider {
  private readonly logger = new Logger(ClaudeProvider.name);
  readonly name = 'claude';
  private client: Anthropic | null = null;

  constructor(private readonly secrets: SecretsService) {}

  async init(): Promise<void> {
    const apiKey = await this.secrets.getSecret('ANTHROPIC_API_KEY');
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY not set — Claude provider unavailable');
      return;
    }
    this.client = new Anthropic({ apiKey });
    this.logger.log('Claude provider ready');
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async chat(model: string, options: LlmChatOptions): Promise<LlmResponse> {
    if (!this.client) {
      throw new Error('Claude provider not initialized — set ANTHROPIC_API_KEY');
    }

    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0,
      ...(options.system ? { system: options.system } : {}),
      messages: options.messages,
    });

    const textBlock = response.content.find((b) => b.type === 'text');

    return {
      text: textBlock ? textBlock.text : '',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
