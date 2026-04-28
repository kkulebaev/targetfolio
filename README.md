<div align="center">

<img src="public/favicon.svg" alt="Targetfolio" width="120" />

# Targetfolio

**Помощник ребалансировки портфеля для частных инвесторов**

Подсказывает, какие бумаги докупить на свободный кэш, чтобы текущий портфель приближался к целевому распределению весов.

<br />

[**🚀 Открыть демо →**](https://targetfolio-production.up.railway.app/)

<br />

[![Live Demo](https://img.shields.io/badge/Live-Demo-success?style=for-the-badge&logo=railway&logoColor=white)](https://targetfolio-production.up.railway.app/)
[![Status](https://img.shields.io/badge/status-active-success?style=for-the-badge)](https://github.com/kkulebaev/targetfolio)
[![Open Issues](https://img.shields.io/github/issues/kkulebaev/targetfolio?style=for-the-badge&logo=github)](https://github.com/kkulebaev/targetfolio/issues)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-blue?style=for-the-badge)](https://github.com/kkulebaev/targetfolio/pulls)

[![Vue](https://img.shields.io/badge/Vue%203-35495E?style=for-the-badge&logo=vuedotjs&logoColor=4FC08D)](https://vuejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![Pinia](https://img.shields.io/badge/Pinia-FFD859?style=for-the-badge&logo=pinia&logoColor=black)](https://pinia.vuejs.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io)
[![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev)

</div>

---

## 💡 Что это

Targetfolio решает одну боль регулярного инвестора: пополнил счёт — и хочется потратить кэш так, чтобы портфель приблизился к целевой стратегии по весам, а не сломал её. В Тинькове такого инструмента нет, и считать руками или в Excel — медленно и легко ошибиться.

Приложение работает целиком в браузере, без бэкенда. Никакие данные не отправляются наружу, токены и портфели хранятся только локально.

## ✨ Возможности

- 📊 **Текущий портфель.** Загрузка через демо-фикстуру, ручной ввод или импорт из T‑Invest по read‑only токену.
- 🎯 **Целевой портфель.** Задание весов в процентах с цветовой подсказкой по сумме (зелёный = 100%, янтарный = 95–105%, красный — иначе) и набор готовых пресетов.
- 🤖 **Рекомендации.** Greedy‑алгоритм считает, какие лоты докупить на введённый кэш, чтобы сократить отклонение от таргета. Учитывает целочисленность лотов и `lotSize`.
- 💾 **Persistence.** Целевой портфель, пользовательский реестр инструментов, источник, опционально — токен T‑Invest, сохраняются в `localStorage`.
- 🔗 **Sharable URL.** Состояние таргета, ручного портфеля и суммы кэша синхронизируются в query‑строку — ссылку можно скинуть себе или сохранить.
- 🌗 **Темы.** Светлая и тёмная, переключается в шапке.

## 🛠 Стек

| Слой         | Выбор                                                    |
| ------------ | -------------------------------------------------------- |
| Framework    | Vue 3 (Composition API, `<script setup>`)                |
| Build        | Vite                                                     |
| Language     | TypeScript (strict)                                      |
| State        | Pinia + `pinia-plugin-persistedstate`                    |
| Routing      | vue-router (для query‑sync)                              |
| UI           | shadcn-vue + Tailwind CSS v4                             |
| Иконки       | lucide-vue-next                                          |
| Тесты        | Vitest (`jsdom`)                                         |
| Lint/Format  | oxlint + oxfmt                                           |
| Менеджер пакетов | pnpm                                                 |
| Деплой       | Docker + Caddy на Railway                                |

## 🚀 Быстрый старт

```bash
pnpm install
pnpm dev
```

Дальше открой `http://localhost:5173` — встретит демо‑портфель и пустой таргет.

## 📜 Скрипты

```bash
pnpm dev              # dev‑сервер с HMR
pnpm build            # типчек + продакшн‑сборка в dist/
pnpm preview          # локальный preview собранного билда
pnpm test             # vitest в watch‑режиме
pnpm test:run         # vitest однократно
pnpm test:coverage    # покрытие
pnpm lint             # oxlint
pnpm format           # oxfmt
pnpm typecheck        # vue-tsc --noEmit
```

## 🗂 Структура проекта

```
src/
  domain/         чистая логика (calculateBuys, валидация). Без Vue/Pinia
  stores/         Pinia: portfolio, target, rebalance
  components/     секции UI + shadcn-vue в components/ui/
  composables/    URL‑sync, пагинация, breakpoints
  fixtures/       демо‑портфель
  lib/            утилиты (cn, кодеки query‑строки и т.п.)
public/           favicon
scripts/          вспомогательные node‑скрипты (каталог инструментов, индексы)
```

## 🚢 Деплой

В корне есть `Dockerfile` и `Caddyfile` под рекомендованный Railway‑рецепт:

- multi‑stage сборка: `node:lts-alpine` ставит pnpm через corepack и собирает Vite‑бандл,
- финальный stage на `caddy:alpine` отдаёт `dist/` с gzip и SPA‑fallback на `index.html`,
- Caddy слушает `:{$PORT:3000}` — Railway сам подставит порт.

Локальная проверка:

```bash
docker build -t targetfolio .
docker run --rm -p 3000:3000 targetfolio
```

## 📄 Лицензия

[MIT](./LICENSE)
