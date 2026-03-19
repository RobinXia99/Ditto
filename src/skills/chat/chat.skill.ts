import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ISkill, SkillMetadata, SkillResult } from '../../common/interfaces/skill.interface';
import { LlmService } from '../../llm/llm.service';
import { SkillRegistryService } from '../skill-registry.service';

@Injectable()
export class ChatSkill implements ISkill, OnModuleInit {
  private readonly logger = new Logger(ChatSkill.name);

  readonly metadata: SkillMetadata = {
    key: 'chat.ask',
    description:
      'Answer general questions, explain concepts, or have a casual conversation — no external services needed',
    examples: [
      'what is a closure in JavaScript',
      'explain the difference between REST and GraphQL',
      'how does DNS work',
      'what is the capital of France',
      'tell me a joke',
    ],
    parameters: [
      {
        name: 'question',
        type: 'string',
        description: 'The question or topic the user is asking about',
        required: true,
      },
    ],
  };

  constructor(
    private readonly llm: LlmService,
    private readonly registry: SkillRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(params: Record<string, unknown>): Promise<SkillResult> {
    const question = params.question as string;

    if (!question) {
      return {
        success: false,
        spokenResponse: "I didn't catch your question. Could you say it again?",
      };
    }

    this.logger.debug(`Chat question: "${question}"`);

    try {
      const answer = await this.llm.chat('analysis', {
        system: 'You are Ditto, a helpful voice assistant for developers. Answer the user\'s question concisely in 2-4 sentences. Your response will be read aloud, so keep it conversational and natural. Avoid code blocks, bullet points, or markdown — just plain spoken English.',
        messages: [{ role: 'user', content: question }],
        maxTokens: 300,
        temperature: 0.5,
      });

      return {
        success: true,
        spokenResponse: answer,
      };
    } catch (err) {
      this.logger.error(`Chat skill failed: ${err}`);
      return {
        success: false,
        spokenResponse:
          "Sorry, I couldn't come up with an answer right now. Try again in a moment.",
      };
    }
  }
}
