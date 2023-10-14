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
 */
export function vm(): ContextScope {
  const proxify = <T extends object>(context: ContextScope, obj: T): T => {
    const ensure_safe = <T>(res: T): T => {
      if (res == Function) return context.Function as T
      if (
        res != null &&
        (typeof res === 'object' || typeof res === 'function')
      ) {
        return proxify(context, res)
      }
      return res
    }
    const safeify = <T extends Function>(fn: T): T => {
      return function (this: unknown, ...args: unknown[]) {
        try {
          return ensure_safe(fn.apply(this, args))
        } catch (e) {
          return ensure_safe(e)
        }
      } as unknown as T
    }
    return new Proxy(obj, {
      get(
        target: object,
        property: string | symbol,
        receiver: unknown
      ): unknown {
        try {
          const res = Reflect.get(target, property, receiver)
          if (typeof target === 'function' && property === 'prototype') {
            context.eval(`throw new TypeError(
              'Accessing prototype by constructor is not supported. Use Object.getPrototypeOf() or Reflect.getPrototypeOf() instead'
            )`)
          }
          if (res === Function) {
            return context.Function
          }
          return ensure_safe(res)
        } catch (e) {
          throw ensure_safe(e)
        }
      },
      set(
        target: object,
        property: string | symbol,
        newValue: unknown,
        receiver: unknown
      ): boolean {
        try {
          if (
            newValue != null &&
            (typeof newValue === 'function' || typeof newValue === 'object') &&
            newValue.constructor.constructor === Function
          ) {
            // 外部方法正在向 context 写入内容：这可能会导致危险操作
            return Reflect.set(
              target,
              property,
              ensure_safe(newValue),
              receiver
            ) // 为避免在外部方法上伪造 this 致方法泄露
          }
          return Reflect.set(target, property, newValue, receiver)
        } catch (e) {
          throw ensure_safe(e)
        }
      },
      apply(target: object, thisArg: unknown, argArray: unknown[]): unknown {
        try {
          if (thisArg == undefined) {
            // 防止当 thisArg 为 undefined 时函数污染主页面作用域。
            return ensure_safe(
              Reflect.apply(
                target as (this: unknown, ...args: unknown[]) => unknown,
                proxify(context, context),
                argArray
              )
            )
          }
          return ensure_safe(
            Reflect.apply(
              target as (this: unknown, ...args: unknown[]) => unknown,
              thisArg,
              argArray
            )
          )
        } catch (e) {
          return ensure_safe(e)
        }
      },
      construct(
        target: object,
        argArray: unknown[]
        // newTarget: Function // prototype access violation
      ): object {
        try {
          return proxify(
            context,
            Reflect.construct(
              target as new (...args: unknown[]) => object,
              argArray
            )
          )
        } catch (e) {
          throw ensure_safe(e)
        }
      },
      getPrototypeOf(target: object): object | null {
        try {
          const res = Reflect.getPrototypeOf(target)
          if (res === null) return res
          const temp = {}
          Reflect.ownKeys(res).forEach(key =>
            Reflect.set(temp, key, Reflect.get(res, key))
          )
          return proxify(context, temp)
        } catch (e) {
          throw ensure_safe(e)
        }
      },
      defineProperty(
        target: object,
        property: string | symbol,
        attributes: PropertyDescriptor
      ): boolean {
        try {
          if (
            attributes.value != undefined &&
            (typeof attributes.value === 'function' ||
              typeof attributes.value === 'object') &&
            attributes.value.constructor.constructor === Function
          ) {
            const temp: Partial<PropertyDescriptor> = {}
            temp.value = ensure_safe(attributes.value)
            if (attributes.writable) temp.writable = attributes.writable
            if (attributes.enumerable) temp.enumerable = attributes.enumerable
            if (attributes.configurable)
              temp.configurable = attributes.configurable
            return Reflect.defineProperty(target, property, temp)
          } else {
            const { get, set } = attributes
            if (
              ((get != undefined && typeof get === 'function') ||
                (set != undefined && typeof set === 'function')) &&
              (get?.constructor === Function || set?.constructor === Function)
            ) {
              const temp: Partial<PropertyDescriptor> = {}
              if (get) temp.get = safeify(get)
              if (set) temp.set = safeify(set)
              if (attributes.writable) temp.writable = attributes.writable
              if (attributes.enumerable) temp.enumerable = attributes.enumerable
              if (attributes.configurable)
                temp.configurable = attributes.configurable
              return Reflect.defineProperty(target, property, temp)
            }
          }
          return Reflect.defineProperty(target, property, attributes)
        } catch (e) {
          throw ensure_safe(e)
        }
      },
      getOwnPropertyDescriptor(
        target: object,
        property: string | symbol
      ): PropertyDescriptor | undefined {
        const res = Reflect.getOwnPropertyDescriptor(target, property)
        if (res === undefined) return undefined
        if (
          res.value !== undefined &&
          (typeof res.value === 'function' || typeof res.value === 'object') &&
          res.value.constructor.constructor === Function
        ) {
          return {
            writable: res.writable,
            enumerable: res.enumerable,
            configurable: res.configurable,
            value: ensure_safe(res.value)
          }
        } else {
          const { get, set } = res
          if (
            ((get != undefined && typeof get === 'function') ||
              (set != undefined && typeof set === 'function')) &&
            (get?.constructor === Function || set?.constructor === Function)
          ) {
            return {
              enumerable: res.enumerable,
              configurable: res.configurable,
              get: ensure_safe(get),
              set: ensure_safe(set)
            }
          }
        }
        return res
      },
      isExtensible(): boolean {
        return true
      },
      preventExtensions(): boolean {
        return false
      },
      setPrototypeOf(): boolean {
        return false
      }
    }) as T
  }
  const createContext = (
    whitelist: readonly (string | symbol)[]
  ): ContextScope => {
    const elem = document.createElement('iframe')
    elem.src = 'about:blank'
    elem.style.display = 'none'
    document.head.appendChild(elem)
    const win = elem.contentWindow as unknown as ContextScope
    document.head.removeChild(elem)
    if (!win) throw new Error('Could not create context')
    for (const key of Reflect.ownKeys(win)) {
      if (!whitelist.includes(key)) {
        try {
          if (Object.is(Reflect.get(win, key), win)) continue
        } catch (_) {} // Firefox 118: Reflect.get(win, 'screen') -> NS_ERROR_UNEXPECTED internal error
        if (!Reflect.deleteProperty(win, key)) {
          try {
            Reflect.set(win, key, undefined)
            if (Reflect.get(win, key) != undefined) throw new Error() // 即使是 null 也是可接受的
          } catch (_) {
            const val = Reflect.get(win, key)
            if (typeof val === 'object' && val !== null) {
              Reflect.setPrototypeOf(val, null)
              Reflect.preventExtensions(val)
            }
          }
        }
      }
    }
    return win
  }
  const context = createContext(whitelist)
  return proxify(context, context)
}
