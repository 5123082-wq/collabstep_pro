'use client';

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import clsx from 'clsx';
import type {
  WidgetConfig,
  WidgetData,
  WidgetDefinition,
  WidgetRegistry,
  WidgetSize,
  WidgetState
} from '@/lib/dashboard/types';
import { WidgetShell } from '@/components/dashboard/WidgetShell';
import { widgetRegistry } from '@/components/dashboard/widget-registry';

type WidgetGridProps = {
  widgets: WidgetConfig[];
  data: Record<string, WidgetData>;
  registry?: WidgetRegistry;
  onLayoutChange: (widgets: WidgetConfig[]) => void;
  onWidgetStateChange?: (id: string, state: WidgetState) => void;
  onRetry?: (id: string) => void;
  onRefresh?: (id: string) => void;
};

type DragOrigin = {
  id: string;
  layout: WidgetConfig['layout'];
};

const MOBILE_COLUMNS = 4;
const TABLET_COLUMNS = 8;
const DESKTOP_COLUMNS = 12;
const MAX_HEIGHT_UNITS = 8;
const SIZE_PRESETS: Record<WidgetSize, { w: number; h: number }> = {
  small: { w: 4, h: 3 },
  medium: { w: 6, h: 3 },
  large: { w: DESKTOP_COLUMNS, h: 4 }
};

function clampLayoutToColumns(layout: WidgetConfig['layout'], columns: number): WidgetConfig['layout'] {
  const maxColumns = Math.max(1, columns);
  const w = Math.max(1, Math.min(layout.w, maxColumns));
  const h = Math.max(1, Math.min(layout.h, MAX_HEIGHT_UNITS));
  const x = Math.max(0, Math.min(layout.x, maxColumns - w));
  const y = Math.max(0, layout.y);
  return { x, y, w, h };
}

function resolveCollisions(widgets: WidgetConfig[], columns: number): WidgetConfig[] {
  const ordered = [...widgets].sort((a, b) => {
    if (a.layout.y === b.layout.y) {
      return a.layout.x - b.layout.x;
    }
    return a.layout.y - b.layout.y;
  });

  const occupied: boolean[][] = [];
  const placements = new Map<string, WidgetConfig['layout']>();

  const fits = (x: number, y: number, w: number, h: number): boolean => {
    if (x < 0 || x + w > columns || y < 0) {
      return false;
    }
    for (let row = y; row < y + h; row += 1) {
      if (!occupied[row]) {
        continue;
      }
      for (let col = x; col < x + w; col += 1) {
        if (occupied[row]?.[col]) {
          return false;
        }
      }
    }
    return true;
  };

  const mark = (x: number, y: number, w: number, h: number) => {
    for (let row = y; row < y + h; row += 1) {
      if (!occupied[row]) {
        occupied[row] = [];
      }
      const rowArr = occupied[row]!;
      for (let col = x; col < x + w; col += 1) {
        rowArr[col] = true;
      }
    }
  };

  for (const widget of ordered) {
    const layout = clampLayoutToColumns(widget.layout, columns);
    let placed = false;
    let targetY = 0;
    while (!placed) {
      for (let x = 0; x <= columns - layout.w; x += 1) {
        if (fits(x, targetY, layout.w, layout.h)) {
          placements.set(widget.id, { ...layout, x, y: targetY });
          mark(x, targetY, layout.w, layout.h);
          placed = true;
          break;
        }
      }
      if (!placed) {
        targetY += 1;
      }
    }
  }

  return widgets.map((widget) => ({
    ...widget,
    layout: placements.get(widget.id) ?? clampLayoutToColumns(widget.layout, columns)
  }));
}

