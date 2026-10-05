# Playwright's official image ships Chromium + all OS-level dependencies
# already installed, so there's no separate browser-download step at
# runtime - required on Railway/Render/Fly, which don't support Vercel's
# serverless model that Playwright's real Chromium process needs to avoid.
FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app
COPY package.json .
RUN npm install --omit=dev --ignore-scripts
COPY server.mjs .

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.mjs"]
