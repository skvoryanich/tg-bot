#!/bin/bash

# Автоматическая установка Mood Tracker Bot на Ubuntu 20.04 LTS
set -e

echo "🚀 Starting installation for Ubuntu 20.04 LTS..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода цветного текста
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверяем что скрипт запущен с sudo правами
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Run without sudo."
   exit 1
fi

print_status "Checking Ubuntu version..."
if ! grep -q "20.04" /etc/os-release; then
    print_warning "This script is designed for Ubuntu 20.04, but continuing anyway..."
fi

# 1. Обновление системы
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Установка необходимых пакетов
print_status "Installing required packages..."
sudo apt install -y curl wget git build-essential software-properties-common

# 3. Установка Node.js 18 (для Ubuntu 20.04)
print_status "Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверяем версии
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_success "Node.js installed: $NODE_VERSION"
print_success "NPM installed: $NPM_VERSION"

# 4. Установка PM2
print_status "Installing PM2..."
sudo npm install -g pm2

# 5. Создание директории для проекта
print_status "Setting up project directory..."
sudo mkdir -p /opt/mood-tracker-bot
sudo chown -R $USER:$USER /opt/mood-tracker-bot

# 6. Клонирование репозитория
print_status "Cloning repository..."
if [ -d "/opt/mood-tracker-bot/.git" ]; then
    cd /opt/mood-tracker-bot
    git pull
else
    # Замените на ваш реальный репозиторий
    git clone https://github.com/skvoryanich/tg-bot.git /tmp/tg-bot-temp
    cp -r /tmp/tg-bot-temp/* /opt/mood-tracker-bot/
    rm -rf /tmp/tg-bot-temp
fi

cd /opt/mood-tracker-bot

# 7. Установка зависимостей
print_status "Installing dependencies..."
npm install

# 8. Компиляция TypeScript
print_status "Building TypeScript..."
npm run build

# 9. Создание необходимых директорий
print_status "Creating directories..."
mkdir -p data logs

# 10. Настройка .env файла
print_status "Setting up environment file..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_warning "Please edit .env file and add your BOT_TOKEN:"
    print_warning "nano /opt/mood-tracker-bot/.env"
    print_warning ""
    print_warning "Add this line:"
    print_warning "BOT_TOKEN=7628676733:AAF6XjZsfXw5XN9l8KcPyrc5xeXFxEFdj6c"
    
    # Автоматически добавляем токен
    sed -i 's/BOT_TOKEN=your_bot_token_here/BOT_TOKEN=7628676733:AAF6XjZsfXw5XN9l8KcPyrc5xeXFxEFdj6c/' .env
    print_success "BOT_TOKEN automatically configured!"
else
    print_success ".env file already exists"
fi

# 11. Запуск бота через PM2
print_status "Starting bot with PM2..."
pm2 stop mood-tracker-bot 2>/dev/null || true
pm2 delete mood-tracker-bot 2>/dev/null || true
pm2 start ecosystem.config.js

# 12. Настройка автозапуска
print_status "Setting up auto-startup..."
sudo pm2 startup systemd -u $USER --hp $HOME
pm2 save

# 13. Создание директории для бэкапов
print_status "Setting up backup directory..."
sudo mkdir -p /opt/backups
sudo chown $USER:$USER /opt/backups

# 14. Настройка автоматического бэкапа
print_status "Setting up automatic backup..."
(crontab -l 2>/dev/null; echo "0 3 * * * cp /opt/mood-tracker-bot/data/bot.db /opt/backups/bot-\$(date +\%Y\%m\%d).db") | crontab -

# 15. Настройка файрволла
print_status "Configuring firewall..."
sudo ufw --force enable
sudo ufw allow ssh
sudo ufw allow out 443/tcp  # HTTPS для API запросов
sudo ufw allow out 53      # DNS

print_success "🎉 Installation completed!"
print_success ""
print_success "Bot status:"
pm2 status mood-tracker-bot

print_success ""
print_success "📋 What's next:"
print_success "1. Bot is running at: @just_quest_experiment_bot"
print_success "2. Database will be created at: /opt/mood-tracker-bot/data/bot.db"
print_success "3. Logs are available with: pm2 logs mood-tracker-bot"
print_success "4. Monitor with: pm2 monit"
print_success ""
print_success "🔧 Useful commands:"
print_success "  pm2 status                    # Check status"
print_success "  pm2 logs mood-tracker-bot     # View logs"
print_success "  pm2 restart mood-tracker-bot  # Restart bot"
print_success "  pm2 monit                     # Real-time monitoring"
print_success ""
print_success "🧪 Test the bot:"
print_success "1. Find bot in Telegram: @just_quest_experiment_bot"
print_success "2. Send: /start"
print_success "3. Send: /init"
print_success ""
print_success "✅ Bot will send reminders at 23:00 Moscow time!"
print_success "Database with experimental data: /opt/mood-tracker-bot/data/bot.db"