# VPS: существующие Docker, Caddy и Remnawave

Работаем только с отдельным Compose-проектом `dnd-companion-vps`. Не используйте здесь обычный `compose.yaml`: он запускает собственный Caddy. Ниже `dnd.example.com` — пример, замените на свой домен только на сервере. Настройки Remnawave не меняются.

## 1. Первый запуск

На VPS нужны Docker Compose v2 с поддержкой `!reset`, bash и flock (util-linux). Установите проект в фиксированную папку для скриптов и таймера:

```bash
git clone https://github.com/Dattebayo1337/D-D-Companion.git /opt/dnd-companion
cd /opt/dnd-companion
umask 077
cp deploy/vps.env.example deployment.env
openssl rand -hex 32
```

Отредактируйте `deployment.env`: `DND_HOST_KEY` — сгенерированный ключ, `APP_ORIGIN=https://ваш-домен` без пути, `DND_IMAGE=ghcr.io/dattebayo1337/d-d-companion:sha-<полный SHA успешного коммита>`. Сохраните ключ отдельно. Имя тома `DND_DATA_VOLUME` должно оставаться постоянным при обновлениях. Не коммитьте конфигурацию сервера. `DND_REGISTRATION=closed` закрывает свободную регистрацию, но установочный ключ позволяет создать владельца.

Создайте каталог копий вне Docker volume, с доступом пользователя контейнера (UID 1000):

```bash
sudo install -d -m 700 -o 1000 -g 1000 /srv/dnd-companion/backups
```

Выберите **один** способ подключения к существующему Caddy:

- Caddy работает непосредственно на VPS либо использует host networking: оставьте стандартный вариант. Приложение слушает только `127.0.0.1:3100` на хосте. Фрагмент существующего Caddyfile:

  ```caddyfile
  dnd.example.com {
      reverse_proxy 127.0.0.1:3100
  }
  ```

- Caddy работает в обычной Docker-сети: узнайте имя его сети, запишите `PROXY_NETWORK=имя-сети` в `deployment.env` и выполните `touch deploy/use-proxy-network`. Скрипт подключит `compose.vps.network.yaml`, уберёт host-port полностью и добавит alias `dnd-companion`. Фрагмент Caddyfile:

  ```caddyfile
  dnd.example.com {
      reverse_proxy dnd-companion:3000
  }
  ```

Второй вариант требует, чтобы Caddy уже был подключён к указанной сети. `127.0.0.1` внутри обычного Caddy-контейнера не указывает на VPS. Проверьте и перезагрузите конфигурацию **существующего** Caddy его штатным способом; не останавливайте общий proxy и Remnawave. Отдельные порты 80/443 это приложение не занимает.

Если GHCR-пакет приватный, один раз выполните `docker login ghcr.io` на VPS с токеном только `read:packages` под тем пользователем, который будет обновлять приложение. Не записывайте токен в Git. Затем:

```bash
bash deploy/compose.sh pull app
bash deploy/compose.sh up -d --wait --wait-timeout 180 app
bash deploy/compose.sh exec -T app node --import ./scripts/register.mjs scripts/import-srd.ts
```

Импорт выполняется один раз для новой базы; обычное обновление его не повторяет. Старые аккаунты, персонажи и кампании из локальной установки автоматически не переносятся. Для переноса используйте проверенную полную копию и процедуру восстановления ниже **до** начала работы игроков.

## 2. Владелец установки и проверка с устройств

Откройте `https://ваш-домен/login`, вкладку регистрации; создайте аккаунт с установочным ключом `DND_HOST_KEY` (подробности [ACCOUNTS.md](ACCOUNTS.md)). Не передавайте ключ игрокам. Для самостоятельной регистрации игроков задайте `DND_REGISTRATION=open` и пересоздайте app командой `bash deploy/compose.sh up -d --wait app`. Вход по приглашению лобби возможен и для гостя.

Проверьте с компьютера и телефона: справочники без входа, регистрацию/вход, сохранение персонажа и кампании, приглашение в лобби и разграничение игрок/мастер. Затем выполните резервирование и пробное восстановление в отдельный том. До этих проверок автоматическое обновление VPS оставьте выключенным.

## 3. Резервирование

```bash
cd /opt/dnd-companion
bash deploy/backup.sh manual
sudo install -m 644 deploy/dnd-companion-backup.service deploy/dnd-companion-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now dnd-companion-backup.timer
sudo systemctl start dnd-companion-backup.service
sudo systemctl list-timers dnd-companion-backup.timer
sudo journalctl -u dnd-companion-backup.service -n 50 --no-pager
```

Таймер запускает копию ежедневно в 03:00 UTC с задержкой до 15 минут и догоняет пропущенный запуск. На работающей базе используется SQLite Backup API, затем проверяются целостность и внешние ключи. Копии находятся в `/srv/dnd-companion/backups` (bind mount), **вне рабочего volume**. `BACKUP_KEEP=14` хранит по 14 последних копий отдельно для `scheduled`, `predeploy` и `manual`; очистка происходит только после успешного создания новой копии. JSON рядом с копией хранит версию образа. Файлы, не соответствующие именам наших копий, не удаляются. Backup и обновление сериализованы через flock.

Проверяйте ошибки таймера через journalctl и свободное место. Настройте отправку копий на другой сервер/защищённое хранилище отдельно: локальная папка на VPS не защищает от потери его диска. Пароли, домен и установочный ключ в SQLite-копию конфигурации не входят — храните `deployment.env` отдельно и приватно. Сами копии содержат аккаунты и закрытые заметки.

## 4. Обновление и логи

```bash
cd /opt/dnd-companion
bash deploy/update.sh ghcr.io/dattebayo1337/d-d-companion:sha-<полный-SHA>
bash deploy/compose.sh ps
bash deploy/compose.sh logs --tail=100 app
```

