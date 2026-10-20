'use client';

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'framer-motion';
import {
  Children,
  cloneElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';

const DOCK_SIZE = 128;
const DEFAULT_MAGNIFICATION = 80;
const DEFAULT_DISTANCE = 150;
const DEFAULT_PANEL_SIZE = 64;

type Orientation = 'horizontal' | 'vertical';

type DockProps = {
  children: React.ReactNode;
  className?: string;
  distance?: number;
  /** Thickness of the dock bar: its height when horizontal, its width when vertical. */
  panelHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
  /** 'horizontal' (default) lays icons in a row, 'vertical' stacks them down. */
  orientation?: Orientation;
};
type DockItemProps = {
  className?: string;
  children: React.ReactNode;
};
type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
};
type DockIconProps = {
  className?: string;
  children: React.ReactNode;
};

type DocContextType = {
  mouse: MotionValue;
  spring: SpringOptions;
  magnification: number;
  distance: number;
  orientation: Orientation;
};
type DockProviderProps = {
  children: React.ReactNode;
  value: DocContextType;
};

const DockContext = createContext<DocContextType | undefined>(undefined);

function DockProvider({ children, value }: DockProviderProps) {
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

function useDock() {
  const context = useContext(DockContext);
  if (!context) {
    throw new Error('useDock must be used within an DockProvider');
  }
  return context;
}

function Dock({
  children,
  className,
  spring = { mass: 0.1, stiffness: 150, damping: 12 },
  magnification = DEFAULT_MAGNIFICATION,
  distance = DEFAULT_DISTANCE,
  panelHeight = DEFAULT_PANEL_SIZE,
  orientation = 'horizontal',
}: DockProps) {
  const vertical = orientation === 'vertical';
  // Mouse position along the dock's main axis (x when horizontal, y when vertical)
  const mouse = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  // Room the dock needs on its cross axis while icons are magnified
  const maxSize = useMemo(() => {
    return Math.max(DOCK_SIZE, magnification + magnification / 2 + 4);
  }, [magnification]);

  const sizeRow = useTransform(isHovered, [0, 1], [panelHeight, maxSize]);
  const size = useSpring(sizeRow, spring);

  const onMove = (e: React.MouseEvent) => {
    isHovered.set(1);
    mouse.set(vertical ? e.clientY : e.clientX);
  };
  const onLeave = () => {
    isHovered.set(0);
    mouse.set(Infinity);
  };

  return (
    <motion.div
      style={vertical ? { width: size } : { height: size, scrollbarWidth: 'none' }}
      className={
        vertical
          ? 'my-2 flex flex-col items-start' // no overflow clipping, so the labels can show to the right
          : 'mx-2 flex max-w-full items-end overflow-x-auto'
      }
    >
      <motion.div
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className={cn(
          vertical
            ? 'flex h-fit flex-col gap-4 rounded-2xl bg-gray-50 py-4 pl-3 dark:bg-neutral-900'
            : 'mx-auto flex w-fit gap-4 rounded-2xl bg-gray-50 px-4 dark:bg-neutral-900',
          className
        )}
        style={vertical ? { width: panelHeight } : { height: panelHeight }}
        role='toolbar'
        aria-orientation={orientation}
        aria-label='Application dock'
      >
        <DockProvider value={{ mouse, spring, distance, magnification, orientation }}>
          {children}
        </DockProvider>
      </motion.div>
    </motion.div>
  );
}

function DockItem({ children, className }: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { distance, magnification, mouse, spring, orientation } = useDock();
  const vertical = orientation === 'vertical';

  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouse, (val) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return 0;
    return vertical
      ? val - rect.y - rect.height / 2
      : val - rect.x - rect.width / 2;
  });

  const sizeTransform = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [40, magnification, 40]
  );

  const size = useSpring(sizeTransform, spring);

  return (
    <motion.div
      ref={ref}
      style={vertical ? { width: size, height: size } : { width: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center',
        className
      )}
      tabIndex={0}
      role='button'
      aria-haspopup='true'
    >
      {Children.map(children, (child) =>
        cloneElement(child as React.ReactElement, { width: size, isHovered })
      )}
    </motion.div>
  );
}

function DockLabel({ children, className, ...rest }: DockLabelProps) {
  const restProps = rest as Record<string, unknown>;
  const isHovered = restProps['isHovered'] as MotionValue<number>;
  const { orientation } = useDock();
  const vertical = orientation === 'vertical';
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = isHovered.on('change', (latest) => {
      setIsVisible(latest === 1);
    });

    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={vertical ? { opacity: 0, x: 0 } : { opacity: 0, y: 0 }}
          animate={vertical ? { opacity: 1, x: 10 } : { opacity: 1, y: -10 }}
          exit={vertical ? { opacity: 0, x: 0 } : { opacity: 0, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            'absolute z-10 w-fit whitespace-pre rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs text-neutral-700 dark:border-neutral-900 dark:bg-neutral-800 dark:text-white',
            vertical ? 'left-full top-1/2 -translate-y-1/2' : '-top-6 left-1/2',
            className
          )}
          role='tooltip'
          style={vertical ? undefined : { x: '-50%' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DockIcon({ children, className, ...rest }: DockIconProps) {
  const restProps = rest as Record<string, unknown>;
  const width = restProps['width'] as MotionValue<number>;

  const sizeTransform = useTransform(width, (val) => val / 2);

  return (
    <motion.div
      style={{ width: sizeTransform, height: sizeTransform }}
      className={cn('flex items-center justify-center', className)}
    >
      {children}
    </motion.div>
  );
}

export { Dock, DockIcon, DockItem, DockLabel };