function useResponsiveColumns() {
  const [columns, setColumns] = useState(DESKTOP_COLUMNS);

  useEffect(() => {
    const mediaQueries = [
      { query: '(max-width: 767px)', columns: MOBILE_COLUMNS },
      { query: '(min-width: 768px) and (max-width: 1279px)', columns: TABLET_COLUMNS },
      { query: '(min-width: 1280px)', columns: DESKTOP_COLUMNS }
    ];

    const updateColumns = () => {
      for (const item of mediaQueries) {
        const matcher = window.matchMedia(item.query);
        if (matcher.matches) {
          setColumns(item.columns);
          return;
        }
      }
      setColumns(DESKTOP_COLUMNS);
    };

    updateColumns();
    const listeners = mediaQueries.map((item) => {
      const matcher = window.matchMedia(item.query);
      const listener = () => updateColumns();
      matcher.addEventListener('change', listener);
      return { matcher, listener };
    });

    return () => {
      listeners.forEach(({ matcher, listener }) => matcher.removeEventListener('change', listener));
    };
  }, []);

  return columns;
}

export function WidgetGrid({
  widgets,
  data,
  registry = widgetRegistry,
  onLayoutChange,
  onWidgetStateChange,
  onRetry,
  onRefresh
}: WidgetGridProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    })
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOrigin, setDragOrigin] = useState<DragOrigin | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const columns = useResponsiveColumns();
  const rowHeight = columns <= MOBILE_COLUMNS ? 120 : columns <= TABLET_COLUMNS ? 108 : 96;

  useEffect(() => {
    if (!containerRef.current || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerWidth(entry.contentRect.width);
    });

    observer.observe(containerRef.current);
    setContainerWidth(containerRef.current.clientWidth);

    return () => observer.disconnect();
  }, []);

  const columnWidth = useMemo(() => {
    if (columns <= 0 || containerWidth <= 0) {
      return 120;
    }
    return Math.max(containerWidth / columns, 80);
  }, [columns, containerWidth]);

  const resolvedWidgets = useMemo(
    () =>
      resolveCollisions(
        widgets.map((widget) => ({
          ...widget,
          layout: clampLayoutToColumns(widget.layout, columns)
        })),
        columns
      ),
    [widgets, columns]
  );

  useEffect(() => {
    const adjusted = resolveCollisions(
      widgets.map((widget) => ({
        ...widget,
        layout: clampLayoutToColumns(widget.layout, columns)
      })),
      columns
    );
    const original = new Map(widgets.map((widget) => [widget.id, widget.layout]));
    const changed = adjusted.some((widget) => {
      const base = original.get(widget.id);
      if (!base) return true;
      return (
        base.x !== widget.layout.x ||
        base.y !== widget.layout.y ||
        base.w !== widget.layout.w ||
        base.h !== widget.layout.h
      );
    });
    if (changed) {
      onLayoutChange(adjusted);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);

  const applyLayoutChange = (id: string, layout: WidgetConfig['layout'], nextSize?: WidgetSize) => {
    const next = resolvedWidgets.map((widget) =>
      widget.id === id
        ? {
            ...widget,
            layout: clampLayoutToColumns(layout, columns),
            ...(nextSize ? { size: nextSize } : {})
          }
        : widget
    );
    onLayoutChange(resolveCollisions(next, columns));
  };

  const applySizePreset = (widget: WidgetConfig, size: WidgetSize) => {
    const preset = SIZE_PRESETS[size];
    const baseLayout = clampLayoutToColumns({ ...widget.layout, ...preset }, columns);
    applyLayoutChange(widget.id, baseLayout, size);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const current = resolvedWidgets.find((widget) => widget.id === event.active.id);
    if (current) {
      setActiveId(current.id);
      setDragOrigin({ id: current.id, layout: current.layout });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!dragOrigin) {
      setActiveId(null);
      return;
    }
    const { delta } = event;
    const deltaColumns = Math.round(delta.x / columnWidth);
    const deltaRows = Math.round(delta.y / rowHeight);

    if (deltaColumns === 0 && deltaRows === 0) {
      setActiveId(null);
      setDragOrigin(null);
      return;
    }

    const nextLayout = clampLayoutToColumns(
      {
        ...dragOrigin.layout,
        x: dragOrigin.layout.x + deltaColumns,
        y: dragOrigin.layout.y + deltaRows
      },
      columns
    );

    applyLayoutChange(dragOrigin.id, nextLayout);
    setActiveId(null);
    setDragOrigin(null);
  };

  const renderWidget = (widget: WidgetConfig) => {
    const definition = (registry ?? widgetRegistry)[widget.type];
    if (!definition) {
      return null;
    }

    const Renderer = definition.render;
    const layout = clampLayoutToColumns(widget.layout, columns);
    const widgetData = data[widget.id] ?? { state: 'loading' as WidgetState };
    const stateChangeProps = onWidgetStateChange ? { onStateChange: onWidgetStateChange } : {};
    const retryProps = onRetry ? { onRetry } : {};
    const refreshProps = onRefresh ? { onRefresh } : {};

    return (
      <GridItem
        key={widget.id}
        widget={widget}
        layout={layout}
        definition={definition}
        Renderer={Renderer}
        data={widgetData}
        {...stateChangeProps}
        {...retryProps}
        {...refreshProps}
        onApplySize={(size) => applySizePreset(widget, size)}
        isActive={activeId === widget.id}
      />
    );
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div
        ref={containerRef}
        className="dashboard-grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gridAutoRows: `minmax(${rowHeight}px, auto)`
        }}
      >
        {resolvedWidgets.map((widget) => renderWidget(widget))}
      </div>
    </DndContext>
  );
}

