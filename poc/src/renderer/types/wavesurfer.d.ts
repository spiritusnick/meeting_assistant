declare module 'wavesurfer.js' {
  interface WaveSurferOptions {
    container: HTMLElement | string;
    waveColor?: string;
    progressColor?: string;
    height?: number;
    cursorWidth?: number;
    cursorColor?: string;
    barWidth?: number;
    barGap?: number;
    normalize?: boolean;
    responsive?: boolean;
    scrollParent?: boolean;
    fillParent?: boolean;
    audioRate?: number;
    autoCenter?: boolean;
    minPxPerSec?: number;
    plugins?: any[];
    [key: string]: any;
  }
  
  interface DecodedBuffer {
    length: number;
    duration: number;
    sampleRate: number;
    numberOfChannels: number;
    getChannelData: (channel: number) => Float32Array;
  }

  class WaveSurfer {
    static create(options: WaveSurferOptions): WaveSurfer;
    
    on(event: string, callback: (...args: any[]) => void): void;
    un(event: string, callback: (...args: any[]) => void): void;
    unAll(): void;
    
    destroy(): void;
    empty(): void;
    
    load(url: string): void;
    loadBlob(blob: Blob): void;
    loadDecodedBuffer(buffer: DecodedBuffer): void;
    
    play(start?: number, end?: number): void;
    pause(): void;
    stop(): void;
    
    isPlaying(): boolean;
    setVolume(volume: number): void;
    getVolume(): number;
    
    getCurrentTime(): number;
    getDuration(): number;
    seekTo(progress: number): void;
    setPlaybackRate(rate: number): void;
    getPlaybackRate(): number;
    
    zoom(pxPerSec: number): void;
    exportImage(format: string, quality: number): string;
  }
  
  export = WaveSurfer;
}
