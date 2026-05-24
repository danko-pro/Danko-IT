# PUBLIC-LEADS-RUNTIME-CHECKPOINT-1A — stable public leads runtime

Дата фиксации: 2026-05-24

Основная ветка: `main`

Последний важный merge: `BOT-LEADS-1A`

Merge commit: `abc957a Merge pull request #36 from danko-pro/bot-leads-1a`

## 1. Состояние

Публичный прием заявок с сайта работает в production-like режиме:

public landing form
-> обязательное согласие на обработку персональных данных
-> honeypot field `website`
-> frontend `POST /api/public/leads`
-> backend validation
-> public lead rate limit
-> Telegram notification через `@DankoBuildTechBot`
-> Telegram-группа заявок
-> client receives success status

## 2. Что проверено вручную

Проверено вручную:

- тестовая заявка отправлена с public landing;
- сайт показал success status;
- Telegram-группа получила сообщение: `Новая заявка Danko BuildTech`;
- поля заявки дошли корректно:
  - имя;
  - контакт;
  - способ связи;
  - тип объекта;
  - площадь;
  - формат;
  - комментарий;
  - источник `public landing`;
  - согласие на обработку данных получено.

## 3. Backend endpoint

Текущий endpoint:

`POST /api/public/leads`

Зафиксировано:

- endpoint публичный через точечный bypass `/api/public/leads`;
- успешный ответ: `{ "ok": true }`;
- endpoint не требует admin session;
- private admin routes без cookie по-прежнему должны отдавать `401`;
- endpoint не пишет в БД;
- endpoint не вызывает AI;
- endpoint не создает admin entity;
- endpoint не отправляет ответ клиенту в Telegram.

## 4. Security / hardening

Зафиксированные меры:

- HTTPS production transport используется через Render;
- frontend не содержит secret/token;
- `TELEGRAM_PUBLIC_BOT_TOKEN` хранится только в backend env;
- `TELEGRAM_LEADS_CHAT_ID` хранится в backend env;
- `personalDataConsent` обязателен и проверяется backend;
- honeypot `website` отклоняет заполненные payload;
- public rate limit: 5 заявок за 10 минут на IP;
- `429` возвращает `Retry-After`;
- Telegram delivery errors не раскрываются клиенту и не ломают клиентский success.

## 5. Render env

Backend Render service:

- `TELEGRAM_PUBLIC_BOT_TOKEN` установлен;
- `TELEGRAM_LEADS_CHAT_ID=-1003737352125` установлен.

Frontend Render service:

- `VITE_API_BASE_URL` должен указывать на production backend URL, если frontend/backend разнесены.

Токены в репозиторий и документы не вставлять.

## 6. Закрытые этапы

Закрытые этапы:

- `BOT_RUNTIME_STABLE_CHECKPOINT`
- `PUBLIC_LEADS_INTAKE_AUDIT`
- `PUBLIC-LEADS-API-1A`
- `PUBLIC-LEADS-FRONTEND-1A`
- `PUBLIC-LEADS-CONSENT-1A`
- `PUBLIC-LEADS-HARDEN-1A`
- `BOT-LEADS-1A`

## 7. Текущие ограничения

Пока не сделано:

- заявки не сохраняются в БД;
- заявки не отображаются в admin UI;
- нет approve/reject кнопок;
- нет AI summary;
- нет автоматического ответа клиенту;
- нет privacy page `/privacy`;
- нет отдельной страницы client chat/deep-link flow.

## 8. Следующие возможные этапы

Рекомендуемый порядок:

1. `PRIVACY-PAGE-1A` — страница `/privacy` и ссылка из consent checkbox.
2. `ADMIN-LEADS-1A` — сохранять public leads в БД и показывать в admin UI.
3. `BOT-LEADS-ACTIONS-1A` — кнопки в Telegram: Принять / Отложить / Отклонить.
4. `LEAD-AI-1A` — AI summary и предварительные вопросы.
5. `CLIENT-TELEGRAM-1A` — сценарий, когда клиент сам пишет `@DankoBuildTechBot`.

## 9. Guardrails

В этом checkpoint не менять:

- backend code;
- frontend code;
- bot runtime;
- database/migrations;
- auth/session/cookie;
- package files;
- Dockerfile;
- Render config.

Ожидаемый diff для этой задачи:

- `docs/PUBLIC_LEADS_RUNTIME_STABLE_CHECKPOINT.md`
