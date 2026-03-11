import './style.css';
import { App } from './app/App';

const root = document.querySelector<HTMLDivElement>('#app');

if (!root) {
  throw new Error('App root not found.');
}

const showFatalError = (error: unknown) => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  root.innerHTML = `
    <section class="screen">
      <div class="panel">
        <span class="eyebrow">Boot Error</span>
        <h1 class="hero-title">App failed to start</h1>
        <p class="hero-subtitle">A runtime error blocked the first render. Please reload once after updating.</p>
        <pre class="muted-text">${message}</pre>
      </div>
    </section>
  `;
};

window.addEventListener('error', (event) => {
  showFatalError(event.error ?? event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  showFatalError(event.reason);
});

try {
  new App(root);
} catch (error) {
  showFatalError(error);
}
