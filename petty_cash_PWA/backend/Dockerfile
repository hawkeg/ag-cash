FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Writable dirs for winston logs and the notification JSON stores
RUN mkdir -p logs data && chown -R node:node logs data
EXPOSE 4002
USER node
CMD ["node", "dist/index.js"]
