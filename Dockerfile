# ==========================================
# ЭТАП 1: Сборка React-фронтенда
# ==========================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app/frontend

# Копируем только package.json и lock-файл (если есть)
COPY frontend/package*.json ./

# Устанавливаем зависимости с нуля внутри контейнера (это создаст рабочий файл .bin/vite)
RUN npm install

# Копируем исходники
COPY frontend/ ./

# Запускаем сборку
RUN npm run build

# ==========================================
# ЭТАП 2: Сборка Python-бэкенда
# ==========================================
FROM python:3.13-alpine

WORKDIR /app

# Устанавливаем зависимости бэкенда
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код бэкенда
COPY backend/ .

# Копируем СОБРАННЫЙ фронтенд (папку dist) из первого этапа
COPY --from=frontend-builder /app/frontend/dist /app/frontend

# Создаем папку для базы данных
RUN mkdir -p /data

EXPOSE 8000

# Запускаем FastAPI
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]