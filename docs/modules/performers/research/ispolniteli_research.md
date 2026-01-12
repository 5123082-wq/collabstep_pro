# Раздел «Исполнители» — бенчмарк бирж фриланса (Global + RU)
Дата: **2026-01-11**  
Роль: **исследователь рынка**  
Фокус: биржа исполнителей, **глубоко интегрированная** в платформу (проекты/задачи/документы/финансы/контракты).

---

## Как читать документ
- **Факт** — подтверждён ссылкой на источник.
- **Гипотеза** — вывод/идея переноса в ваш продукт (помечено явно).

---

## 1) Лидеры рынка (3–6 платформ)

### Global
1) **Upwork** — крупнейший «talent marketplace» (массовый B2B/B2C). Модель: job-posting + bidding/инвайты, fixed-price + hourly, защита платежей, платные отклики (Connects).  
   - Work Diary (скриншоты/мемо) и требования к Hourly Payment Protection — **факт**:  
     https://support.upwork.com/hc/en-us/articles/35119210462995-Work-diary  
     https://support.upwork.com/hc/en-us/articles/211068288-How-Hourly-Payment-Protection-works-for-freelancers  
   - Connects $0.15 и 10 бесплатных/мес на Basic — **факт**:  
     https://support.upwork.com/hc/en-us/articles/211062898-Understanding-and-using-Connects  
     https://support.upwork.com/hc/en-us/articles/34955398999699-What-are-Upwork-Connects  

2) **Fiverr** — marketplace пакетированных услуг (gigs), часто «быстрые deliverables». Модель: каталог услуг/пакетов, уровни исполнителей, сервисные сборы.  
   - Система уровней — **факт**: https://help.fiverr.com/hc/en-us/articles/360010560118-Understanding-Fiverr-s-freelancer-levels  
   - Fees для покупателей (5.5% + small order fee, по Payment Terms) — **факт**: https://www.fiverr.com/legal-portal/legal-terms/payment-terms-of-service  
   - Zoom calls из inbox — **факт**: https://help.fiverr.com/hc/en-us/articles/360011062838-Video-calls-Zoom-calls  

3) **Freelancer.com** — классическая биржа с bidding + milestone payments/escrow.  
   - Milestone payments + Dispute Resolution Service — **факт**:  
     https://www.freelancer.com/support/payments/milestone-payment-for-employers-2228  
     https://www.freelancer.com/support/employer/payments/dispute-resolution-service-32237  

4) **Toptal** — «кураторская сеть» (premium), упор на отбор и снижение риска найма.  
   - Trial period up to two weeks, no-risk (если не удовлетворены — не биллят) — **факт**: https://www.toptal.com/faq  

### RU
5) **Kwork** — маркетплейс услуг (кворки) + проекты, с безопасной сделкой и уровнями/верификацией.  
   - Buyer protection (официальная страница) — **факт**: https://kwork.ru/protection  
   - Уровни продавца и «верификация по документам» (официальный блог Kwork) — **факт**: https://blog.kwork.ru/kak-sdelat/10-voprosov-ob-urovne-prodavca-na-kwork-vsyo-chto-nuzhno-znat-frilanseru  
   - В описании приложения: «средства резервируются… оплата после принятия» — **факт**: https://apps.apple.com/ru/app/kwork/id1456387980  

6) **FL.ru** — классическая биржа + безопасная сделка + B2B-обвязка документами (для бизнеса).  
   - FL для бизнеса: «1 закрывающий документ на все задачи» + аккаунт-менеджер — **факт**: https://www.fl.ru/landings/4business/  
   - «Безопасная сделка» (промо-страница) — **факт**: https://www.fl.ru/promo/bezopasnaya-sdelka/  
   - «Сделка с документооборотом… выгрузите копии документов…» (пост в блоге) — **факт**: https://blog.fl.ru/whats-new-april22  

---

## 2) Функции и фичи по блокам (что реально есть у лидеров)

> Ниже — **факты** (ссылки) + **гипотезы переноса** (без ссылок).

### 2.1 Онбординг исполнителя (верификация, анкета, портфолио, тесты)
**Факты**
- Upwork: верификация личности по government ID — https://support.upwork.com/hc/en-us/articles/360000563227-How-to-verify-your-identity-with-a-government-ID  
- Fiverr: verify identity (шаги) и ID data protection —  
  https://help.fiverr.com/hc/en-us/articles/13127850435345-Verify-your-identity  
  https://help.fiverr.com/hc/en-us/articles/13127840321937-ID-verification-Data-protection-and-usage  
