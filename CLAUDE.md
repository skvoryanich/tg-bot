# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Telegram bot for tracking mood correlations with weather and magnetic storms. Users rate their daily mood (1-10), and the bot automatically collects and stores weather data (temperature/pressure changes) and magnetic storm indices for analysis.

## Development Commands

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run start` - Run compiled JavaScript
- `npm install` - Install dependencies

## Environment Setup

Required environment variables in `.env`:
- `BOT_TOKEN` - Telegram bot token from @BotFather  
- `DATABASE_PATH` - SQLite database file path (default: ./data/bot.db)

Weather data is fetched from Open-Meteo API (free, no API key required).

## Architecture

### Core Components

- **Bot (`src/bot.ts`)** - Main Telegraf bot with commands and scheduling
- **Database (`src/database/database.ts`)** - SQLite database management
- **WeatherService (`src/services/weatherService.ts`)** - Open-Meteo API integration
- **MagneticService (`src/services/magneticService.ts`)** - NOAA space weather data

### Key Features

1. **User Commands**:
   - `/start` - Register user
   - `/init` - Activate daily reminders
   - `/help` - Show all available commands
   - Numbers 1-10 - Submit mood rating (only after daily reminder)

2. **Automated Data Collection**:
   - Temperature changes (1, 2, 3 days back)
   - Atmospheric pressure changes (1, 2, 3 days back)  
   - Magnetic storm K-index from NOAA

3. **Scheduling**: Daily reminders at 23:00 MSK using node-cron

### Database Schema

- `users` - Telegram user data and active status
- `daily_records` - Mood ratings with corresponding weather/magnetic data
- `weather_data` - Raw weather data cache

## Experiment Design

- **Hidden purpose**: Users think this is a simple mood/wellness tracker
- **Blind data collection**: No mentions of weather, magnetic storms, or correlations
- **Strict control**: Ratings only accepted after 23:00 reminders
- **Location**: All data collected for Saint Petersburg, Russia (59.9311, 30.3609)
- **Database file**: `./data/bot.db` - SQLite database with all experimental data