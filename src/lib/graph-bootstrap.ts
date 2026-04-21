import { Explorer } from './explorer';
import { Router } from './router';
import { GraphEngine } from './graph-engine';

type MapSurfaceView = 'graph' | 'explorer';

export class GraphBootstrap {
  private engine: GraphEngine | null = null;
  private listening = false;
  private shell: HTMLElement | null = null;
  private host: HTMLElement | null = null;
  private status: HTMLElement | null = null;
  private view: MapSurfaceView = 'graph';
  private graphStatus = 'Graph ready';
  private mountRequestId = 0;

  async init(): Promise<void> {
    this.shell = document.getElementById('map-surface-shell');
    this.host = document.getElementById('graph-canvas-host');
    this.status = document.getElementById('graph-canvas-status');
    if (!this.shell || !this.host || !this.status) return;

    if (location.pathname.startsWith('/node/')) {
      this.view = 'explorer';
    }

    this.bindViewControls();
    this.renderView();
    await this.ensureGraphMounted();

    if (!this.listening) {
      window.addEventListener('explorer:node-change', (event: Event) => {
        const detail = (event as CustomEvent<{ nodeId?: string }>).detail;
        if (!detail?.nodeId) return;
        this.engine?.setActiveNode(detail.nodeId);
      });

      window.addEventListener('route:change', (event: Event) => {
        const detail = (event as CustomEvent<{ key?: string }>).detail;
        if (detail?.key === 'node') {
          void this.setView('explorer');
          return;
        }
        if (detail?.key === 'map' || detail?.key === 'home') {
          void this.setView('graph');
        }
      });

      this.listening = true;
    }
  }

  async setView(view: MapSurfaceView): Promise<void> {
    this.view = view;
    this.renderView();

    if (view === 'graph') {
      await this.ensureGraphMounted();
      return;
    }

    this.destroyGraph();
  }

  destroy(): void {
    this.destroyGraph();
    this.shell?.removeAttribute('data-map-view');
  }

  private bindViewControls(): void {
    if (!this.shell) return;

    this.shell.querySelectorAll<HTMLButtonElement>('[data-map-view-target]').forEach(button => {
      if (button.dataset.bound === 'true') return;

      button.addEventListener('click', () => {
        const nextView = button.dataset.mapViewTarget as MapSurfaceView | undefined;
        if (!nextView || nextView === this.view) return;
        void this.setView(nextView);
      });
      button.dataset.bound = 'true';
    });
  }

  private renderView(): void {
    if (!this.shell || !this.status) return;

    this.shell.dataset.mapView = this.view;
    this.status.textContent = this.view === 'graph' ? this.graphStatus : 'Map Explorer view';

    this.shell.querySelectorAll<HTMLButtonElement>('[data-map-view-target]').forEach(button => {
      const active = button.dataset.mapViewTarget === this.view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  private async ensureGraphMounted(): Promise<void> {
    if (!this.host || !this.status) return;
    if (this.view !== 'graph') return;
    if (this.engine) {
      this.engine.setActiveNode(Explorer.getActiveNode());
      this.renderView();
      return;
    }

    const contracts = Explorer.getGraphContracts();
    if (!contracts) {
      this.graphStatus = 'Graph contracts unavailable';
      this.renderView();
      return;
    }

    const requestId = ++this.mountRequestId;
    this.graphStatus = 'Initializing graph...';
    this.renderView();

    const engine = new GraphEngine();

    try {
      const result = await engine.mount({
        container: this.host,
        contracts,
        onNodeSelect: nodeId => {
          void this.setView('explorer');
          Router.navigateToNode(nodeId);
        }
      });

      if (requestId !== this.mountRequestId || this.view !== 'graph') {
        engine.destroy();
        return;
      }

      this.engine = engine;
      this.engine.setActiveNode(Explorer.getActiveNode());
      this.graphStatus = result.usedCachedLayout ? 'Graph ready - cached layout' : 'Graph ready - layout saved';
      this.renderView();
    } catch (err) {
      console.error('Failed to initialize graph engine:', err);
      engine.destroy();
      this.graphStatus = 'Graph failed to initialize';
      this.renderView();
    }
  }

  private destroyGraph(): void {
    this.mountRequestId += 1;
    this.engine?.destroy();
    this.engine = null;
    this.host?.replaceChildren();
    this.renderView();
  }
}

export const graphBootstrap = new GraphBootstrap();