- Kwork: «верификация по документам» как часть логики уровней — https://blog.kwork.ru/kak-sdelat/10-voprosov-ob-urovne-prodavca-na-kwork-vsyo-chto-nuzhno-znat-frilanseru  

**Гипотезы**
- Сделать **ступени доверия**: (0) базовый → (1) KYC → (2) квалификация/портфолио → (3) “trusted” для крупных контрактов/доступа к NDA/IP-шаблонам.

---

### 2.2 Поиск/матчинг (фильтры, ранжирование, рекомендации)
**Факты (минимум подтверждённых UX-точек)**
- Upwork: Connects как ограничитель “массовых откликов” (механика спроса/предложения) —  
  https://support.upwork.com/hc/en-us/articles/34955398999699-What-are-Upwork-Connects  
- Fiverr: каталог + уровни как сигнал качества (levels) —  
  https://help.fiverr.com/hc/en-us/articles/360010560118-Understanding-Fiverr-s-freelancer-levels  

**Гипотезы**
- Главный дифференциатор встроенной биржи: **матчинг по контексту проекта** (роль в проекте, документы, история задач, дедлайны, политика доступа, бюджет).

---

### 2.3 Коммуникации (чат, брифы, созвоны)
**Факты**
- Fiverr: Zoom calls из inbox — https://help.fiverr.com/hc/en-us/articles/360011062838-Video-calls-Zoom-calls  
- Fiverr: inbox как центральный хаб коммуникаций — https://help.fiverr.com/hc/en-us/articles/37030193818257-Using-your-inbox-and-notifications  
- Fiverr: Gig requirements (структурирование входной информации) — https://help.fiverr.com/hc/en-us/articles/360015751397-Gig-requirements-general-information  

**Гипотезы**
- Чат должен быть **привязан к объектам** (задача/этап/документ), иначе «доказательств» и контроль качества будут слабее.

---

### 2.4 Сделки/контракты (эскроу, этапы, споры)
**Факты**
- Upwork: как работают fixed-price/milestones (funded milestone → submit work → review period) — https://support.upwork.com/hc/en-us/articles/211063718-How-payments-for-milestones-and-fixed-price-contracts-work  
- Upwork: «не начинайте работу до funded milestone; средства удерживаются в secure account» — https://support.upwork.com/hc/en-us/articles/44564821903763-Understanding-milestones-on-fixed-price-contracts  
- Upwork: dispute по неоплате milestone — https://support.upwork.com/hc/en-us/articles/211068528-How-to-file-a-dispute-when-your-client-doesn-t-pay-a-milestone  
- Freelancer.com: milestones + dispute resolution —  
  https://www.freelancer.com/support/payments/milestone-payment-for-employers-2228  
  https://www.freelancer.com/support/employer/payments/dispute-resolution-service-32237  
- YouDo: «Сделка без риска» (резервирование оплаты на транзитном счёте) — https://blog.youdo.com/sbr  
- Freelance.ru: комиссия 10% в безопасной сделке (FAQ) — https://freelance.ru/faq/index/view_category/id/25  

**Гипотезы**
- У вас можно сделать сильнее: **этап = набор задач + критерии приемки + артефакты** (документы/файлы/протоколы), которые автоматически прикладываются в спор.

---

### 2.5 Репутация (рейтинги, отзывы, бейджи)
**Факты**
- Fiverr: levels как сигнал качества — https://help.fiverr.com/hc/en-us/articles/360010560118-Understanding-Fiverr-s-freelancer-levels  
- Freelancer.com: Preferred Freelancer Program (как «привилегированный статус») — https://www.freelancer.com/preferred-freelancer-program  

**Гипотезы**
- Репутация в интегрированной платформе: «не только звёзды», а **факт-метрики** (SLA, доля переделок, точность оценок, скорость коммуникаций), считанные из задач/статусов/приёмок.

---

### 2.6 Безопасность (KYC, антиспам, доверие)
**Факты**
- Upwork: government ID verification — https://support.upwork.com/hc/en-us/articles/360000563227-How-to-verify-your-identity-with-a-government-ID  
- Fiverr: ID verification и data protection —  
  https://help.fiverr.com/hc/en-us/articles/13127850435345-Verify-your-identity  
  https://help.fiverr.com/hc/en-us/articles/13127840321937-ID-verification-Data-protection-and-usage  

