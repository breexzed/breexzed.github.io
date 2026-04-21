/**
 * persistence.js
 * Manages state across visits using localStorage
 * 
 * Stores:
 * - Last visited node
 * - Reading history
 * - User preferences (future)
 */

const Persistence = (() => {
  const STORAGE_KEY = 'lens_map_state';
  const HISTORY_KEY = 'lens_map_history';
  const MAX_HISTORY = 50;

  // Load state from localStorage
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : getDefaultState();
    } catch (err) {
      console.warn('Failed to load state:', err);
      return getDefaultState();
    }
  }

  // Save state to localStorage
  function save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error('Failed to save state:', err);
    }
  }

  // Default state structure
  function getDefaultState() {
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

  // Add to reading history
  function addToHistory(nodeId, nodeTitle) {
    try {
      let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      
      // Remove duplicates
      history = history.filter(item => item.id !== nodeId);
      
      // Add to front
      history.unshift({
        id: nodeId,
        title: nodeTitle,
        timestamp: new Date().toISOString()
      });
      
      // Trim to max length
      if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
      }
      
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (err) {
      console.error('Failed to save history:', err);
    }
  }

  // Get reading history
  function getHistory() {
    try {
      return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch (err) {
      return [];
    }
  }

  // Clear all data
  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(HISTORY_KEY);
  }

  // Update current node
  function updateCurrentNode(nodeId, nodeTitle) {
    const state = load();
    state.currentNode = nodeId;
    state.lastVisit = new Date().toISOString();
    save(state);
    addToHistory(nodeId, nodeTitle);
  }

  // Update active tab
  function updateActiveTab(tab) {
    const state = load();
    state.activeTab = tab;
    save(state);
  }

  // Get last visited node (for restore on page load)
  function getLastNode() {
    const state = load();
    return state.currentNode || 'root';
  }

  // Export public API
  return {
    load,
    save,
    updateCurrentNode,
    updateActiveTab,
    getLastNode,
    getHistory,
    clear
  };
})();

// Make available globally
window.Persistence = Persistence;