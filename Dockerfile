FROM node:22-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

EXPOSE 3000
CMD ["sh", "-c", "npm run db:setup && npm start"]
