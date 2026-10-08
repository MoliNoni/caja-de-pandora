import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web-only document shell (static export). Loads the display face used by Fonts.serif.
const PAGE_BG = `html, body { background-color: #F7F2EA; }
@media (prefers-color-scheme: dark) { html, body { background-color: #0B0A0C; } }`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..800;1,400..600&display=swap"
        />
        <ScrollViewStyleReset />
        {/* Paint the app background before the JS bundle loads: no white flash on reload. */}
        <style dangerouslySetInnerHTML={{ __html: PAGE_BG }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