**Гипотезы**
- Антиспам лучше связывать с экономикой (лимиты/платные отклики/скоринг), но делать **прозрачные правила**, чтобы не повторить негатив от “pay-to-apply”.

---

### 2.7 Монетизация (комиссии, подписки, платные фичи)
**Факты**
- Upwork: Connects $0.15 и бесплатные Connects на Basic —  
  https://support.upwork.com/hc/en-us/articles/211062898-Understanding-and-using-Connects  
  https://support.upwork.com/hc/en-us/articles/34955398999699-What-are-Upwork-Connects  
- Fiverr: buyer fees 5.5% + small order fee (Payment Terms) — https://www.fiverr.com/legal-portal/legal-terms/payment-terms-of-service  
- Workzilla: подписка + комиссия 10% с выполненных заданий — https://work-zilla.com/subscribewz  

**Гипотезы**
- Для встроенной биржи обычно работает микс:
  1) take-rate за escrow/гарантии,  
  2) подписка за visibility/аналитику/лимиты,  
  3) «ускорители» (priority matching, promoted профили, быстрый подбор).

---

## 3) Реальные UX-примеры (что смотреть «руками»)
1) **Контроль выполнения (hourly)**: Work Diary, memos, activity, требования к protection —  
   https://support.upwork.com/hc/en-us/articles/35119210462995-Work-diary  
   https://support.upwork.com/hc/en-us/articles/211068288-How-Hourly-Payment-Protection-works-for-freelancers  

2) **Эскроу + этапы + приемка (fixed-price)**: funded milestone → submit → review —  
   https://support.upwork.com/hc/en-us/articles/211063718-How-payments-for-milestones-and-fixed-price-contracts-work  

3) **Dispute flow**: спор по milestone (Upwork) и Dispute Resolution (Freelancer.com) —  
   https://support.upwork.com/hc/en-us/articles/211068528-How-to-file-a-dispute-when-your-client-doesn-t-pay-a-milestone  
   https://www.freelancer.com/support/employer/payments/dispute-resolution-service-32237  

4) **Бриф/requirements** (до старта работ): Fiverr gig requirements —  
   https://help.fiverr.com/hc/en-us/articles/360015751397-Gig-requirements-general-information  

5) **Созвон из чата**: Fiverr Zoom calls —  
   https://help.fiverr.com/hc/en-us/articles/360011062838-Video-calls-Zoom-calls  

6) **B2B документы (RU дифференциатор)**: FL для бизнеса (единый закрывающий документ) —  
   https://www.fl.ru/landings/4business/  

---

## 4) Боли пользователей (ссылки на обсуждения/отзывы, где возможно)

### 4.1 Боли заказчиков
1) **Шум/низкое качество откликов, AI-шаблоны** — обсуждения:  
   - Upwork: «Flooded by AI written proposal» (Reddit) — https://www.reddit.com/r/Upwork/comments/1m8tw7p/flooded_by_ai_written_proposal/  
   - Upwork: «All ChatGPT-made proposals look the same» (Reddit) — https://www.reddit.com/r/Upwork/comments/1hra8t2/rant_all_chatgptmade_proposals_look_the_same/  

2) **Слишком много откликов, но клиент не читает / не открывает** — пример треда:  
   - «100+ proposals…» (Reddit) — https://www.reddit.com/r/Upwork/comments/1l8zoyv/100_proposals_and_the_client_just_invited_someone/  

3) **Скамы и некачественные продавцы** — пример обсуждения:  
   - Fiverr scam кейс (Reddit) — https://www.reddit.com/r/Fiverr/comments/14paeqq/discussion_has_anyone_gotten_scammed_on_fiverr/  

### 4.2 Боли исполнителей
1) **Дорогой acquisition и “pay-to-apply”** (Connects) —  
   - Официально: цена Connects — https://support.upwork.com/hc/en-us/articles/211062898-Understanding-and-using-Connects  
   - Впечатления пользователей (Reddit): https://www.reddit.com/r/Upwork/comments/1nwywxk/connects_pricing_are_so_crazy/  

