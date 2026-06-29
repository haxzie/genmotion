/** Types for code evaluated inside the headless render page. */
interface Window {
  __gmInit(payload: {
    scenes: Array<{
      id: string;
      name: string;
      durationInFrames: number;
      compiledCode: string;
    }>;
    fps: number;
    width: number;
    height: number;
  }): { error?: string };
  __gm?: {
    setFrame(frame: number): Promise<void>;
    getTotalFrames(): number;
    getLastError(): string | null;
  };
}
