import type { Node, TabType } from './Node';

export interface SearchIndex {
  ready: boolean;
  index: unknown;
  nodeIds: string[];
}

export interface SearchResult {
  id: string;
  score: number;
  node: Node;
}

export interface UserPreferences {
  animations: boolean;
  autoSave: boolean;
  theme?: 'light' | 'dark';
}

export interface PersistenceState {
  currentNode: string;
  lastVisit: string;
  activeTab: TabType;
  preferences: UserPreferences;
}
