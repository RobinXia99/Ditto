export interface ParsedIntent {
  skillKey: string;
  parameters: Record<string, unknown>;
  confidence: number;
  rawText: string;
}

export interface IntentParseResult {
  intent: ParsedIntent | null;
  fallbackResponse: string | null;
}
