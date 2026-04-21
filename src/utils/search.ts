import FlexSearch from 'flexsearch';
import type { Node } from '@/types/Node';
import type { SearchResult } from '@/types/Topology';

type SearchDoc = {
  id: string;
  title: string;
  desc: string;
  markdown: string;
  tags: string;
  domain?: string;
  signalStatus?: string;
  sourceRef?: string;
};

type SearchPayload = {
  docs?: SearchDoc[];
};

type FieldResult = {
  field: string;
  result: Array<string | number>;
};

export class SearchManager {
  private index: FlexSearch.Document<SearchDoc> | null = null;
  private nodes: Record<string, Node> = {};
  private ready = false;

  async init(nodes: Record<string, Node>): Promise<void> {
    this.nodes = nodes;
    this.index = new FlexSearch.Document<SearchDoc>({
      document: {
        id: 'id',
        index: ['title', 'desc', 'markdown', 'tags', 'domain', 'signalStatus', 'sourceRef']
      },
      tokenize: 'forward',
      resolution: 9
    });

    try {
      const response = await fetch('/data/search-index.json');
      if (!response.ok) throw new Error(`Search index load failed: ${response.status}`);
      const payload = (await response.json()) as SearchPayload;
      const docs = Array.isArray(payload.docs) ? payload.docs : [];
      docs.forEach(doc => this.index?.add(doc));
      this.ready = true;
      console.log(`✓ Search index loaded (${docs.length} docs)`);
    } catch (err) {
      console.warn('Search index not found, building in-memory fallback...', err);
      this.buildFallbackIndex();
    }
  }

  private buildFallbackIndex(): void {
    if (!this.index) return;
    Object.values(this.nodes)
      .filter(node => node.id !== 'root' && (node.status || 'published') === 'published')
      .forEach(node => {
        this.index?.add({
          id: node.id,
          title: node.title || '',
          desc: node.desc || '',
          markdown: node.markdown || '',
          tags: (node.tags || []).join(' '),
          domain: node.domain || '',
          signalStatus: node.current_status || '',
          sourceRef: node.source || ''
        });
      });
    this.ready = true;
    console.log('✓ Search fallback index built');
  }

  async search(query: string, limit = 20): Promise<SearchResult[]> {
    if (!this.ready || !this.index) return [];
    const q = query.trim();
    if (!q) return [];

    const raw = (await this.index.search(q, { limit })) as FieldResult[];
    const seen = new Set<string>();
    const merged: SearchResult[] = [];

    for (const fieldResults of raw) {
      for (const idValue of fieldResults.result || []) {
        const id = String(idValue);
        if (seen.has(id)) continue;
        seen.add(id);
        const node = this.nodes[id];
        if (!node || (node.status || 'published') !== 'published') continue;
        merged.push({ id, score: 1, node });
      }
    }

    return merged.slice(0, limit);
  }

  isReady(): boolean {
    return this.ready;
  }
}

export const searchManager = new SearchManager();
