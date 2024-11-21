export interface Options {
    onStart?: () => void;
    onEnd?: () => void;
    onNext?: (stepIndex: number) => void;
    onPrev?: (stepIndex: number) => void;
  }