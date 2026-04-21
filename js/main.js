/**
 * main.js
 * Application orchestration
 * Initializes all modules and handles global interactions
 */

(function() {
  'use strict';

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    const profile = window.LensMapCompat ? window.LensMapCompat.getProfile() : 'legacy';
    console.log(`◈ Lens Map initializing... (profile: ${profile})`);

    // Initialize modules
    initCosmos();
    initCursor();
    initScrollReveal();
    initNodeCards();
    initExplorer();

    console.log('✓ Lens Map ready');
  }

  // Initialize cosmos background
  function initCosmos() {
    if (window.Cosmos) {
      Cosmos.init();
    }
  }

  // Initialize custom cursor
  function initCursor() {
    // Skip on touch devices
    if ('ontouchstart' in window) {
      document.body.style.cursor = 'auto';
      const dot = document.getElementById('cdot');
      const ring = document.getElementById('cring');
      if (dot) dot.style.display = 'none';
      if (ring) ring.style.display = 'none';
      return;
    }

    const cdot = document.getElementById('cdot');
    const cring = document.getElementById('cring');
    if (!cdot || !cring) return;

    let mx = 0, my = 0, ox = 0, oy = 0;

    document.addEventListener('mousemove', (e) => {
      mx = e.clientX;
      my = e.clientY;
      cdot.style.left = mx + 'px';
      cdot.style.top = my + 'px';
    });

    // Smooth ring follow
    (function loop() {
      ox += (mx - ox) * 0.1;
      oy += (my - oy) * 0.1;
      cring.style.left = ox + 'px';
      cring.style.top = oy + 'px';
      requestAnimationFrame(loop);
    })();

    // Interactive elements highlight
    const INTERACTIVE = 'a, button, .n-card, .tree-item, .child-card, .cta-btn, .exp-tab, .back-link, .bc-item';

    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(INTERACTIVE)) {
        cring.classList.add('active');
      }
    });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(INTERACTIVE)) {
        cring.classList.remove('active');
      }
    });
  }

  // Initialize scroll reveal animations
  function initScrollReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
        }
      });
    }, { threshold: 0.10 });

    document.querySelectorAll('.reveal, .stagger').forEach((el) => {
      io.observe(el);
    });
  }

  // Initialize node cards → explorer navigation
  function initNodeCards() {
    document.querySelectorAll('.n-card[data-node]').forEach((card) => {
      card.addEventListener('click', () => {
        const nodeId = card.dataset.node;
        if (window.Explorer && window.Explorer.getNodes()[nodeId]) {
          window.Explorer.navigate(nodeId);
          
          // Smooth scroll to map section
          const mapSection = document.getElementById('map');
          if (mapSection) {
            mapSection.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }
        }
      });
    });
  }

  // Initialize explorer module
  async function initExplorer() {
    if (window.Explorer) {
      await Explorer.init();
    } else {
      console.error('Explorer module not loaded');
    }
  }

  // Export for debugging
  window.LensMap = {
    version: '1.0',
    modules: {
      compat: window.LensMapCompat,
      cosmos: window.Cosmos,
      explorer: window.Explorer,
      persistence: window.Persistence
    }
  };
})();
