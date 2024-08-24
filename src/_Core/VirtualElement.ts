import { VirtualElement } from "@popperjs/core";

export function generateGetBoundingClientRect(x = 0, y = 0): () => ClientRect {
    return () => ({
      width: 0,
      height: 0,
      top: y,
      right: x,
      bottom: y,
      left: x,
    }) as any;
  }
  
export const virtualElement: VirtualElement = {
    getBoundingClientRect: generateGetBoundingClientRect(),
  };