#!/bin/bash

# Скрипт деплоя для продакшена
set -e

echo "🚀 Deploying Mood Tracker Bot..."

# Проверяем NODE_ENV
if [ "$NODE_ENV" != "production" ]; then
    echo "⚠️  Warning: NODE_ENV is not set to production"
fi

# Устанавливаем зависимости
echo "📦 Installing dependencies..."
npm ci --only=production

# Компилируем TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Создаем директории
echo "📁 Creating directories..."
mkdir -p data
mkdir -p logs

# Проверяем .env файл
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file not found!"
    echo "Copy .env.example to .env and fill in your BOT_TOKEN"
    exit 1
fi

# Проверяем BOT_TOKEN
if ! grep -q "BOT_TOKEN=" .env || grep -q "BOT_TOKEN=your_bot_token_here" .env; then
    echo "❌ Error: BOT_TOKEN not configured in .env file!"
    exit 1
fi

# Останавливаем старую версию (если запущена)
echo "⏹️  Stopping old version..."
pm2 stop mood-tracker-bot 2>/dev/null || true
pm2 delete mood-tracker-bot 2>/dev/null || true

# Запускаем новую версию
echo "▶️  Starting bot with PM2..."
pm2 start ecosystem.config.js

# Сохраняем PM2 конфигурацию
echo "💾 Saving PM2 configuration..."
pm2 save

# Показываем статус
echo "📊 Bot status:"
pm2 status mood-tracker-bot

echo "✅ Deploy completed!"
echo ""
echo "📋 Useful commands:"
echo "  pm2 status          - показать статус"
echo "  pm2 logs            - показать логи"
echo "  pm2 restart mood-tracker-bot - перезапустить"
echo "  pm2 stop mood-tracker-bot    - остановить"