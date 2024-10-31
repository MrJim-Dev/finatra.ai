declare module 'use-debounce' {
  export function useDebouncedCallback<T extends (...args: any[]) => void>(
    callback: T,
    delay: number
  ): (...args: Parameters<T>) => void; // This returns a function directly, without the tuple
}