Порядок: pull → остановка app → проверенная `predeploy`-копия старым образом → запуск нового образа с миграциями → ожидание readiness → сохранение нового `DND_IMAGE` в `deployment.env`. Если backup не получился, миграции не запускаются и прежний контейнер стартует снова. Если новая версия не прошла readiness, app остаётся остановленным: база могла уже измениться. Предыдущий образ записан в `deploy/previous-image.txt`, копия — во внешнем backup-каталоге. Скрипт не выполняет автоматический откат схемы и не затрагивает Caddy/Remnawave.

Изменения самих файлов Compose и deploy-скриптов обновляйте отдельно контролируемым `git pull --ff-only` до обновления приложения. Автодеплой заменяет только образ, не делает git pull и не меняет конфигурацию VPS. Для обычного рестарта без обновления: `bash deploy/compose.sh restart app`.

`/api/health/ready` возвращает 200 только после чтения таблиц Account и Content через Prisma; ошибка БД даёт 503 без технических деталей. Docker использует этот endpoint. Проверка не заменяет полную проверку целостности backup и не подтверждает права записи. Docker сам по себе не перезапускает контейнер только из-за статуса unhealthy.

## 5. Откат и восстановление

Не удаляйте рабочий том и не используйте `down -v`. Старый образ может быть несовместим с мигрированной базой. Безопасный путь — восстановление в **новый** том с сохранением текущего:

1. Остановите таймер и приложение; убедитесь, что обновление/backup не выполняются. Держите блокировку до конца восстановления:

   ```bash
   cd /opt/dnd-companion
   sudo systemctl stop dnd-companion-backup.timer dnd-companion-backup.service
   exec 9>deploy/operation.lock
   flock -w 600 9
   bash deploy/compose.sh stop app
   ```

2. Выберите проверенную копию `predeploy-....db` и соответствующий образ из её `.json`/`deploy/previous-image.txt`. Запишите прежние `DND_IMAGE` и `DND_DATA_VOLUME`. В `deployment.env` установите образ копии и **новое уникальное** имя `DND_DATA_VOLUME`, например `dnd-companion-restored-2026-10-26-01`. Исходный том остаётся нетронутым.

3. Через maintenance-контейнер, который **не запускает миграции**, восстановите копию Backup API в отсутствующий файл нового тома:

   ```bash
   bash deploy/compose.sh run --rm --no-deps backup scripts/server-backup.mjs inspect /backups/predeploy-REPLACE.db
   bash deploy/compose.sh run --rm --no-deps backup scripts/server-backup.mjs backup /backups/predeploy-REPLACE.db /data/companion.db
   bash deploy/compose.sh up -d --wait --wait-timeout 180 app
   ```

   Команда откажется перезаписывать существующий файл: если ошиблись именем тома, остановитесь и исправьте его. Метод `backup` здесь намеренно создаёт новую базу; обычный `restore` требует совпадения текущей схемы и потому не подходит для отката миграций. Новое приложение применит лишь миграции выбранной версии.

4. Проверьте вход, персонажей, кампании и лобби. Данные после момента выбранной копии в восстановленной базе отсутствуют. Исходный том сохраняйте до подтверждения восстановления. После успешной проверки:

   ```bash
   flock -u 9
   exec 9>&-
   sudo systemctl start dnd-companion-backup.timer
   bash deploy/backup.sh manual
   ```

Если схема точно не менялась, допустим откат только образа через `update.sh` с прежним SHA; этот путь тоже предварительно сохраняет текущую базу. Для восстановления утраченных данных всё равно нужна копия.

## 6. GitHub Actions — публикация сейчас, VPS позже

Push в `main`: проверки → Docker build → проверка контейнера/импорта/рестарта → публикация **того же** проверенного образа в GHCR (`sha-<SHA>` и `latest`). Используется встроенный GITHUB_TOKEN, production-секреты для публикации не нужны. PR не публикует образ. Деплой запускается только если **repository variable** `VPS_DEPLOY_ENABLED` равна строке `true`; сейчас её не задаём.

После ручного развёртывания и проверки с устройств создайте GitHub Environment `production` (доступ только из main; при желании обязательное ручное одобрение). В его Secrets добавьте `VPS_HOST`, `VPS_USER`, `VPS_PORT` (или 22), `VPS_SSH_KEY`, `VPS_KNOWN_HOSTS`. Последний содержит доверенную запись known_hosts, сверенную с fingerprint на VPS; workflow не отключает проверку SSH и не доверяет результату непроверенного keyscan. Пользователь SSH должен иметь доступ к Docker, `/opt/dnd-companion` и собственный вход в приватный GHCR. Доступ к Docker фактически даёт административные права на сервере — используйте отдельный ключ деплоя.

Job через SSH вызывает уже установленный `/opt/dnd-companion/deploy/update.sh` с неизменяемым SHA-тегом. Только после настройки включите `VPS_DEPLOY_ENABLED=true`. Для отключения верните `false`. Реальные домены и ключи остаются в настройках GitHub/на VPS, не в исходниках.

Основания конфигурации: [Docker networking](https://docs.docker.com/engine/network/), [GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments).

## Проверено локально 21 октября 2026

150 тестов, TypeScript и ESLint; Linux Docker build; отдельный VPS Compose с loopback-портом; внешний каталог backup; ротация и восстановление через SQLite Backup API; 503 при недоступной таблице и 200 после восстановления; сетевой override с пустыми PortBindings и доступом по alias из proxy-сети. Сценарии отказа update.sh проверены с подставным Docker CLI. Реальный SSH-деплой, systemd-таймер и конфигурация вашего Caddy будут проверены на VPS при подключении. Рабочие локальные базы не заменялись.
