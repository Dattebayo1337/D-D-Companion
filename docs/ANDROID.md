# Android с подключением к серверу

Исходный проект находится в [`../android`](../android/README.md). Первый запуск предлагает адрес хостинга; сейчас домен не зашит в приложение. Сервер и его база остаются общими для сайта и Android-клиента.

WebView выбран для онлайн-клиента с существующим серверным Next.js: авторизация и API сохраняют один origin, не требуют копирования секретов в приложение или разрешения межсайтовых запросов. Android-часть добавляет системный выбор файлов, безопасное сохранение, обработку «Назад» и настройку подключения.

Для сервера добавлен публичный `GET /api/mobile/status`, возвращающий только идентификатор продукта и номер протокола. Он не предоставляет доступ к аккаунтам или личным данным. Остальные проверки доступа сохранены.

Инструкции подключения, сборки APK, локального тестирования и подписи: [Android README](../android/README.md).

Официальные источники:
- [WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview)
- [WebChromeClient и выбор файлов](https://developer.android.com/reference/android/webkit/WebChromeClient)
- [Безопасность native-мостов](https://developer.android.com/privacy-and-security/risks/insecure-webview-native-bridges)
- [Совместимость AGP 8.9](https://developer.android.com/build/releases/agp-8-9-0-release-notes)
- [Android SDK и условия использования](https://developer.android.com/studio)
