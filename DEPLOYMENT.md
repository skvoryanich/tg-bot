# 🚀 Деплой в продакшен

## 📋 Варианты деплоя

### 1️⃣ PM2 (Рекомендуемый)

**Подготовка сервера:**
```bash
# Устанавливаем Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Устанавливаем PM2 глобально
sudo npm install -g pm2

# Создаем пользователя для бота
sudo useradd -m -s /bin/bash nodejs
```

**Деплой:**
```bash
# Клонируем репозиторий
git clone <your-repo-url> /opt/mood-tracker-bot
cd /opt/mood-tracker-bot

# Копируем и настраиваем .env
cp .env.example .env
nano .env  # Вписываем BOT_TOKEN

# Запускаем деплой
npm run deploy

# Настраиваем автозапуск PM2
sudo pm2 startup
sudo pm2 save
```

**Управление:**
```bash
pm2 status                    # Статус
pm2 logs mood-tracker-bot     # Логи
pm2 restart mood-tracker-bot  # Перезапуск
pm2 stop mood-tracker-bot     # Остановка
pm2 delete mood-tracker-bot   # Удаление
```

### 2️⃣ Systemd (Для опытных)

**Установка:**
```bash
# Клонируем в /opt
sudo git clone <your-repo-url> /opt/mood-tracker-bot
cd /opt/mood-tracker-bot

# Устанавливаем зависимости
sudo npm ci --only=production
sudo npm run build

# Создаем пользователя
sudo useradd -r -s /bin/false nodejs

# Настраиваем права
sudo chown -R nodejs:nodejs /opt/mood-tracker-bot
sudo mkdir -p /var/log/mood-tracker-bot
sudo chown nodejs:nodejs /var/log/mood-tracker-bot

# Копируем .env
sudo cp .env.example .env
sudo nano .env  # Вписываем BOT_TOKEN

# Устанавливаем сервис
sudo cp mood-tracker-bot.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable mood-tracker-bot
sudo systemctl start mood-tracker-bot
```

**Управление:**
```bash
sudo systemctl status mood-tracker-bot   # Статус
sudo systemctl restart mood-tracker-bot  # Перезапуск
sudo systemctl stop mood-tracker-bot     # Остановка
sudo journalctl -u mood-tracker-bot -f   # Логи
```

## 🔧 Настройка переменных

**Обязательные переменные в .env:**
```bash
BOT_TOKEN=7628676733:AAF6XjZsfXw5XN9l8KcPyrc5xeXFxEFdj6c
DATABASE_PATH=./data/bot.db
```

## 📊 Мониторинг

**PM2 мониторинг:**
```bash
pm2 monit                    # Реалтайм мониторинг
pm2 logs --lines 100         # Последние 100 строк логов
pm2 flush                    # Очистить логи
pm2 restart mood-tracker-bot # Перезапуск при проблемах
```

**Логи находятся в:**
- PM2: `~/.pm2/logs/`
- Systemd: `journalctl -u mood-tracker-bot`

## 🛡️ Безопасность

1. **Настройте файрволл:**
```bash
sudo ufw enable
sudo ufw allow ssh
# Не открывайте другие порты - боту они не нужны
```

2. **Ротация логов:**
```bash
sudo logrotate -d /etc/logrotate.conf  # Проверить настройки
```

3. **Регулярные обновления:**
```bash
sudo apt update && sudo apt upgrade -y
```

## 🔄 Автоматические перезапуски

Все варианты настроены на автоматический перезапуск:

- **PM2**: `autorestart: true`, перезапуск при крешах
- **Systemd**: `Restart=always`, `RestartSec=5`

## 🧪 База данных

База находится в `./data/bot.db` и автоматически создается при первом запуске.

**Бэкап:**
```bash
# Ежедневный бэкап через cron
echo "0 3 * * * cp /opt/mood-tracker-bot/data/bot.db /opt/backups/bot-$(date +\%Y\%m\%d).db" | crontab -
```

## ⚡ Быстрый старт (PM2)

```bash
# 1. Подготовка сервера
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2

# 2. Клонирование и настройка
git clone <repo> /opt/mood-tracker-bot
cd /opt/mood-tracker-bot
cp .env.example .env
nano .env  # BOT_TOKEN

# 3. Деплой
npm run deploy

# 4. Автозапуск
sudo pm2 startup
sudo pm2 save

# 5. Проверка
pm2 status
```

Готово! Бот работает 24/7 с автоперезапуском! 🎉