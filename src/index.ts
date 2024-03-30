/**
 * Copyright(c) FurryR 2023.
 * This project is licensed under the MIT license.
 */
const internalObject = [
  'Boolean',
  'Number',
  'String',
  'Object',
  'Set',
  'Symbol',
  'Array',
  'Function',
  'BigInt',
  'NaN',
  'undefined',
  'Infinity',
  'Error',
  'EvalError',
  'JSON',
  'Proxy',
  'Promise',
  'RangeError',
  'ReferenceError',
  'Reflect',
  'RegExp',
  'eval',
  'Map',
  'Math',
  'SyntaxError',
  'TypeError',
  'URIError',
  'URL',
  'Date',
  'WeakMap',
  'WeakRef',
  'WeakSet',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'escape',
  'isFinite',
  'parseFloat',
  'parseInt',
  'unescape',
  'atob',
  'btoa',
  'AggregateError',
  'structuredClone',
  // 'ArrayBuffer',
  'Atomics',
  // 'BigInt64Array',
  // 'BigUint64Array',
  // 'DataView',
  'FinalizationRegistry',
  // 'Float32Array',
  // 'Float64Array',
  // 'Int8Array',
  // 'Int16Array',
  // 'Int32Array',
  'Intl'
  // 'Uint8Array',
  // 'Uint8ClampedArray',
  // 'Uint16Array',
  // 'Uint32Array',
  // 'crypto'
] as const
/**
 * The functions that the context needs to have.
 */
type ScopeHelper = {
  [key in (typeof internalObject)[number]]: (typeof globalThis)[key]
}

/**
 * Generate a virtual environment using iframe.
 * @returns Virtual environment.
 */
