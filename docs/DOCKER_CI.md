# Docker и GitHub Actions

## Запуск на Windows

Установите Docker Desktop с Linux containers и WSL 2: https://docs.docker.com/desktop/setup/install/windows-install/ . Запустите Docker Desktop. Все команды ниже выполняются из корня приложения — папки с `package.json`, а не из родительской папки `outputs`.

```powershell
cd "C:\Users\Dattebayo\Documents\Codex\2026-09-17\new-chat\outputs\dnd-companion"
```

Один раз создайте отдельный файл настроек. Команда откажется перезаписывать существующий файл:

```powershell
if (Test-Path deployment.env) { throw 'deployment.env уже существует — используйте его' }
$deploymentKey = node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
"DND_HOST_KEY=$deploymentKey`nLOCAL_PORT=3001`nDND_REGISTRATION=open" | Set-Content deployment.env -Encoding ascii
```

Сохраните этот ключ в менеджере паролей. Не меняйте его при пересоздании контейнера и не отправляйте в GitHub. Он нужен для настройки владельца; справочники открыты без входа.

```powershell
docker compose --env-file deployment.env -f compose.local.yaml up -d --build --wait
docker compose --env-file deployment.env -f compose.local.yaml exec app node --import ./scripts/register.mjs scripts/import-srd.ts
```

Откройте http://127.0.0.1:3001 . Порт 3000 оставлен существующему серверу. Первая сборка требует интернета; база Docker первоначально пустая. Импорт загружает подготовленные наборы всех категорий из проекта. Он не переносит аккаунты и персонажей, не обращается к dnd.su и не должен автоматически повторяться при каждом старте.

Управление:

```powershell
docker compose --env-file deployment.env -f compose.local.yaml logs --tail=100 app
docker compose --env-file deployment.env -f compose.local.yaml stop
docker compose --env-file deployment.env -f compose.local.yaml start
```

Обновление после изменения исходников: снова `up -d --build --wait`. База хранится в `companion-local-data`. Не используйте `down -v`: это удаляет данные. Нельзя масштабировать эту SQLite-конфигурацию несколькими репликами.

## Перенос существующей базы

Сначала сделайте согласованную резервную копию по [BACKUP.md](BACKUP.md). Не копируйте открытую SQLite-базу обычным файловым копированием. Первый запуск Docker нужен для создания тома; затем остановите контейнер. Следующая команда заменяет базу контейнера, поэтому сначала сохраните её копию, если уже пользовались им:

```powershell
docker compose --env-file deployment.env -f compose.local.yaml stop app
docker compose --env-file deployment.env -f compose.local.yaml cp app:/data/companion.db ./backups/docker-before-transfer.db
docker compose --env-file deployment.env -f compose.local.yaml cp ./backups/transfer.db app:/data/companion.db
docker compose --env-file deployment.env -f compose.local.yaml run --rm --no-deps --user root --entrypoint chown app node:node /data/companion.db
docker compose --env-file deployment.env -f compose.local.yaml start app
```

Создайте `backups` заранее; `transfer.db` здесь означает проверенную копию исходной базы. Не импортируйте справочники поверх перенесённой базы без необходимости. При старте будут применены недостающие миграции. Не запускайте одновременно операции копирования и приложение. Сохраните прежний установочный ключ для совместимости прежних сессий.

## Сервер с HTTPS

`compose.yaml` сохраняет вариант VPS + Caddy. Добавьте `SITE_DOMAIN=ваш-домен` в серверный `deployment.env`, настройте DNS и порты 80/443. Запуск:

```sh
docker compose --env-file deployment.env up -d --build --wait
docker compose --env-file deployment.env exec app node --import ./scripts/register.mjs scripts/import-srd.ts
```

Подробности: [LOBBY.md](LOBBY.md). Локальный Compose и серверный используют разные тома. Конфигурация предназначена для SQLite; PostgreSQL требует отдельной генерации Prisma и настройки сервиса БД.

## GitHub

Создайте пустой репозиторий в GitHub. Корнем репозитория должна стать сама папка `dnd-companion`, чтобы `.github/workflows/ci.yml` находился непосредственно в корне репозитория. В этой папке:

```sh
git init -b main
git add .
git diff --cached --stat
git status --short
git commit -m "Configure Docker and CI"
git remote add origin https://github.com/YOUR_ACCOUNT/YOUR_REPOSITORY.git
git push -u origin main
```

Перед commit проверьте список файлов: `.env`, `deployment.env`, `.local`, базы, резервные копии и ключи не должны попасть в него. `.gitignore` исключает их, но не исключает уже ранее отслеживаемые файлы. Команды init/remote предназначены для нового репозитория; при существующем используйте текущий remote.

Во вкладке Actions workflow запускается для pull request и push в main/master:

1. Node 24, фиксированный pnpm, установка по lockfile, Prisma generate.
2. TypeScript, ESLint и тесты с отдельной временной базой.
3. Docker build (включает production-сборку Next.js), запуск без root на чистом томе, проверка healthcheck, импорт всех подготовленных наборов, перезапуск и проверка сохранения справочников в БД.

Production-секреты для CI не нужны. Временный тестовый ключ не используется вне CI. При необходимости включите обязательные проверки `checks` и `container` в правилах основной ветки GitHub.

## Публикация образа

После push в `main` публикация запускается автоматически. Также доступно Actions → Checks and container → Run workflow → main → `publish`. Только после успешных проверок тот же протестированный образ публикуется в GHCR с тегами `latest` и `sha-<полный commit>`. Используется встроенный `GITHUB_TOKEN` с `packages: write` только в job публикации; персональный токен для CI не нужен. Политика организации может запрещать создание пакетов — в таком случае разрешите его в настройках GitHub. Видимость пакета задаётся в GitHub Packages.

Подготовлен выключенный по умолчанию SSH-деплой: см. [VPS.md](VPS.md). Для сервера с существующим Caddy используйте именно compose.vps.yaml из этой инструкции. Для запуска готового образа на сервере замените `build: .` у app на `image: ghcr.io/owner/repository:sha-...`, авторизуйтесь в GHCR при приватном пакете, выполните `docker compose --env-file deployment.env pull app`, затем `up -d --wait`. Сохраните том и ключ. Перед обновлением сделайте резервную копию; откат образа сам по себе не откатывает миграции базы.

Официальная документация: [Docker GitHub Actions](https://docs.docker.com/build/ci/github-actions/), [Node setup](https://github.com/actions/setup-node), [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

## Проверка этой конфигурации

21 октября 2026: локально прошли TypeScript, ESLint, все 148 тестов, синтаксис новых Node-скриптов и разбор YAML обоих Compose-файлов и workflow.

21 октября 2026: Docker Desktop установлен; Linux-образ успешно собран, контейнер работает без root и проходит healthcheck. Импортировано 2922 записи, после перезапуска в постоянном томе сохранились все 2922 записи; главная страница возвращает HTTP 200. GitHub Actions проверяется отдельно после загрузки workflow в репозиторий.
