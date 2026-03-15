# AI-хаб — OpenClaw Architecture Brief

**Статус:** draft  
**Владелец:** product + engineering  
**Создан:** 2026-03-09  
**Последнее обновление:** 2026-03-09

## 1) Зачем этот документ

Этот документ фиксирует стартовую архитектуру интеграции OpenClaw в Collabverse и служит рабочей площадкой для дальнейшего уточнения идеи.

Цель на текущем этапе:

- кратко описать целевую структуру OpenClaw внутри AI Hub;
- разбить внедрение на этапы;
- зафиксировать различие между free/shared агентом и premium/private агентом;
- обозначить ограничения безопасности и trust boundary до начала реализации.

Этот документ намеренно короче, чем implementation plan. Он задаёт каркас, в который дальше можно добавлять продуктовые идеи, UX-детали и технические решения.

## 2) Что мы хотим построить

Collabverse получает двухуровневый AI-слой на базе OpenClaw:

1. **Shared Agent (Free / Base Tier)**  
   Общий агент платформы для всех пользователей. Он помогает разбираться в продукте, сценариях работы, проектах, задачах и типовых действиях в рамках безопасного platform-aware режима.

2. **Private Agent (Premium Tier)**  
   Персональный или выделенный агент для платного пользователя. Он получает изолированную среду, отдельную память, расширенные инструменты, персональный контекст и потенциально внешние каналы доступа.

Продуктовая гипотеза:

- free-tier повышает активацию и ежедневную полезность платформы;
- premium-tier становится отдельной подписочной ценностью;
- AI Hub превращается из набора точечных генераций в полноценный control plane для AI-агентов.

## 3) Ключевая продуктовая модель

### Shared Agent для всех пользователей

Shared Agent работает как общий помощник внутри Collabverse:

- отвечает на вопросы о платформе, workflow и документации;
- помогает навигироваться по модулям, ролям, проектам и задачам;
- может выполнять только безопасные, permission-aware действия через прокси Collabverse;
- не получает прямой host-level доступ и не считается multi-tenant execution bus для недоверенных пользователей.

Ожидаемый UX:

- пользователь открывает AI Hub или встроенный assistant surface;
- задаёт вопрос про платформу, проект, задачу или следующий шаг;
- агент отвечает на основе знаний Collabverse и разрешённых инструментов;
- при необходимости агент переводит пользователя в нужный раздел или запускает строго ограниченное действие.

### Private Agent для платной подписки

Private Agent работает как выделенный агент пользователя или организации:

- имеет отдельную память и изолированный execution boundary;
- получает персональный контекст пользователя, его проектов, файлов и предпочтений;
- может работать глубже и дольше, чем shared-tier;
- в следующих фазах может быть вынесен в Telegram, Discord, WhatsApp, Web Chat или другие каналы.

Ожидаемый UX:

- пользователь покупает premium-подписку;
- в AI Hub появляется action `Создать private agent`;
- платформа поднимает выделенный OpenClaw gateway или эквивалентную изолированную среду;
- пользователь получает персонального агента внутри продукта и, позже, в подключаемых каналах.

## 4) Главные архитектурные ограничения

### 4.1 Collabverse остаётся source of truth

Collabverse остаётся каноническим источником истины для:

- пользователей и ролей;
- организаций и проектов;
- файлов и storage usage;
- подписок и лимитов;
- аналитики, аудита и feature flags.

OpenClaw не должен становиться вторичной базой платформенных данных.

### 4.2 Shared OpenClaw не должен получать небезопасный multi-tenant доступ

OpenClaw официально ориентирован на **personal assistant trust model**, а не на общую multi-tenant шину для недоверенных пользователей. Из этого следуют обязательные ограничения:

- shared gateway нельзя трактовать как безопасную общую host-среду для всех пользователей;
- session isolation сама по себе не заменяет authorization boundary;
- для недоверенных пользователей нужен либо жёстко ограниченный proxy/tool layer, либо отдельный gateway / host boundary.

Практический вывод для Collabverse:

- **shared-tier** допускается только как safe mode с ограниченными инструментами;
- **private-tier** проектируется как отдельный trust boundary на пользователя, организацию или выделенный сегмент.

### 4.3 Не копировать платформу в volumes по умолчанию

Базовое решение не должно строиться на полном sync пользовательских проектов и файлов в volumes OpenClaw.

Предпочтительный подход:

- OpenClaw вызывает permission-aware инструменты Collabverse;
- инструменты уже внутри Collabverse проверяют auth, organization membership, project access и plan limits;
- в OpenClaw попадает только тот контекст, который нужен в рамках запроса и разрешён пользователю.

Локальные workspace или volumes допустимы только там, где это осознанно нужно private-tier агенту и где политика изоляции явно описана.

## 5) Целевая архитектура

```text
┌──────────────────────────────────────────────────────────────┐
│                         Collabverse                          │
│  Auth • Organizations • Projects • Files • Billing • AI Hub │
│  Feature Flags • Analytics • Notifications • Admin          │
└───────────────────────┬──────────────────────────────────────┘
                        │
                        │ permission-aware API / tool proxy
                        ▼
┌──────────────────────────────────────────────────────────────┐
│                     OpenClaw Control Layer                   │
│  Shared Gateway (safe mode)                                 │
│  Agent registry / templates / provisioning orchestration    │
└───────────────┬───────────────────────────────┬──────────────┘
                │                               │
                │                               │
                ▼                               ▼
     ┌──────────────────────┐       ┌──────────────────────────┐
     │ Shared Agent         │       │ Private Agent            │
     │ Free / default       │       │ Premium / isolated       │
     │ Docs + safe tools    │       │ User/org memory + tools  │
     └──────────────────────┘       └──────────────────────────┘
```

## 6) Роли слоёв