2) **Комиссии и ощущение «площадка вынуждает уводить клиента»** — примеры RU-обсуждений/отзывов:  
   - Kwork (Pikabu, субъективный опыт) — https://pikabu.ru/story/god_rabotyi_na_kwork_delyus_opyitom_i_predosteregayu_7585794  
   - FL.ru (Habr, субъективный опыт про safe deal/проценты) — https://habr.com/ru/articles/983762/  

> Примечание: отзывы/посты — субъективны; используйте как качественные сигналы болей, а не как цифры.

---

## 5) Какие фишки переносим к вам (интеграция с платформой)

### 5.1 Интеграция с проектами/задачами (гипотезы)
- **Milestone → Task Pack**: этап сделки автоматически создаёт набор задач, чек-лист приемки и SLA.
- **Прогресс-панель**: статус по задачам = «процент готовности этапа», с автосбором доказательств (файлы/комментарии/версии).
- **Трекинг времени (опционально)**: аналог Work Diary, но привязанный к задачам и управляемый политиками доступа.

### 5.2 Интеграция с документами/контрактами (гипотезы)
- **Контракт из шаблона**: предмет/этапы/оплата/права/IP/NDA подтягиваются из проекта и брифа.
- **Приемка как документ**: акт/acceptance формируется из выполненных задач и приложенных артефактов.
- **B2B закрывающие документы** (сильный RU-дифференциатор): «единый акт на все задачи/исполнителей в конце периода» (аналог FL для бизнеса как ориентир).  
  Факт-ориентир: https://www.fl.ru/landings/4business/

### 5.3 Интеграция с финансами/эскроу (гипотезы)
- **Эскроу-кошелек проекта**: средства резервируются под этап; частичный релиз по условиям (закрытие задач + подписанный акт).
- **Спор как workflow**: заморозка → сбор доказательств из задач/доков/логов → медиация → решение.

### 5.4 Интеграция с ролями и правами (гипотезы)
- RBAC: исполнитель видит только «свой периметр»; заказчик — финансы/акты; юрист — договор/спор; бухгалтер — закрывающие документы.
- Гостевой доступ для стейкхолдеров заказчика без выдачи админ-прав.

---

## 6) Выводы

### 6.1 5–10 болей, которые стоит закрыть
1) Шум и низкое качество откликов (в т.ч. AI-шаблоны).  
2) Дорогой acquisition исполнителей (платные отклики, низкий отклик клиентов).  
3) Недостаток прозрачности прогресса → конфликты по срокам/качеству.  
4) Недопонимание требований (плохой бриф) → переделки и срывы.  
5) Споры/возвраты: нужен понятный и быстрый процесс + доказательства.  
6) Комиссии воспринимаются как «за воздух», если нет видимой добавленной ценности.  
7) Антифрод/антиспам и защита от вывода в оффплатформу.

### 6.2 5–10 функций, которые дадут конкурентное преимущество
1) **Этапы/эскроу, привязанные к задачам и приемке** (milestone → task pack).  
2) **Structured brief** (requirements) с шаблонами по типу работы. (Ориентир: Fiverr requirements)  
3) **Коммуникации рядом с работой**: чат/файлы/созвоны на уровне задачи/этапа.  
4) **Репутация по факту исполнения** (SLA/переработки/точность оценок), а не только звезды.  
5) **Dispute как workflow** с автосбором доказательств.  
6) **Trust levels (KYC/верификация)** → доступ к крупным бюджетам и типам контрактов.  
7) **B2B документооборот** (единый закрывающий документ) как сильный RU-кейс.

### 6.3 3–5 «быстрых побед» для MVP
1) **Safe deal (эскроу) + этапы + простая приемка** (принять/на доработку → релиз денег).  
2) **Structured brief** (минимальный обязательный бриф + файлы + чек-лист приемки).  
3) **Чат на уровне сделки/этапа + кнопка созвона + лог в треде** (без «отдельных мессенджеров»).  
4) **Бейджи доверия**: verified ID + verified реквизиты (и фильтр “только verified”).  
5) **Базовая репутация “по факту”**: срок/качество/коммуникация + метрики из задач.

---

## Приложение: RU-площадки «в поле зрения» (дополнительно)
- **YouDo** — «Сделка без риска» (резервирование оплаты на транзитном счёте): https://blog.youdo.com/sbr  
- **Freelance.ru** — «Безопасная сделка» и комиссия 10% (FAQ): https://freelance.ru/faq/index/view_category/id/25  
- **Workzilla** — подписка + комиссия 10%: https://work-zilla.com/subscribewz  

