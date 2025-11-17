/**
 * ESLint правило для предотвращения использования старых стилей блоков контента
 * 
 * Это правило предупреждает о использовании старых паттернов блоков контента,
 * которые должны быть заменены на компонент ContentBlock или CSS классы .content-block
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Запрещает использование старых стилей блоков контента',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      oldStyle: 
        'Использование старых стилей блоков контента обнаружено. ' +
        'Используйте компонент ContentBlock или CSS классы .content-block вместо прямых Tailwind классов. ' +
        'См. документацию: apps/web/docs/ui/content-blocks.md',
    },
  },

  create(context) {
    // Паттерны старых стилей, которые нужно обнаружить
    const oldStylePatterns = [
      // Основной блок
      /rounded-3xl\s+.*border\s+.*border-neutral-900\s+.*bg-neutral-950\/70\s+.*p-6/,
      // Вложенный блок
      /rounded-2xl\s+.*border\s+.*border-neutral-800\s+.*bg-neutral-950\/60/,
      // Маркетинговый блок
      /rounded-2xl\s+.*border\s+.*border-neutral-900\s+.*bg-neutral-900\/40/,
      /rounded-2xl\s+.*border\s+.*border-neutral-900\s+.*bg-neutral-900\/50/,
      // Маленький блок
      /rounded-xl\s+.*border\s+.*border-neutral-800\s+.*bg-neutral-950\/60\s+.*p-4/,
    ];

    function checkClassName(node) {
      if (!node.value) return;

      const className = typeof node.value === 'string' 
        ? node.value 
        : node.value.raw || '';

      // Проверяем каждый паттерн
      for (const pattern of oldStylePatterns) {
        if (pattern.test(className)) {
          context.report({
            node,
            messageId: 'oldStyle',
          });
          break;
        }
      }
    }

    return {
      // Проверяем JSX атрибуты className
      JSXAttribute(node) {
        if (node.name && node.name.name === 'className') {
          checkClassName(node);
        }
      },
      // Проверяем вызовы clsx/cn с className
      CallExpression(node) {
        if (
          node.callee &&
          (node.callee.name === 'clsx' || node.callee.name === 'cn')
        ) {
          node.arguments.forEach((arg) => {
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
              checkClassName(arg);
            }
          });
        }
      },
    };
  },
};

