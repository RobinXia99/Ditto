import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { SkillRegistryService } from '../skills/skill-registry.service';
import { IntentParseResult } from '../common/interfaces/intent.interface';

@Injectable()
export class IntentService {
  private readonly logger = new Logger(IntentService.name);

  constructor(
    private readonly llm: LlmService,
    private readonly skillRegistry: SkillRegistryService,
  ) {}

  async parse(text: string): Promise<IntentParseResult> {
    this.logger.debug(`Parsing intent from: "${text}"`);

    const skillDescriptions = this.skillRegistry.getSkillDescriptions();

    const systemPrompt = `You are an intent parser for a voice-controlled developer assistant called Ditto.

Given a user's spoken command, determine which skill to invoke and extract parameters.

Available skills:
${skillDescriptions}

Respond ONLY with valid JSON in this exact format:
{
  "skillKey": "the.skill.key",
  "parameters": { "param1": "value1" },
  "confidence": 0.95
}

If no skill matches, respond with:
{
  "skillKey": "none",
  "parameters": {},
  "confidence": 0,
  "fallbackResponse": "A helpful spoken response to the user"
}

Rules:
- Extract owner and repo from phrases like "owner/repo" or "the repo owner slash repo"
- PR numbers can be spoken as "PR 123", "pull request 123", "number 123"
- confidence should be 0.0-1.0 based on how well the command matches
- Be lenient with speech-to-text artifacts (filler words, slight misspellings)`;

    try {
      const response = await this.llm.chat('intent', {
        system: systemPrompt,
        messages: [{ role: 'user', content: text }],
        maxTokens: 256,
        temperature: 0,
      });

      const parsed = JSON.parse(response);

      if (parsed.skillKey === 'none' || parsed.confidence < 0.3) {
        return {
          intent: null,
          fallbackResponse:
            parsed.fallbackResponse ||
            "I'm not sure what you'd like me to do. Could you try again?",
        };
      }

      this.logger.debug(
        `Intent: ${parsed.skillKey} (confidence: ${parsed.confidence})`,
      );

      return {
        intent: {
          skillKey: parsed.skillKey,
          parameters: parsed.parameters,
          confidence: parsed.confidence,
          rawText: text,
        },
        fallbackResponse: null,
      };
    } catch (err) {
      this.logger.error(`Intent parsing failed: ${err}`);
      return {
        intent: null,
        fallbackResponse:
          "I had trouble understanding that. Could you try again?",
      };
    }
  }
}
