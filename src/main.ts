/**
 * Copyright(c) 凌 2023.
 * This project is licensed under the MIT license.
 */
/**
 * 虚拟环境至少需要有的函数。
 */
export type ContextScope = {
  eval: typeof eval
  Function: typeof Function
} & {
  [key: string | symbol]: unknown
}
/**
 * 生成虚拟环境用的函数类型。
 */
export type Initalizer = () => ContextScope
/**
 * 使用项目内置的 iframe 方式生成虚拟机环境。此方法可以确保环境和权限最小。
 * @param whitelist 白名单。在此名单内的函数/对象将不被删除。
 * @returns 虚拟机环境。
 */
export function iframe(
  whitelist: string[] = [
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
    'BigUint64Array',
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
  ]
): ContextScope {
  const elem = document.createElement('iframe')
  elem.src = 'about:blank'
  elem.style.display = 'none'
  document.head.appendChild(elem)
  const context = elem.contentWindow as unknown as ContextScope
  const clone = new Map<string, unknown>()
  for (const key of whitelist) {
    if (key in context) clone.set(key, context[key])
  }
  document.head.removeChild(elem)
  if (!context) throw new Error('Could not create context')
  for (const [key, value] of clone.entries()) {
    if (!(key in context)) context[key] = value
  }
  for (const key of Reflect.ownKeys(context)) {
    if (!(whitelist as readonly (string | symbol)[]).includes(key)) {
      try {
        if (Object.is(Reflect.get(context, key), context)) continue
      } catch (_) {
        // eslint-disable-next-line no-empty
      } // Firefox 118: Reflect.get(win, 'screen') -> NS_ERROR_UNEXPECTED internal error (https://bugzilla.mozilla.org/show_bug.cgi?id=1858977, fixed)
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
  return context
}
/**
 * 创建虚拟机上下文。
 * @param initalizer 创建虚拟机环境的函数。
 * @returns 虚拟机上下文。
 */
export function vm(initalizer: Initalizer = iframe): ContextScope {
  const context = initalizer()
  type ProxifyType = <T>(target: T, dummy?: object) => T
  function proxify_generator(
    cache: Map<object, WeakRef<object>>,
    opposite_cache: Map<object, WeakRef<object>>,
    outer_proxify: ProxifyType,
    safe: boolean
  ): ProxifyType {
    return function proxify<T>(target: T, dummy?: object): T {
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
            if (res === Function && safe) return context.Function
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
        ownKeys(_: object): ArrayLike<string | symbol> {
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
        getPrototypeOf(_: object): object | null {
          const res = Reflect.getPrototypeOf(target)
          if (res === null) return res
          return proxify(res)
        }
      } as Required<ProxyHandler<object>>)
      cache.set(target, new WeakRef<object>(proxy))
      return proxy as T
    }
  }
  // inner_cache：实际对象 -> Proxy 对象
  const inner_cache = new Map<object, WeakRef<object>>()
  // outer_cache：Proxy 对象 -> 实际对象
  const outer_cache = new Map<object, WeakRef<object>>()
  let outer_proxify: ProxifyType | null = null
  function lazy_outer<T>(target: T, dummy?: object): T {
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
  return outer_proxify(context) as ContextScope
}
