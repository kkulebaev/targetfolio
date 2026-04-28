# CLAUDE.md

Контекст и инварианты для Claude Code при работе с этим репозиторием.

## О проекте

Targetfolio — SPA на Vue 3 для ребалансировки инвестпортфеля. Подсказывает, какие лоты докупить на свободный кэш, чтобы приблизить текущий портфель к целевому распределению весов. Без бэкенда: все данные — в `localStorage` и query‑строке URL.

## Команды

```bash
pnpm dev              # dev-сервер с HMR (vite)
pnpm build            # pnpm typecheck + vite build
pnpm preview          # локальный preview собранного билда
pnpm test             # vitest watch
pnpm test:run         # vitest однократно
pnpm test:coverage    # покрытие
pnpm lint             # oxlint
pnpm format           # oxfmt
pnpm format:check     # oxfmt --check
pnpm typecheck        # vue-tsc --noEmit
```

После значимых изменений запускай `pnpm typecheck` и `pnpm lint`. Тесты — `pnpm test:run`.

## Стек

Vue 3 (Composition API, `<script setup>`) · TypeScript strict · Vite · Pinia + `pinia-plugin-persistedstate` · vue-router (только для query‑sync, без страниц) · shadcn-vue + Tailwind CSS v4 · lucide-vue-next · Vitest (`jsdom`) · oxlint + oxfmt · pnpm.

## Архитектурные инварианты

- **Доменный слой `src/domain/**`** — чистый TypeScript. Запрещены импорты `vue`, `pinia`, `@/components/**`, `@/stores/**` (контролируется oxlint, см. `.oxlintrc.json`). Добавляешь логику расчётов или валидации — пиши её здесь и покрывай тестами.
- **`src/stores/**`** — Pinia‑сторы. Источник истины для UI. Persisted‑поля задаются через `pinia-plugin-persistedstate`; следи, что персистится только то, что должно (см. PRD‑соглашения: `targetWeights`, пользовательский реестр инструментов, source, опционально токен T‑Invest).
- **`src/composables/use*UrlSync.ts`** — двусторонняя синхронизация состояния стора с query‑параметрами. Шаблон: при монтировании читаем из URL, watch на стейт пишет обратно через `router.replace`.
- **`src/components/ui/**`** — auto-generated shadcn-vue. Не редактируем вручную, не покрываем тестами, исключены из oxlint.
- **Алиас `@/` → `src/`** в Vite и tsconfig.

## Стиль кода

- TypeScript strict. В доменном слое — без `any`.
- Vue: только `<script setup lang="ts">`, Composition API, `storeToRefs` для деструктуризации Pinia.
- Tailwind: используем utility‑классы напрямую, без `@apply`. Произвольные значения (`[appearance:textfield]`, `[&::-webkit-...]`) — допустимы для точечных кейсов.
- Форматирование — `oxfmt`. Линт — `oxlint`. Не выключай правила локально без причины.
- Файлы тестов — рядом с исходником, `*.test.ts`.

## Коммиты

Conventional Commits 1.0.0: `<type>(scope): <description>` строчными буквами, без точки в конце, без тела.
Используемые типы: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Без `Co-Authored-By: Claude` — коммиты от лица пользователя.

## Деплой

Корневые `Dockerfile` и `Caddyfile` — рецепт Railway: multi-stage сборка через pnpm, статика отдаётся Caddy на `:{$PORT:3000}` с SPA‑fallback. `.dockerignore` исключает `node_modules`, `dist`, `.git`, `.env*`.

## Чего не делать

- Не добавлять бэкенд‑код или серверные зависимости — приложение фронт‑онли.
- Не подключать `vee-validate`, `zod`, TanStack `data-table` — оверкилл для текущего скоупа.
- Не править `src/components/ui/**` вручную.
- Не персистить `positions`, `cashAvailable` без явной задачи — это сессионное состояние.
- Не использовать `--no-verify`, `--amend` без явной просьбы.
