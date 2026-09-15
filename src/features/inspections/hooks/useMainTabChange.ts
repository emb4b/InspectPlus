import { useCallback } from 'react';
import type { ScrollView } from 'react-native';
import { useHeaderScroll } from '../../home/context/HeaderScrollContext';

// The report screens render every tab's content inside one shared
// KeyboardAwareScrollView — switching tabs only swaps its children, so the
// native contentOffset carries over and the new tab opens wherever the old
// one was scrolled to. Wraps the tab setter to jump the body back to the
// top on a real tab change; tapping the active tab again is a no-op.
//
// The header's collapse tracks scroll offset but deliberately ignores
// programmatic scrolls (see HeaderScrollContext's `dragging` gate), so the
// jump to y=0 alone would leave the header collapsed while sitting at the
// top. expand() puts them back in agreement, the same way _layout.tsx does
// on every route change.
export function useMainTabChange(
  activeMain: string,
  setActiveMain: (key: string) => void,
  scrollRef: React.RefObject<ScrollView | null>,
): (key: string) => void {
  const { expand } = useHeaderScroll();
  return useCallback(
    (key: string) => {
      if (key === activeMain) return;
      setActiveMain(key);
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      expand();
    },
    [activeMain, setActiveMain, scrollRef, expand],
  );
}
