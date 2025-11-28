import { act } from 'react';

let useUiStore: typeof import('@/lib/state/ui-store').useUiStore;

const reloadStore = () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ({ useUiStore } = require('@/lib/state/ui-store'));
};

describe('ui-store', () => {
  beforeEach(async () => {
    const storage: Record<string, string> = {};
    (global as { window?: Window }).window = {
      localStorage: {
        getItem: (key: string) => (key in storage ? storage[key] : null),
        setItem: (key: string, value: string) => {
          storage[key] = value;
        },
        removeItem: (key: string) => {
          delete storage[key];
        },
        clear: () => {
          Object.keys(storage).forEach((key) => delete storage[key]);
        },
        key: (index: number) => Object.keys(storage)[index] ?? null,
        get length() {
          return Object.keys(storage).length;
        }
      } as Storage
    } as Window & typeof globalThis;

    jest.resetModules();
    reloadStore();
    useUiStore.setState({ expandedGroups: [], lastProjectId: null });
    await useUiStore.persist?.clearStorage?.();
  });

  afterEach(() => {
    delete (global as { window?: Window }).window;
  });

  it('переключает раскрытые группы меню', () => {
    act(() => {
      useUiStore.getState().toggleGroup('projects');
    });

    expect(useUiStore.getState().expandedGroups).toContain('projects');
  });

  it('сохраняет идентификатор последнего проекта', () => {
    act(() => {
      useUiStore.getState().setLastProjectId('proj-1');
    });

    expect(useUiStore.getState().lastProjectId).toBe('proj-1');
  });

  it('сбрасывает идентификатор проекта при передаче null', () => {
    act(() => {
      useUiStore.getState().setLastProjectId('proj-2');
      useUiStore.getState().setLastProjectId(null);
    });

    expect(useUiStore.getState().lastProjectId).toBeNull();
  });

  it('восстанавливает идентификатор проекта из persist-слоя', async () => {
    act(() => {
      useUiStore.getState().setLastProjectId('proj-restore');
    });

    jest.resetModules();
    reloadStore();

    await act(async () => {
      await useUiStore.persist?.rehydrate?.();
    });

    expect(useUiStore.getState().lastProjectId).toBe('proj-restore');
  });
});