### Collabverse как control plane

Collabverse управляет:

- identity и membership;
- подписками и entitlement;
- feature flags;
- лимитами использования;
- аудитом и аналитикой;
- списком доступных AI-агентов в AI Hub;
- прокси-инструментами, которые агенту разрешено вызывать.

### OpenClaw как execution plane

OpenClaw используется как агентный runtime:

- сессии и память агента;
- orchestration agent flows;
- multi-channel surfaces в следующих фазах;
- sandbox/tool execution в рамках выбранного trust boundary;
- маршрутизация между shared и private режимами.

## 7) Как будут работать два режима

### 7.1 Shared Mode

Shared Mode предназначен для всех пользователей и включается по умолчанию.

Что разрешено:

- вопросы про продукт и workflow;
- навигационные подсказки;
- чтение разрешённого platform context через proxy;
- безопасные действия без долгого исполнения и без прямого host access.

Что не разрешено:

- широкий доступ к пользовательским файлам и секретам;
- выполнение команд на общем host от лица разных пользователей;
- долгоживущие user-specific memory flows без отдельной изоляции.

### 7.2 Private Mode

Private Mode открывается пользователям с premium entitlement.

Что добавляется:

- отдельный gateway или эквивалентно изолированный runtime;
- персональная память и настройки;
- расширенный набор инструментов;
- подготовка к внешним каналам и background automation;
- более глубокий доступ к данным пользователя в рамках его прав.

Что обязательно:

- отдельная привязка к подписке и лимитам;
- прозрачный lifecycle: provision, status, suspend, delete;
- контроль стоимости и квот;
- логирование, health checks и cleanup.

## 8) Этапы внедрения

### Этап O0. Architecture & Contracts

**Статус:** ✅ стартовый документ создаётся сейчас

Цель:

- зафиксировать целевую модель;
- выбрать trust boundary;
- определить, что остаётся в Collabverse, а что уходит в OpenClaw;
- не допустить появления параллельной AI-системы в обход AI Hub.

Результат этапа:

- этот документ;
- связка с `ROADMAP`, AI Hub overview и platform docs;
- список открытых вопросов для следующего уточнения.

### Этап O1. Shared Platform Agent

Цель:

- дать всем пользователям единый OpenClaw-backed агент внутри Collabverse;
- использовать web-first surface без внешних каналов;
- ограничить shared-tier безопасным набором capabilities.

Scope:

- AI Hub entry point;
- shared gateway;
- knowledge context по платформе;
- permission-aware tool proxy;
- telemetry и feature flags.

### Этап O2. Workspace-Aware Agent

Цель:

- добавить агенту доступ к контексту организации, проекта, задач и файлов без слома authorization boundary.

Scope:

- org/project-aware tool calls;
- policy layer по ролям и membership;
- audit trail по инструментальным вызовам;
- ограниченный scoped memory для внутренних рабочих сценариев.

### Этап O3. Premium Private Agent

Цель:

- запустить отдельного private агента как премиальную ценность подписки.

Scope:

- provisioning выделенного runtime;
- статус и управление инстансом в AI Hub;
- отдельные лимиты и cost-control;
- персональная память, настройки и workspace policies;
- suspend/resume/delete lifecycle.

### Этап O4. External Channels & Automation

Цель:

- вынести private агента за пределы веб-интерфейса.

Scope:

- Telegram / Discord / WhatsApp / webhooks;
- onboarding и подключение каналов;
- background jobs и scheduled flows;
- уведомления, retry, monitoring и support tooling.

## 9) Что должно быть в AI Hub

OpenClaw интегрируется **внутрь существующего AI Hub**, а не как отдельный несвязанный модуль.

В AI Hub должны появиться:

- карточка shared агента;
- карточка private агента и его статусы;
- управление provisioning lifecycle;
- лимиты и usage;
- surface для истории, настроек, каналов и tool permissions;
- админские controls для agent templates, policies и rollout.

## 10) Что не делаем в первой версии

В первую версию не входят:

- полноценный public multi-tenant shared host с широкими tool permissions;
- бесконтрольный sync всех пользовательских данных в OpenClaw;
- мгновенное подключение всех внешних каналов;
- сложная orchestration-логика без базового control plane в Collabverse;
- подмена существующего AI Hub новой параллельной навигацией.

## 11) Открытые вопросы для дополнения

Этот раздел оставлен специально для твоих идей и уточнений.

- Private Agent покупается **на пользователя** или **на организацию**?
- Нужен ли один private agent на подписку или несколько агентов с разными ролями?
- Какие каналы обязательны в первой external-фазе: Telegram, Discord, WhatsApp, Web Chat?
- Должен ли Private Agent иметь доступ только к PM Core или ко всей платформе?
- Какие действия агенту разрешено выполнять самостоятельно, а какие только предлагать?
- Нужен ли marketplace для agent templates внутри AI Hub?
- Должен ли shared агент видеть workspace context или только platform knowledge?

## 12) Внешний контекст OpenClaw

Этот документ опирается на актуальный внешний контекст OpenClaw:

- OpenClaw как self-hosted gateway и multi-channel assistant runtime;
- remote agents и deployment-модель для self-hosting;
- security-модель, где gateway рассматривается как personal trust boundary, а не как default multi-tenant authorization boundary.

Полезные ссылки:

- Remote Agents: <https://docs.openclaw.ai/platform/remote-agents>
- Deployment: <https://docs.openclaw.ai/platform/deployment>
- Security: <https://docs.openclaw.ai/platform/security>

## 13) Следующий шаг

После ревью этого документа следующий шаг:

1. внести твои идеи и product assumptions;
2. выбрать точный premium contract;
3. развернуть документ в implementation plan по API, schema, UI, infra и rollout.

---

**Последнее обновление:** 2026-03-09
