FROM node:20-alpine

# Системні залежності для аудіо
RUN apk add --no-cache \
    ca-certificates \
    curl \
    tzdata

ENV TZ=Europe/Kyiv

WORKDIR /app

# Спочатку копіюємо package.json для кешування залежностей
COPY package*.json ./
RUN npm ci --only=production

# Копіюємо вихідний код
COPY src/ ./src/
COPY index.js ./

# Порти:
# 9093 — AudioSocket (Asterisk → Node.js)
# 3000 — HTTP REST API
EXPOSE 9093
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/status || exit 1

USER node

CMD ["node", "index.js"]
