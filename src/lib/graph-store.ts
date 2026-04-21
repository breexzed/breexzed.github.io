import type { GraphContracts, Node } from '@/types';
import { buildGraphContracts } from './graph-adapter';

let contracts: GraphContracts | null = null;

export const GraphStore = {
  hydrate(nodes: Record<string, Node>): GraphContracts {
    contracts = buildGraphContracts(nodes);
    return contracts;
  },

  get(): GraphContracts | null {
    return contracts;
  }
};
