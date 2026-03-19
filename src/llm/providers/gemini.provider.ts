import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ILlmProvider, LlmChatOptions, LlmResponse } from '../llm.interface';
import { SecretsService } from '../../secrets/secrets.service';

@Injectable()
export class GeminiProvider implements ILlmProvider {
  private readonly logger = new Logger(GeminiProvider.name);
  readonly name = 'gemini';
  private client: GoogleGenAI | null = null;

  constructor(private readonly secrets: SecretsService) {}

  async init(): Promise<void> {
    const apiKey = await this.secrets.getSecret('GOOGLE_AI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GOOGLE_AI_API_KEY not set — Gemini provider unavailable');
      return;
    }

    this.client = new GoogleGenAI({ apiKey });
    this.logger.log('Gemini provider ready');
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  async chat(model: string, options: LlmChatOptions): Promise<LlmResponse> {
    if (!this.client) {
      throw new Error('Gemini provider not initialized — set GOOGLE_AI_API_KEY');
    }

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (options.system) {
      contents.push({
        role: 'user',
        parts: [{ text: `System instructions: ${options.system}` }],
      });
      contents.push({
        role: 'model',
        parts: [{ text: 'Understood. I will follow these instructions.' }],
      });
    }

    for (const msg of options.messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    const response = await this.client.models.generateContent({
      model,
      contents,
      config: {
        maxOutputTokens: options.maxTokens ?? 1024,
        temperature: options.temperature ?? 0,
      },
    });

    const text = response.text ?? '';
    const usage = response.usageMetadata ?? {};

    return {
      text,
      inputTokens: usage.promptTokenCount ?? 0,
      outputTokens: usage.candidatesTokenCount ?? 0,
    };
  }
}
