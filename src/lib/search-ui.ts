import { searchManager } from '@/utils/search';
import { Router } from './router';
import { escapeAttr, escapeHtml } from '@/utils/markdown';

export class SearchUI {
  private container: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private results: HTMLElement | null = null;
  private isOpen = false;

  init(): void {
    this.createSearchBar();
    this.bindHotkey();
  }

  private createSearchBar(): void {
    const bar = document.createElement('div');
    bar.className = 'search-bar';
    bar.id = 'search-bar';
    bar.innerHTML = `
      <input type="text" class="search-input" placeholder="Search corpus... (press / to focus)" id="search-input">
      <div class="search-results" id="search-results"></div>
    `;
    document.body.appendChild(bar);

    this.container = bar;
    this.input = bar.querySelector<HTMLInputElement>('#search-input');
    this.results = bar.querySelector<HTMLElement>('#search-results');

    this.input?.addEventListener('input', () => {
      void this.handleInput();
    });
    this.input?.addEventListener('keydown', e => this.handleKeydown(e));

    document.addEventListener('click', e => {
      if (this.isOpen && this.container && !this.container.contains(e.target as Node)) {
        this.close();
      }
    });
  }

  private bindHotkey(): void {
    document.addEventListener('keydown', e => {
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (e.key === '/' && !this.isOpen && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        this.open();
      }
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  private open(): void {
    if (!this.container || !this.input) return;
    this.isOpen = true;
    this.container.classList.add('active');
    this.input.focus();
  }

  private close(): void {
    if (!this.container || !this.input) return;
    this.isOpen = false;
    this.container.classList.remove('active');
    this.input.value = '';
    if (this.results) this.results.innerHTML = '';
  }

  private async handleInput(): Promise<void> {
    if (!this.input || !this.results) return;
    const query = this.input.value.trim();
    if (!query) {
      this.results.innerHTML = '';
      return;
    }

    const matches = await searchManager.search(query, 12);
    if (!matches.length) {
      this.results.innerHTML = '<div class="search-empty">No results found</div>';
      return;
    }

    this.results.innerHTML = matches
      .map(({ node }) => {
        const typeCue = this.toTitleCase(node.type || 'note');
        const statusCue = node.type === 'signal' && node.current_status ? ` • ${this.toTitleCase(node.current_status)}` : '';
        const domainCue = node.domain ? ` • ${node.domain}` : '';
        const sourceCue = node.type === 'trail' && node.source ? ` • ${node.source}` : '';
        return `
          <div class="search-result" data-id="${escapeAttr(node.id)}">
            <div class="sr-title">${this.highlight(escapeHtml(node.title), query)}</div>
            <div class="sr-type">${escapeHtml(typeCue)}${escapeHtml(statusCue)}${escapeHtml(domainCue)}${escapeHtml(sourceCue)}</div>
            <div class="sr-formula">${escapeHtml(node.formula || '')}</div>
          </div>
        `;
      })
      .join('');

    this.results.querySelectorAll<HTMLElement>('.search-result').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        if (!id) return;
        Router.navigateToNode(id);
        this.close();
      });
    });
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (!this.results) return;
    const items = Array.from(this.results.querySelectorAll<HTMLElement>('.search-result'));
    if (!items.length) return;

    let index = items.findIndex(item => item.classList.contains('active'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      index = Math.min(index + 1, items.length - 1);
      this.setActive(items, index);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      index = Math.max(index - 1, 0);
      this.setActive(items, index);
    } else if (e.key === 'Enter' && index >= 0) {
      const id = items[index].dataset.id;
      if (id) {
        Router.navigateToNode(id);
        this.close();
      }
    }
  }

  private setActive(items: HTMLElement[], index: number): void {
    items.forEach((item, i) => item.classList.toggle('active', i === index));
  }

  private highlight(text: string, query: string): string {
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
  }

  private toTitleCase(value: string): string {
    return value
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map(part => part[0].toUpperCase() + part.slice(1))
      .join(' ');
  }
}

export const searchUI = new SearchUI();
