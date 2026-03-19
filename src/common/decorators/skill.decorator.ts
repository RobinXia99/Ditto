import { SetMetadata } from '@nestjs/common';
import { SKILL_METADATA_KEY } from '../constants/tokens';
import { SkillMetadata } from '../interfaces/skill.interface';

export const Skill = (metadata: SkillMetadata): ClassDecorator =>
  SetMetadata(SKILL_METADATA_KEY, metadata);
