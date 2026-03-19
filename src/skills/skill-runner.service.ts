import { Injectable, Logger } from '@nestjs/common';
import { SkillRegistryService } from './skill-registry.service';
import { SkillResult } from '../common/interfaces/skill.interface';

const SKILL_TIMEOUT_MS = 30_000;

@Injectable()
export class SkillRunnerService {
  private readonly logger = new Logger(SkillRunnerService.name);

  constructor(private readonly registry: SkillRegistryService) {}

  async execute(
    skillKey: string,
    parameters: Record<string, unknown>,
  ): Promise<SkillResult> {
    const skill = this.registry.get(skillKey);
    if (!skill) {
      this.logger.warn(`Skill not found: ${skillKey}`);
      return {
        success: false,
        spokenResponse: `I don't know how to handle that skill: ${skillKey}`,
      };
    }

    this.logger.debug(
      `Executing skill: ${skillKey} with params: ${JSON.stringify(parameters)}`,
    );

    try {
      const result = await Promise.race([
        skill.execute(parameters),
        this.timeout(SKILL_TIMEOUT_MS),
      ]);
      return result;
    } catch (err) {
      this.logger.error(`Skill "${skillKey}" failed: ${err}`);
      return {
        success: false,
        spokenResponse: `Sorry, the ${skillKey} skill encountered an error. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`Skill timed out after ${ms}ms`)),
        ms,
      ),
    );
  }
}
