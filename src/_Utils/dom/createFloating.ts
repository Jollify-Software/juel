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
export function createFloating(reference, floating, options = {}) : FloatingInstance {
  let cleanupAutoUpdate;

  // Function to apply computed styles to the floating element
  const applyStyles = ({ x, y, placement }) => {
    Object.assign(floating.style, {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
    });
    floating.dataset.placement = placement; // Optional: Useful for styling based on placement
  };

  // Update function to compute and apply styles
  const update = async () => {
    const { x, y, placement } = await computePosition(reference, floating,
      Object.assign(options, {
        middleware: [
          autoPlacement()
        ],
      }));
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