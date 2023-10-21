/**
 * Copyright(c) 凌 2023.
 * This project is licensed under the MIT license.
 */
type ScopeHelper<T extends readonly (string | symbol)[]> = {
  [key in T[number]]: unknown
}
const whitelist = [
  'atob',
  'btoa',
  'clearInterval',
  'clearTimeout',
  'crypto',
  'location',
  'queueMicrotask',
  'requestIdleCallback',
  'setInterval',
  'setTimeout',
  'Infinity',
  'AggregateError',
  'Array',
  'ArrayBuffer',
  'Atomics',
  'BigInt',
  'BigInt64Array',
  'BitUint64Array',
  'Boolean',
  'DataView',
  'Date',
  'Error',
  'EvalError',
  'FinalizationRegistry',
  'Float32Array',
  'Float64Array',
  'Function',
  'Int8Array',
  'Int16Array',
  'Int32Array',
  'Intl',
  'Iterator',
  'JSON',
  'Map',
  'Math',
  'NaN',
  'Number',
  'Object',
  'Promise',
  'Proxy',
  'RangeError',
  'ReferenceError',
  'Reflect',
  'RegExp',
  'Set',
  'String',
  'Symbol',
  'SyntaxError',
  'TypeError',
  'URIError',
  'URL',
  'Uint8Array',
  'Uint8ClampedArray',
  'Uint16Array',
  'Uint32Array',
  'WeakMap',
  'WeakRef',
  'WeakSet',
  'WebAssembly',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'escape',
  'eval',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'undefined',
  'unescape'
] as const
type ContextScope = ScopeHelper<typeof whitelist> & {
  eval: typeof eval
  Function: typeof Function
  TypeError: typeof TypeError
} & {
  [key: string | symbol]: unknown
}
/**
 * 创建虚拟机上下文。
 * @returns 虚拟机上下文。
 */
