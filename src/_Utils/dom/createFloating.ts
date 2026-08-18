import { computePosition, autoUpdate, autoPlacement } from '@floating-ui/dom';
import { FloatingInstance } from './floatingInstance';

/**
 * A reusable function similar to `createPopper` that encapsulates FloatingUI functionality.
 * Automatically computes and applies styles for positioning.
 *
 * @param {HTMLElement} reference - The reference element (e.g., a button).
 * @param {HTMLElement} floating - The floating element (e.g., a dropdown or tooltip).
 * @param {Object} options - Optional configuration for FloatingUI.
 * @returns {Object} - An object with `update`, `destroy`, and current state.
 */
export function createFloating(reference, floating, options: any = {}) : FloatingInstance {
  let cleanupAutoUpdate;

  // computePosition is told options.strategy (e.g. 'fixed'), so the element
  // must actually be positioned that way too, or the computed x/y land in
  // the wrong coordinate space entirely (fixed = viewport-relative vs.
  // absolute = document-relative) — that mismatch is what put the dropdown
  // hundreds of pixels away from its trigger.
  const strategy = options.strategy ?? 'absolute';

  // Function to apply computed styles to the floating element
  const applyStyles = ({ x, y, placement }) => {
    Object.assign(floating.style, {
      position: strategy,
      left: `${x}px`,
      top: `${y}px`,
    });
    floating.dataset.placement = placement; // Optional: Useful for styling based on placement
  };

  // Update function to compute and apply styles
  const update = async () => {
    // Spread into a new object rather than Object.assign(options, ...) —
    // that mutated the caller's own options object and clobbered whatever
    // middleware (e.g. offset()/flip()) it had asked for with a bare
    // autoPlacement() on every single update.
    const { x, y, placement } = await computePosition(reference, floating, {
      ...options,
      middleware: options.middleware ?? [autoPlacement()],
    });
    applyStyles({ x, y, placement });
  };

  // Initialize the positioning and auto-update
  const init = () => {
    cleanupAutoUpdate = autoUpdate(reference, floating, update);
    update(); // Initial position computation
  };

  // Clean up resources
  const destroy = () => {
    if (cleanupAutoUpdate) cleanupAutoUpdate();
  };

  init();

  return { update, destroy };
}