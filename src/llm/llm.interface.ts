export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmChatOptions {
  system?: string;
  messages: LlmMessage[];
  maxTokens?: number;
  temperature?: number;
}

export interface LlmResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ILlmProvider {
  readonly name: string;
  chat(model: string, options: LlmChatOptions): Promise<LlmResponse>;
}

/**
 * Per-task LLM configuration.
 * Each task (intent parsing, analysis) can use a different provider + model.
 */
export interface LlmTaskConfig {
  provider: string; // 'claude' | 'gemini'
  model: string;
}
