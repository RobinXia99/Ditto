export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required: boolean;
}

export interface SkillMetadata {
  key: string;
  description: string;
  examples: string[];
  parameters: SkillParameter[];
}

export interface SkillResult {
  success: boolean;
  spokenResponse: string;
  data?: Record<string, unknown>;
}

export interface ISkill {
  metadata: SkillMetadata;
  execute(params: Record<string, unknown>): Promise<SkillResult>;
}
