import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Web-only document shell (static export). Loads the display face used by Fonts.serif.
// Background before JS loads, plus a keyboard focus ring for controls without their own (TouchableOpacity).
const PAGE_BG = `html, body { background-color: #F7F2EA; }
@media (prefers-color-scheme: dark) { html, body { background-color: #0B0A0C; } }
@media (prefers-color-scheme: dark) { html:not([data-hydrated]) #root { visibility: hidden; } }
:is(a, [role=button], [role=link], [role=tab], [role=checkbox], [role=switch]):focus-visible { outline: 2px solid #8E3B54; outline-offset: 2px; }
@media (prefers-color-scheme: dark) { :is(a, [role=button], [role=link], [role=tab], [role=checkbox], [role=switch]):focus-visible { outline-color: #E7B7A3; } }`;

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
        {/* Paint the app background before the JS bundle loads: no white flash on reload. The static
            HTML is always rendered light, so in dark mode it stays hidden until hydration. */}
        <style dangerouslySetInnerHTML={{ __html: PAGE_BG }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
