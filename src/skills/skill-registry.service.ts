import { Injectable, Logger } from '@nestjs/common';
import { ISkill, SkillMetadata } from '../common/interfaces/skill.interface';

@Injectable()
export class SkillRegistryService {
  private readonly logger = new Logger(SkillRegistryService.name);
  private readonly skills = new Map<string, ISkill>();

  register(skill: ISkill): void {
    const { key } = skill.metadata;
    if (this.skills.has(key)) {
      this.logger.warn(`Skill "${key}" already registered — overwriting`);
    }
    this.skills.set(key, skill);
    this.logger.log(`Skill registered: ${key}`);
  }

  get(key: string): ISkill | undefined {
    return this.skills.get(key);
  }

  has(key: string): boolean {
    return this.skills.has(key);
  }

  getAll(): ISkill[] {
    return Array.from(this.skills.values());
  }

  getAllMetadata(): SkillMetadata[] {
    return this.getAll().map((s) => s.metadata);
  }

  getSkillDescriptions(): string {
    return this.getAll()
      .map((skill) => {
        const { key, description, examples, parameters } = skill.metadata;
        const paramStr = parameters
          .map(
            (p) =>
              `  - ${p.name} (${p.type}${p.required ? ', required' : ''}): ${p.description}`,
          )
          .join('\n');
        const exampleStr = examples.map((e) => `  - "${e}"`).join('\n');

        return `Skill: ${key}
  Description: ${description}
  Parameters:
${paramStr}
  Examples:
${exampleStr}`;
      })
      .join('\n\n');
  }
}
