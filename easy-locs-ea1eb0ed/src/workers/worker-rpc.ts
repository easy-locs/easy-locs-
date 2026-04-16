import * as Comlink from "comlink";

export function exposeWorkerMethods<T extends Record<string, (...args: unknown[]) => unknown>>(methods: T): void {
  Comlink.expose(methods);
}

export function createWorkerProxy<TMethods extends Record<string, (...args: unknown[]) => unknown>>(
  worker: Worker,
): Comlink.Remote<TMethods> & { terminate: () => void } {
  const remote = Comlink.wrap<TMethods>(worker);
  const proxy = new Proxy(remote, {
    get(target, prop: string) {
      if (prop === "terminate") return () => worker.terminate();
      return (target as Record<string, unknown>)[prop];
    },
  }) as Comlink.Remote<TMethods> & { terminate: () => void };
  return proxy;
}
