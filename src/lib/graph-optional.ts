// Lightweight optional wrapper around the real GraphEngine.
// Defers importing the heavy graph modules until actually needed and
// provides safe no-op forwarding for setActiveNode/destroy when the
// real engine can't be loaded.

type MountOptions = any;
	export class GraphEngine {
	  private real: any | null = null;

	  // Attempt to dynamically load and mount the real engine.
	  async mount(options: MountOptions): Promise<any> {
	    try {
	      const mod = await import('./graph-engine');
	      const Real = mod.GraphEngine;
	      this.real = new Real();
	      return await this.real.mount(options);
	    } catch (err) {
	      // Surface a clear warning; callers (graph-bootstrap) already handle mount failures.
	      console.warn('Optional graph wrapper: real graph engine failed to load or initialize.', err);
	      throw err;
	    }
	  }

	  setActiveNode(nodeId: string): void {
	    if (this.real && typeof this.real.setActiveNode === 'function') {
	      try {
	        this.real.setActiveNode(nodeId);
	      } catch (err) {
	        console.warn('Optional graph wrapper: setActiveNode failed on real engine', err);
	      }
	    }
	    // If real is not present, silently no-op. This keeps routing and explorer logic safe.
	  }

	  destroy(): void {
	    if (this.real && typeof this.real.destroy === 'function') {
	      try {
	        this.real.destroy();
	      } catch (err) {
	        console.warn('Optional graph wrapper: destroy failed on real engine', err);
	      }
	    }
	    this.real = null;
	  }
	}
