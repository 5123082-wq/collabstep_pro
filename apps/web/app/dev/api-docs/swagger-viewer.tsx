'use client';

import { useEffect, useRef } from 'react';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject());
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.body.appendChild(script);
  });
}

function loadStylesheet(href: string): void {
  if (document.querySelector(`link[href="${href}"]`)) {
    return;
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function SwaggerViewer() {
  const ref = useRef<HTMLDivElement>(null);
  type SwaggerBundle = {
    (config: unknown): unknown;
    presets: { apis: unknown };
  };
  type SwaggerWindow = Window & {
    SwaggerUIBundle?: SwaggerBundle;
    SwaggerUIStandalonePreset?: unknown;
  };

  useEffect(() => {
    loadStylesheet('https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css');

    let cancelled = false;
    Promise.all([
      loadScript('https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js'),
      loadScript('https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js')
    ])
      .then(() => {
        if (cancelled) {
          return;
        }
        const swaggerWindow = window as SwaggerWindow;
        const SwaggerUIBundle = swaggerWindow.SwaggerUIBundle;
        const SwaggerUIStandalonePreset = swaggerWindow.SwaggerUIStandalonePreset;
        if (SwaggerUIBundle) {
          SwaggerUIBundle({
            url: '/dev/api-docs/spec',
            dom_id: '#swagger-ui',
            presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
            layout: 'StandaloneLayout'
          });
        }
      })
      .catch((error) => {
        console.error('Failed to load Swagger UI', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return <div id="swagger-ui" ref={ref} className="min-h-[70vh]" />;
}