function iframe(): ScopeHelper {
  const elem = document.createElement('iframe')
  elem.src = 'about:blank'
  elem.style.display = 'none'
  document.head.appendChild(elem)
  const context = elem.contentWindow as unknown as ScopeHelper
  document.head.removeChild(elem)
  if (!context || !context['Function'])
    throw new Error('Could not create context')
  for (const key of Reflect.ownKeys(context)) {
    if (!(internalObject as readonly (string | symbol)[]).includes(key)) {
      try {
        if (Object.is(Reflect.get(context, key), context)) continue
      } catch (_) {
        // eslint-disable-next-line no-empty
      } // Firefox 118: Reflect.get(win, 'screen') -> NS_ERROR_UNEXPECTED internal error (https://bugzilla.mozilla.org/show_bug.cgi?id=1858977, fixed)
      if (!Reflect.deleteProperty(context, key)) {
        try {
          Reflect.set(context, key, undefined)
          if (Reflect.get(context, key)) throw new Error() // Acceptable even if it is null
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
  return context
}
/**
 * Create an isolated context.
 * @param extras Extra objects.
 * @returns Isolated context.
 */
export function vm<T extends Record<string | symbol | number, unknown>>(
  extras: T
): ScopeHelper & T
export function vm(): ScopeHelper
export function vm<T extends Record<string | symbol | number, unknown>>(
  extras?: T
): ScopeHelper | (ScopeHelper & T) {
  const environment = iframe()
  type ProxifyType = <T>(target: T, dummy?: object) => T
  const proxify_generator = (
    cache: Map<object, WeakRef<object>>,
    opposite_cache: Map<object, WeakRef<object>>,
    outer_proxify: ProxifyType,
    safe: boolean
  ): ProxifyType => {
    const proxify = <T>(target: T, dummy?: object): T => {
      if (
        target === null ||
        (typeof target !== 'object' && typeof target !== 'function')
      )
        return target
      if (cache.has(target)) {
        const v = cache.get(target)?.deref()
        if (v !== undefined) return v as T
        cache.delete(target)
      }
      for (const [key, value] of opposite_cache.entries()) {
        const ref = value.deref()
        if (ref === undefined) opposite_cache.delete(key)
        if (ref === target) {
          return key as T
        }
      }
      if (typeof target === 'function' && dummy === undefined)
        return proxify(target, function () {})
      const proxy = new Proxy<object>(dummy ?? target, {
        get(_: object, property: string | symbol): unknown {
          try {
            const res = Reflect.get(target, property)
            if (res === Function && safe) return environment.Function
            return proxify(res)
          } catch (e) {
            throw proxify(e)
          }
        },
        has(_: object, property: string | symbol): boolean {
          return Reflect.has(target, property)
        },
        deleteProperty(_: object, property: string | symbol): boolean {
          return Reflect.deleteProperty(target, property)
        },
        ownKeys(): ArrayLike<string | symbol> {
          return Reflect.ownKeys(target)
        },
        set(_: object, property: string | symbol, newValue: unknown): boolean {
          try {
            return Reflect.set(target, property, outer_proxify(newValue))
          } catch (e) {
            throw proxify(e)
          }
        },
        apply(_: object, thisArg: unknown, argArray: unknown[]): unknown {
          try {
            const r: unknown[] = []
            for (const v of argArray) {
              r.push(outer_proxify(v))
            }
            return proxify(
              Reflect.apply(
                target as (this: unknown, ...args: unknown[]) => unknown,
                outer_proxify(thisArg),
                r
              )
            )
          } catch (e) {
            throw proxify(e)
          }
        },
        construct(_: object, argArray: unknown[]): object {
          try {
            const r: unknown[] = []
            for (const v of argArray) {
              r.push(outer_proxify(v))
            }
            return proxify(
              Reflect.construct(target as new (...args: unknown[]) => object, r)
            )
          } catch (e) {
            throw proxify(e)
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
            if (res.value !== undefined) res2.value = proxify(res.value)
            if (res.get) res2.get = proxify(res.get)
            if (res.set) res2.set = proxify(res.set)
            return res2
          }
          if (res.value !== undefined) res.value = proxify(res.value)
          if (res.get) res.get = proxify(res.get)
          if (res.set) res.set = proxify(res.set)
          return res
        },
        isExtensible(): boolean {
          return Reflect.isExtensible(target)
        },
        preventExtensions(): boolean {
          return Reflect.preventExtensions(target)
        },
        setPrototypeOf(_: object, v: object | null): boolean {
          return Reflect.setPrototypeOf(target, outer_proxify(v))
        },
        defineProperty(
          _: object,
          property: string | symbol,
          attributes: PropertyDescriptor
        ): boolean {
          if ('value' in attributes) {
            return Reflect.defineProperty(target, property, {
              value: outer_proxify(attributes.value),
              writable: attributes.writable,
              enumerable: attributes.enumerable,
              configurable: attributes.configurable
            })
          }
          const get = attributes.get
            ? outer_proxify(function (this: unknown) {
                return attributes.get?.call(proxify(this))
              })
            : undefined
          const set = attributes.set
            ? outer_proxify(function (this: unknown, newValue: unknown) {
                return attributes.set?.call(proxify(this), newValue)
              })
            : undefined
          if (get) cache.set(get, new WeakRef<object>(attributes.get as object))
          if (set) cache.set(set, new WeakRef<object>(attributes.set as object))
          return Reflect.defineProperty(target, property, {
            get,
            set,
            enumerable: attributes.enumerable,
            configurable: true
          })
        },
        getPrototypeOf(): object | null {
          const res = Reflect.getPrototypeOf(target)
          if (res === null) return res
          return proxify(res)
        }
      } as Required<ProxyHandler<object>>)
      cache.set(target, new WeakRef<object>(proxy))
      return proxy as T
    }
    return proxify
  }
  // inner_cache：Actual -> Proxy
  const inner_cache = new Map<object, WeakRef<object>>()
  // outer_cache：Proxy -> Actual
  const outer_cache = new Map<object, WeakRef<object>>()
  let outer_proxify: ProxifyType | null = null
  const lazy_outer = <T>(target: T, dummy?: object): T => {
    if (outer_proxify) {
      return outer_proxify(target, dummy)
    } else {
      throw new Error('Not implemented')
    }
  }
  const inner_proxify = proxify_generator(
    inner_cache,
    outer_cache,
    lazy_outer,
    true
  )
  outer_proxify = proxify_generator(
    outer_cache,
    inner_cache,
    inner_proxify,
    false
  )
  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      Reflect.set(environment, key, inner_proxify(value))
    }
  }
  return outer_proxify(environment)
}
