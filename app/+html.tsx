import { ScrollViewStyleReset } from "expo-router/html";
import { type PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <meta
          name="description"
          content="NotAPlane — report and explore unidentified aerial sightings."
        />
        <title>NotAPlane</title>
        <ScrollViewStyleReset />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root { height: 100%; }
              body {
                margin: 0;
                background: #141414;
                overflow-x: hidden;
                -webkit-text-size-adjust: 100%;
                text-size-adjust: 100%;
              }
              input, textarea, select {
                font-size: 16px;
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
