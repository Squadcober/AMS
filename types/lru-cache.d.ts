declare module 'lru-cache' {
  export interface LRUCacheOptions<K, V> {
    max?: number;
    ttl?: number;
    maxSize?: number;
    sizeCalculation?: (value: V, key: K) => number;
    dispose?: (value: V, key: K) => void;
    noDisposeOnSet?: boolean;
    updateAgeOnGet?: boolean;
    allowStale?: boolean;
  }

  export class LRUCache<K, V> {
    constructor(options?: LRUCacheOptions<K, V>);
    
    set(key: K, value: V, options?: { ttl?: number }): this;
    get(key: K): V | undefined;
    peek(key: K): V | undefined;
    delete(key: K): boolean;
    clear(): void;
    has(key: K): boolean;
    forEach(fn: (value: V, key: K, cache: this) => void, thisArg?: any): void;
    keys(): IterableIterator<K>;
    values(): IterableIterator<V>;
    entries(): IterableIterator<[K, V]>;
    readonly size: number;
  }
}
