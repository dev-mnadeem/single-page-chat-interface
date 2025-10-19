import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * How far from the bottom the user may be and still count as "following".
 * One line of text is roughly 24px, so this is about two and a half lines of
 * slack - enough that a stray trackpad nudge does not unpin the view.
 */
export const STICK_THRESHOLD_PX = 64;

export interface ScrollMetrics {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
}

export function isNearBottom(
  { scrollTop, scrollHeight, clientHeight }: ScrollMetrics,
  threshold = STICK_THRESHOLD_PX,
): boolean {
  return scrollHeight - scrollTop - clientHeight <= threshold;
}

export interface StickToBottom<T extends HTMLElement> {
  containerRef: React.RefObject<T | null>;
  /** True while the view is following new content. */
  pinned: boolean;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}

/**
 * Keeps a scroll container pinned to the newest content **only while the user
 * is already at the bottom**.
 *
 * The naive version of this - `scrollIntoView()` in an effect on every message
 * change - is the single most common bug in chat UIs: scroll up to re-read
 * something, a token arrives, and the view yanks you back down. Here the
 * decision is made from the scroll position at the moment the content changes,
 * and when the user is reading history the caller renders a "jump to latest"
 * affordance instead of moving the viewport under them.
 */
export function useStickToBottom<T extends HTMLElement>(
  contentKey: string,
  threshold = STICK_THRESHOLD_PX,
): StickToBottom<T> {
  const containerRef = useRef<T | null>(null);
  const [pinned, setPinned] = useState(true);
  // Read synchronously by the layout effect, so it must not be state.
  const pinnedRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const element = containerRef.current;
    if (!element) return;
    element.scrollTo({ top: element.scrollHeight, behavior });
    pinnedRef.current = true;
    setPinned(true);
  }, []);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onScroll = () => {
      const next = isNearBottom(element, threshold);
      pinnedRef.current = next;
      setPinned(next);
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => element.removeEventListener("scroll", onScroll);
  }, [threshold]);

  // Layout, not passive: this has to run before the browser paints the new
  // content, otherwise the list visibly jumps.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element || !pinnedRef.current) return;
    element.scrollTop = element.scrollHeight;
  }, [contentKey]);

  return { containerRef, pinned, scrollToBottom };
}
