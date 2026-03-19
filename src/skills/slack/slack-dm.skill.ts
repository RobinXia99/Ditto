import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ISkill, SkillMetadata, SkillResult } from '../../common/interfaces/skill.interface';
import { SlackService } from './slack.service';
import { LlmService } from '../../llm/llm.service';
import { SkillRegistryService } from '../skill-registry.service';

@Injectable()
export class SlackDmSkill implements ISkill, OnModuleInit {
  private readonly logger = new Logger(SlackDmSkill.name);

  readonly metadata: SkillMetadata = {
    key: 'slack.dm',
    description: 'Send a direct message to someone on Slack. Can generate content like jokes, compliments, or creative messages.',
    examples: [
      'send a Slack message to John saying the deploy is done',
      'DM Sarah on Slack that I will be late',
      'tell Mike on Slack the PR is ready for review',
      'message Alex on Slack hey are you free for a call',
      'DM Andreas a joke',
      'send Sarah a compliment on Slack',
    ],
    parameters: [
      {
        name: 'recipient',
        type: 'string',
        description: 'The name of the person to message',
        required: true,
      },
      {
        name: 'message',
        type: 'string',
        description: 'The message to send, or a description of what to generate (e.g. "a joke", "a compliment", "something funny")',
        required: true,
      },
    ],
  };

  constructor(
    private readonly slack: SlackService,
    private readonly llm: LlmService,
    private readonly registry: SkillRegistryService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(params: Record<string, unknown>): Promise<SkillResult> {
    const recipient = params.recipient as string;
    const message = params.message as string;
    const rawTranscription = (params.rawTranscription as string) || message;

    if (!recipient || !message) {
      return {
        success: false,
        spokenResponse:
          'I need a name and a message. For example: message John on Slack saying the deploy is done.',
      };
    }

    this.logger.debug(`Slack DM to "${recipient}": "${message}"`);

    try {
      const user = this.slack.findUser(recipient);
      if (!user) {
        return {
          success: false,
          spokenResponse: `I couldn't find anyone named ${recipient} in your Slack workspace. Try using their full name.`,
        };
      }

      // If the message looks like a request to generate content, expand it
      const finalMessage = await this.composeMessage(rawTranscription, recipient);
      this.logger.debug(`Final message: "${finalMessage}"`);

      await this.slack.sendDm(user.id, finalMessage);

      return {
        success: true,
        spokenResponse: `Done. I sent ${recipient} a message on Slack.`,
        data: { recipient: user.realName, userId: user.id },
      };
    } catch (err) {
      this.logger.error(`Slack DM failed: ${err}`);
      return {
        success: false,
        spokenResponse: `Sorry, I couldn't send that message to ${recipient}. Make sure my Slack bot has the right permissions.`,
      };
    }
  }

  private async composeMessage(
    message: string,
    recipient: string,
  ): Promise<string> {
    this.logger.debug(`Composing message for ${recipient}: "${message}"`);

    const generated = await this.llm.chat('analysis', {
      system: `You compose Slack DMs on behalf of the user. The user dictated what they want to send via voice command.

Rules:
- Output ONLY the final message to send. No quotes, no explanation, no preamble.
- Always write a complete sentence or question.
- Keep the tone casual and friendly.
- If the user wants to SEND something (e.g. "a joke", "a compliment", "a fun fact"), GENERATE that content and include it in the message. Do NOT ask the recipient for it.
- If the user wants to ASK something, write the question directed at the recipient.
- Preserve the EXACT intent and subject matter.
- Address the recipient by name at the start if it feels natural.
- NEVER cut off mid-sentence. Always finish your thought.`,
      messages: [
        {
          role: 'user',
          content: `The user wants to DM ${recipient}. Their voice command was: "DM ${recipient} ${message}". Compose the Slack message.`,
        },
      ],
      maxTokens: 300,
      temperature: 0.3,
    });

    return generated.trim();
  }
}
