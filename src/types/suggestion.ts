import { ContextMemory } from './context';

export interface ContextSuggestion {
  memory: ContextMemory;
  confidence: number;
  reasons: SuggestionReason[];
}

export interface SuggestionReason {
  type: 'keyword' | 'file-signature' | 'framework' | 'endpoint' | 'workflow';
  description: string;
  weight: number;
}

export interface MatchScoreBreakdown {
  keywordScore: number;
  fileSignatureScore: number;
  frameworkScore: number;
  endpointScore: number;
  workflowScore: number;
  totalScore: number;
}
