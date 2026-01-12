#!/bin/bash

# Скрипт для быстрой выгрузки изменений на GitHub и создания PR
# 
# Использование:
#   pr "описание изменений"          # Быстрая команда (после source ~/.zshrc)
#   /PR "описание изменений"         # Алиас (после source ~/.zshrc)
#   git pr "описание изменений"      # Git alias
#   pnpm pr "описание изменений"     # NPM команда
#   bash scripts/utils/create-pr.sh "описание изменений"  # Прямой вызов
#
# Примеры:
#   pr "Добавлена функция авторизации"
#   pr "Исправлена ошибка в компоненте Dashboard"
#   pr  # Без аргумента - скрипт запросит описание

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

success() {
  echo -e "${GREEN}✅ $1${NC}"
}

warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
  echo -e "${RED}❌ $1${NC}"
}

# Переходим в корень проекта
cd "$(dirname "$0")/../.."

# Проверяем, что мы в git репозитории
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  error "Это не git репозиторий!"
  exit 1
fi

# Проверяем наличие GitHub CLI
if ! command -v gh &> /dev/null; then
  error "GitHub CLI (gh) не установлен!"
  echo ""
  info "Установите GitHub CLI:"
  echo "  macOS: brew install gh"
  echo "  Linux: sudo apt install gh"
  echo "  или: https://cli.github.com/"
  exit 1
fi

# Проверяем авторизацию в GitHub CLI
if ! gh auth status &> /dev/null; then
  error "Не авторизован в GitHub CLI!"
  info "Выполните: gh auth login"
  exit 1
fi

# Получаем описание изменений из аргументов или запрашиваем у пользователя
if [ -z "$1" ]; then
  echo ""
  info "Введите описание изменений для коммита и PR:"
  read -r PR_DESCRIPTION
else
  PR_DESCRIPTION="$1"
fi

if [ -z "$PR_DESCRIPTION" ]; then
  error "Описание изменений не может быть пустым!"
  exit 1
fi

# Проверяем статус репозитория
info "Проверяю статус репозитория..."
GIT_STATUS=$(git status --porcelain)

if [ -z "$GIT_STATUS" ]; then
  warning "Нет изменений для коммита!"
  exit 0
fi

# Показываем изменения
echo ""
info "Изменения для коммита:"
git status --short
echo ""

# Получаем текущую ветку
CURRENT_BRANCH=$(git branch --show-current)
BASE_BRANCH="main"

# Проверяем, существует ли ветка main или master
if ! git show-ref --verify --quiet refs/heads/main; then
  if git show-ref --verify --quiet refs/heads/master; then
    BASE_BRANCH="master"
  fi
fi

# Если мы уже на базовой ветке, создаем новую ветку
if [ "$CURRENT_BRANCH" = "$BASE_BRANCH" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  # Создаем имя ветки из описания
  BRANCH_NAME=$(echo "$PR_DESCRIPTION" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
  BRANCH_NAME="feature/${BRANCH_NAME}-$(date +%s)"
  
  info "Создаю новую ветку: $BRANCH_NAME"
  git checkout -b "$BRANCH_NAME"
  CURRENT_BRANCH="$BRANCH_NAME"
else
  info "Используется существующая ветка: $CURRENT_BRANCH"
fi

# Добавляем все изменения
info "Добавляю изменения..."
git add -A

# Создаем коммит
info "Создаю коммит..."
git commit -m "$PR_DESCRIPTION"

# Пушим изменения
info "Отправляю изменения на GitHub..."
git push -u origin "$CURRENT_BRANCH"

# Создаем PR
echo ""
info "Создаю Pull Request..."

# Получаем remote URL для определения owner/repo
REMOTE_URL=$(git config --get remote.origin.url)
if [[ $REMOTE_URL =~ github\.com[:/]([^/]+)/([^/]+)\.git ]]; then
  REPO_OWNER="${BASH_REMATCH[1]}"
  REPO_NAME="${BASH_REMATCH[2]%.git}"
else
  # Пробуем получить через gh
  REPO_INFO=$(gh repo view --json owner,name 2>/dev/null || echo "")
  if [ -n "$REPO_INFO" ]; then
    REPO_OWNER=$(echo "$REPO_INFO" | grep -o '"owner":"[^"]*"' | cut -d'"' -f4)
    REPO_NAME=$(echo "$REPO_INFO" | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
  else
    error "Не удалось определить owner/repo"
    exit 1
  fi
fi

# Создаем PR через GitHub CLI
PR_URL=$(gh pr create \
  --base "$BASE_BRANCH" \
  --head "$CURRENT_BRANCH" \
  --title "$PR_DESCRIPTION" \
  --body "## Описание изменений

$PR_DESCRIPTION

## Чеклист
- [ ] Код протестирован локально
- [ ] Проверки линтера пройдены (\`pnpm -w lint\`)
- [ ] Проверка типов пройдена (\`pnpm -w typecheck\`)
- [ ] Тесты пройдены (\`pnpm -w test\`)

---

Автоматически создано через скрипт \`create-pr.sh\`" \
  --web=false 2>&1)

if [ $? -eq 0 ]; then
  success "Pull Request создан успешно!"
  echo ""
  echo "$PR_URL"
  echo ""
  info "Открыть PR в браузере? (y/n)"
  read -r OPEN_BROWSER
  if [ "$OPEN_BROWSER" = "y" ] || [ "$OPEN_BROWSER" = "Y" ]; then
    gh pr view --web
  fi
else
  error "Не удалось создать Pull Request"
  echo "$PR_URL"
  exit 1
fi

success "Готово! 🎉"
