FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

RUN addgroup -S app && adduser -S app -G app
USER app

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
