#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '..');
const HOST = '127.0.0.1';
const PREVIEW_PORT = 4173;
const DEBUG_PORT = 9222;

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function startProcess(label, command, args, options) {
  try {
    return spawn(command, args, options);
  } catch (error) {
    throw new Error(`${label}: ${error.message || error}`);
  }
}

function getChromePath() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  const candidates = process.platform === 'win32'
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
      ]
    : process.platform === 'darwin'
      ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']
      : ['/usr/bin/google-chrome', '/usr/bin/chromium-browser', '/usr/bin/chromium'];

  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

async function waitFor(check, timeoutMs, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      if (await check()) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}: ${response.status}`);
  }
  return response.json();
}

function createClient(webSocketUrl) {
  const ws = new WebSocket(webSocketUrl);
  let id = 0;
  const pending = new Map();
  const listeners = new Set();

  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }

    listeners.forEach(listener => listener(message));
  });

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id;
      pending.set(messageId, { resolve, reject });
      ws.send(JSON.stringify({ id: messageId, method, params }));
    });

  return {
    ws,
    send,
    listen(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

async function main() {
  const previewProcess = process.platform === 'win32'
    ? startProcess(
        'Failed to start preview server',
        `${npmCommand()} run preview -- --host ${HOST} --port ${PREVIEW_PORT} --strictPort`,
        [],
        {
          cwd: ROOT_DIR,
          stdio: 'ignore',
          shell: true,
          windowsHide: true
        }
      )
    : startProcess(
        'Failed to start preview server',
        npmCommand(),
        ['run', 'preview', '--', '--host', HOST, '--port', String(PREVIEW_PORT), '--strictPort'],
        {
          cwd: ROOT_DIR,
          stdio: 'ignore'
        }
      );

  const chromePath = getChromePath();
  if (!chromePath) {
    previewProcess.kill();
    throw new Error('Chrome executable not found. Set CHROME_BIN to run the smoke test.');
  }

  const profileDir = path.join(ROOT_DIR, '.tmp-smoke-chrome-profile');
  fs.rmSync(profileDir, { recursive: true, force: true });

  const chromeProcess = startProcess(
    'Failed to start headless Chrome',
    chromePath,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-breakpad',
      '--disable-crash-reporter',
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--user-data-dir',
      profileDir
    ],
    {
      cwd: ROOT_DIR,
      stdio: 'ignore',
      windowsHide: true
    }
  );

  const cleanup = () => {
    chromeProcess.kill();
    previewProcess.kill();
    fs.rmSync(profileDir, { recursive: true, force: true });
  };

  try {
    await waitFor(async () => {
      const response = await fetch(`http://${HOST}:${PREVIEW_PORT}/`);
      return response.ok;
    }, 15000, 'preview server');

    await waitFor(async () => {
      const payload = await fetchJson(`http://${HOST}:${DEBUG_PORT}/json/version`);
      return Boolean(payload.webSocketDebuggerUrl);
    }, 15000, 'Chrome remote debugger');

    const targets = await fetchJson(`http://${HOST}:${DEBUG_PORT}/json`);
    const target = targets.find(entry => entry.type === 'page') || targets[0];
    const client = createClient(target.webSocketDebuggerUrl);
    const runtimeExceptions = [];

    await new Promise((resolve, reject) => {
      client.ws.addEventListener('open', resolve, { once: true });
      client.ws.addEventListener('error', reject, { once: true });
    });

    client.listen(message => {
      if (message.method === 'Runtime.exceptionThrown') {
        runtimeExceptions.push(message.params);
      }
    });

    await client.send('Page.enable');
    await client.send('Runtime.enable');

    const waitForLoad = () =>
      new Promise(resolve => {
        const stopListening = client.listen(message => {
          if (message.method === 'Page.loadEventFired') {
            stopListening();
            resolve();
          }
        });
      });

    async function navigate(url) {
      const loaded = waitForLoad();
      await client.send('Page.navigate', { url });
      await loaded;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    async function evaluate(expression) {
      const result = await client.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      return result.result.value;
    }

    const assertions = [];

    await navigate(`http://${HOST}:${PREVIEW_PORT}/map`);
    assertions.push({
      name: '/map is removed',
      pass: await evaluate(
        `(() => document.body.dataset.route === 'not-found' && document.getElementById('not-found')?.classList.contains('route-hidden') === false)()`
      )
    });

    await navigate(`http://${HOST}:${PREVIEW_PORT}/node/trail_entropy_note`);
    const nodeRouteState = await evaluate(`(() => ({
      path: location.pathname,
      route: document.body.dataset.route || null,
      nodeTitle: document.querySelector('#node-page-shell .node-page-title')?.textContent?.trim() || null
    }))()`);
    assertions.push({
      name: '/node/:id renders the dedicated node page',
      pass:
        nodeRouteState.path === '/node/trail_entropy_note' &&
        nodeRouteState.route === 'node' &&
        nodeRouteState.nodeTitle === 'Entropy Note'
    });

    await navigate(`http://${HOST}:${PREVIEW_PORT}/`);
    const searchResult = await evaluate(`(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 150));
      const input = document.getElementById('search-input');
      if (!input) return { opened: false };
      input.value = 'Entropy Window';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 350));
      const result = document.querySelector('.search-result');
      if (!result) return { opened: true, selected: false };
      result.click();
      await new Promise(resolve => setTimeout(resolve, 600));
      return {
        opened: true,
        selected: true,
        path: location.pathname,
        title: document.querySelector('.detail-title')?.textContent?.trim() || null
      };
    })()`);
    assertions.push({
      name: 'search routes to a node',
      pass:
        searchResult.opened &&
        searchResult.selected &&
        searchResult.path === '/node/entropy_window' &&
        searchResult.title === 'Entropy Window'
    });

    await navigate(`http://${HOST}:${PREVIEW_PORT}/node/being_in_the_world`);
    const markdownLinkResult = await evaluate(`(async () => {
      const contentTab = Array.from(document.querySelectorAll('.exp-tab')).find(el => el.textContent?.trim() === 'Content');
      if (!contentTab) return { tabReady: false };
      contentTab.click();
      await new Promise(resolve => setTimeout(resolve, 250));
      const link = document.querySelector('.node-content a');
      if (!link) return { tabReady: true, linkReady: false };
      link.click();
      await new Promise(resolve => setTimeout(resolve, 600));
      return {
        tabReady: true,
        linkReady: true,
        path: location.pathname,
        title: document.querySelector('.detail-title')?.textContent?.trim() || null
      };
    })()`);
    assertions.push({
      name: 'internal markdown link resolves to node route',
      pass:
        markdownLinkResult.tabReady &&
        markdownLinkResult.linkReady &&
        markdownLinkResult.path === '/node/constraints_and_becoming'
    });

    const failed = assertions.filter(assertion => !assertion.pass);
    const summary = {
      assertions,
      runtimeExceptionCount: runtimeExceptions.length
    };

    console.log(JSON.stringify(summary, null, 2));

    await client.send('Browser.close').catch(() => {});
    client.ws.close();

    if (runtimeExceptions.length > 0 || failed.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    cleanup();
  }
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
