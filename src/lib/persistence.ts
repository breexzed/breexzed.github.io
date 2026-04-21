import type { PersistenceState } from '@/types/Topology';
import type { TabType } from '@/types/Node';

type HistoryEntry = {
  id: string;
  title: string;
  timestamp: string;
};

type PersistenceApi = {
  load: () => PersistenceState;
  save: (state: PersistenceState) => void;
  updateCurrentNode: (nodeId: string, nodeTitle: string) => void;
  updateActiveTab: (tab: TabType) => void;
  getLastNode: () => string;
  getHistory: () => HistoryEntry[];
  clear: () => void;
};

const STORAGE_KEY = 'lens_map_state';
const HISTORY_KEY = 'lens_map_history';
const MAX_HISTORY = 50;

function getDefaultState(): PersistenceState {
  return {
    currentNode: 'root',
    lastVisit: new Date().toISOString(),
    activeTab: 'explorer',
    preferences: {
      animations: true,
      autoSave: true
    }
  };
}

function load(): PersistenceState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistenceState) : getDefaultState();
  } catch (err) {
    console.warn('Failed to load state:', err);
    return getDefaultState();
  }
}

function save(state: PersistenceState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

function addToHistory(nodeId: string, nodeTitle: string): void {
  try {
    let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as HistoryEntry[];
    history = history.filter(item => item.id !== nodeId);
    history.unshift({
      id: nodeId,
      title: nodeTitle,
      timestamp: new Date().toISOString()
    });
    if (history.length > MAX_HISTORY) {
      history = history.slice(0, MAX_HISTORY);
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (err) {
    console.error('Failed to save history:', err);
  }
}

export const Persistence: PersistenceApi = {
  load,
  save,
  updateCurrentNode(nodeId, nodeTitle) {
    const state = load();
    state.currentNode = nodeId;
    state.lastVisit = new Date().toISOString();
    save(state);
    addToHistory(nodeId, nodeTitle);
  },
  updateActiveTab(tab) {
    const state = load();
    state.activeTab = tab;
    save(state);
  },
  getLastNode() {
    return load().currentNode || 'root';
  },
  getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as HistoryEntry[];
    } catch {
      return [];
    }
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
  }
};

declare global {
  interface Window {
    Persistence: PersistenceApi;
  }
}

window.Persistence = Persistence;
