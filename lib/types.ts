export type SystemTier = 'CORE' | 'PRODUCT' | 'SERVICE' | 'MODULE' | 'LAB';

export interface SystemModule {
  name: string;
  repo: string;
  tier: SystemTier;
  role: string;
  dependsOn?: string[];
  critical?: boolean;
}

export interface Ecosystem {
  modules: SystemModule[];
}

export interface ArchitectureIssue {
  type: 'CRITICAL' | 'LOOP' | 'REDUNDANCY' | 'SUGGESTION' | 'HEALTHY';
  system?: string;
  message: string;
  actionRequired: string;
}
