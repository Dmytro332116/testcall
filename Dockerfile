# ============================================================================
# Dockerfile для AI Voice Agent
# Використання: docker build -t ai-voice-agent . && docker run -d ...
# ============================================================================

FROM node:18-alpine

# Встановлення залежностей для аудіо
RUN apk add --no-cache \
    ffmpeg \
    sox \
    opus \
    libopus

WORKDIR /app

# Копіювання package файлів
COPY package*.json ./

# Встановлення залежностей
RUN npm ci --only=production

# Копіювання коду
COPY ai-voice-agent-complete.js .
COPY ai-voice-agent-v2-with-stt.js .

# Встановлення змінних середовища
ENV NODE_ENV=production
ENV LOG_LEVEL=debug

# Точка входу
ENTRYPOINT ["node", "ai-voice-agent-complete.js"]

# Метадані
LABEL maintainer="Your Name"
LABEL description="AI Voice Agent for SIP calls with OpenAI and ElevenLabs"
LABEL version="1.0"