type GridItemProps = {
  widget: WidgetConfig;
  layout: WidgetConfig['layout'];
  definition: WidgetDefinition;
  Renderer: WidgetDefinition['render'];
  data: WidgetData;
  isActive: boolean;
  onStateChange?: (id: string, state: WidgetState) => void;
  onRetry?: (id: string) => void;
  onRefresh?: (id: string) => void;
  onApplySize: (size: WidgetSize) => void;
};

function GridItem({
  widget,
  layout,
  definition,
  Renderer,
  data,
  isActive,
  onStateChange,
  onRetry,
  onRefresh,
  onApplySize
}: GridItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging
  } = useDraggableWithHandle(widget.id);
  const currentSize: WidgetSize = widget.size ?? 'medium';

  const style: CSSProperties = {
    gridColumnStart: layout.x + 1,
    gridColumnEnd: `span ${layout.w}`,
    gridRowStart: layout.y + 1,
    gridRowEnd: `span ${layout.h}`,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 10 : undefined
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'dashboard-grid__item',
        isDragging && 'ring-2 ring-indigo-500/70 ring-offset-2 ring-offset-neutral-950',
        isActive && 'ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-neutral-950'
      )}
      data-widget-id={widget.id}
    >
      <WidgetShell
        config={widget}
        data={data}
        title={definition.title ?? widget.title}
        {...(definition.description ? { description: definition.description } : {})}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-md border border-neutral-800 bg-neutral-950/60 px-2 py-1 text-[11px] text-neutral-300 transition hover:border-indigo-500/60 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
              {...listeners}
              {...attributes}
            >
              Перетащить
            </button>
            <div className="flex items-center gap-1">
              {(['small', 'medium', 'large'] as WidgetSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => onApplySize(size)}
                  className={clsx(
                    'rounded-md border px-2 py-1 text-[11px] uppercase leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400',
                    currentSize === size
                      ? 'border-indigo-500/70 bg-indigo-500/10 text-white'
                      : 'border-neutral-800 bg-neutral-950/60 text-neutral-300 hover:border-indigo-500/60 hover:text-white'
                  )}
                  aria-pressed={currentSize === size}
                >
                  {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          </div>
        }
        onStateChange={(state) => onStateChange?.(widget.id, state)}
        {...(onRetry ? { onRetry: () => onRetry(widget.id) } : {})}
        {...(onRefresh ? { onRefresh: () => onRefresh(widget.id) } : {})}
      >
        <Renderer config={widget} data={data} />
      </WidgetShell>
    </div>
  );
}

function useDraggableWithHandle(id: string) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    attributes: {
      roleDescription: 'Перетащить виджет'
    }
  });
  return { attributes, listeners, setNodeRef, transform, isDragging };
}