export function vm(): ContextScope {
  const elem = document.createElement('iframe')
  elem.src = 'about:blank'
  elem.style.display = 'none'
  document.head.appendChild(elem)
  const context = elem.contentWindow as unknown as ContextScope
  document.head.removeChild(elem)
  if (!context) throw new Error('Could not create context')
  for (const key of Reflect.ownKeys(context)) {
    if (!(whitelist as readonly (string | symbol)[]).includes(key)) {
      try {
        if (Object.is(Reflect.get(context, key), context)) continue
      } catch (_) {
        // eslint-disable-next-line no-empty
      } // Firefox 118: Reflect.get(win, 'screen') -> NS_ERROR_UNEXPECTED internal error
      if (!Reflect.deleteProperty(context, key)) {
        try {
          Reflect.set(context, key, undefined)
          if (Reflect.get(context, key) != undefined) throw new Error() // 即使是 null 也是可接受的
        } catch (_) {
          const val = Reflect.get(context, key)
          if (typeof val === 'object' && val !== null) {
            Reflect.setPrototypeOf(val, null)
            Reflect.preventExtensions(val)
          }
        }
      }
    }
  }
  const inner_cache = new Map<object, WeakRef<object>>()
  const outer_cache = new Map<object, WeakRef<object>>()
  function inner_proxify<T>(target: T, dummy?: object): T {
    if (
      target === null ||
      (typeof target !== 'object' && typeof target !== 'function')
    )
      return target
    if (inner_cache.has(target)) {
      const v = inner_cache.get(target)?.deref()
      if (v !== undefined) return v as T
    }
    if (typeof target === 'function' && dummy === undefined)
      return inner_proxify(target, function () {})
    const proxy = new Proxy<object>(dummy ?? target, {
      get(_: object, property: string | symbol): unknown {
        try {
          const res = Reflect.get(target, property)
          if (res === Function) return context.Function
          return inner_proxify(res)
        } catch (e) {
          throw inner_proxify(e)
        }
      },
      has(_: object, property: string | symbol): boolean {
        return Reflect.has(target, property)
      },
      deleteProperty(_: object, property: string | symbol): boolean {
        return Reflect.deleteProperty(target, property)
      },
      ownKeys(_: object): ArrayLike<string | symbol> {
        return Reflect.ownKeys(target)
      },
      set(_: object, property: string | symbol, newValue: unknown): boolean {
        try {
          return Reflect.set(target, property, newValue)
        } catch (e) {
          throw inner_proxify(e)
        }
      },
      apply(_: object, thisArg: unknown, argArray: unknown[]): unknown {
        try {
          return inner_proxify(
            Reflect.apply(
              target as (this: unknown, ...args: unknown[]) => unknown,
              thisArg,
              argArray
            )
          )
        } catch (e) {
          throw inner_proxify(e)
        }
      },
      construct(_: object, argArray: unknown[]): object {
        try {
          return inner_proxify(
            Reflect.construct(
              target as new (...args: unknown[]) => object,
              argArray
            )
          )
        } catch (e) {
          throw inner_proxify(e)
        }
      },
      getOwnPropertyDescriptor(
        _: object,
        property: string | symbol
      ): PropertyDescriptor | undefined {
        const res = Reflect.getOwnPropertyDescriptor(target, property)
        if (res === undefined) return undefined
        if (typeof target === 'function' && property === 'prototype') {
          const res2 = Reflect.getOwnPropertyDescriptor(_, property)
          if (res2 === undefined) return undefined
          if (res.value !== undefined) res2.value = inner_proxify(res.value)
          if (res.get) res2.get = inner_proxify(res.get)
          if (res.set) res2.set = inner_proxify(res.set)
          return res2
        }
        if (res.value !== undefined) res.value = inner_proxify(res.value)
        if (res.get) res.get = inner_proxify(res.get)
        if (res.set) res.set = inner_proxify(res.set)
        return res
      },
      isExtensible(): boolean {
        return Reflect.isExtensible(target)
      },
      preventExtensions(): boolean {
        return false
      },
      setPrototypeOf(): boolean {
        return false
      },
      defineProperty(
        _: object,
        property: string | symbol,
        attributes: PropertyDescriptor
      ): boolean {
        return Reflect.defineProperty(target, property, attributes)
      },
      getPrototypeOf(_: object): object | null {
        const res = Reflect.getPrototypeOf(target)
        if (res === null) return res
        return inner_proxify(res)
      }
    } as Required<ProxyHandler<object>>)
    inner_cache.set(target, new WeakRef<object>(proxy))
    return proxy as T
  }
  function outer_proxify<T>(target: T, dummy?: object): T {
    if (
      target === null ||
      (typeof target !== 'object' && typeof target !== 'function')
    )
      return target
    for (const [key, value] of inner_cache.entries()) {
      if (value.deref() === target) {
        return key as T
      }
    }
    if (outer_cache.has(target)) {
      const v = outer_cache.get(target)?.deref()
      if (v !== undefined) return v as T
    }
    if (typeof target === 'function' && dummy === undefined)
      return outer_proxify(target, function () {})
    const proxy = new Proxy<object>(dummy ?? target, {
      get(_: object, property: string | symbol): unknown {
        try {
          const res = Reflect.get(target, property)
          return outer_proxify(res)
        } catch (e) {
          throw outer_proxify(e)
        }
      },
      has(_: object, property: string | symbol): boolean {
        return Reflect.has(target, property)
      },
      deleteProperty(_: object, property: string | symbol): boolean {
        return Reflect.deleteProperty(target, property)
      },
      ownKeys(_: object): ArrayLike<string | symbol> {
        return Reflect.ownKeys(target)
      },
      set(_: object, property: string | symbol, newValue: unknown): boolean {
        try {
          if (newValue === Function)
            return Reflect.set(target, property, context.Function)
          if (newValue === eval)
            return Reflect.set(target, property, context.eval)
          return Reflect.set(target, property, inner_proxify(newValue))
        } catch (e) {
          throw outer_proxify(e)
        }
      },
      apply(_: object, thisArg: unknown, argArray: unknown[]): unknown {
        try {
          return outer_proxify(
            Reflect.apply(
              target as (this: unknown, ...args: unknown[]) => unknown,
              thisArg,
              argArray
            )
          )
        } catch (e) {
          throw outer_proxify(e)
        }
      },
      construct(_: object, argArray: unknown[]): object {
        try {
          return outer_proxify(
            Reflect.construct(
              target as new (...args: unknown[]) => object,
              argArray
            )
          )
        } catch (e) {
          throw outer_proxify(e)
        }
      },
      isExtensible(): boolean {
        return Reflect.isExtensible(target)
      },
      preventExtensions(): boolean {
        return false
      },
      setPrototypeOf(): boolean {
        return false
      }
    }) //  as Required<ProxyHandler<object>>
    outer_cache.set(target, new WeakRef<object>(proxy))
    return proxy as T
  }
  return outer_proxify(context) as ContextScope
}
