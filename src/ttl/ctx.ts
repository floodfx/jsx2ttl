import crypto from "crypto";

import { Component as ReactComponent, type ErrorInfo, type ReactInstance, type ReactNode } from "react";
import type { Template } from ".";


type AnyEvent = any;
type AnyPushEvent = any;
type Event<E> = any;
type ViewEvent = any;

/**
 * Represents the `LiveComponent`'s websocket connectedness along with current
 * state of the component.  Also provides a method for sending messages
 * internally to the parent `LiveView`.
 */
export interface ComponentContext<E extends ViewEvent = AnyEvent> {
  /**
   * The id of the parent `LiveView`
   */
  id: string;
  // cid: number; TODO should we provide this as well?
  /**
   * Whether the websocket is connected (i.e. http request or joined via websocket)
   * true if connected to a websocket, false for http request
   */
  connected: boolean;
  /**
   * helper method to send messages to the parent `LiveView` via the `handleInfo`
   */
  dispatchEvent(event: Event<E>): void;
  /**
   * helper method to send events to Hooks on the parent `LiveView`
   */
  pushEvent(pushEvent: AnyPushEvent): void;
}

abstract class BaseComponentContext<E extends ViewEvent = AnyEvent> implements ComponentContext<E> {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }
  dispatchEvent(event: Event<E>): void {
    // no-op
  }

  pushEvent(pushEvent: AnyPushEvent) {
    // no-op
  }

  abstract connected: boolean;
}

export class HttpComponentContext<E extends ViewEvent = AnyEvent> extends BaseComponentContext<E> {
  readonly connected: boolean = false;

  constructor(id: string) {
    super(id);
  }
}

export class WsComponentContext<E extends ViewEvent = AnyEvent> extends BaseComponentContext<E> {
  readonly connected: boolean = true;

  private dispatchEventCallback: (event: Event<E>) => void;
  private pushEventCallback: (pushEvent: AnyPushEvent) => void;

  constructor(
    id: string,
    dispatchEventCallback: (event: Event<E>) => void,
    pushEventCallback: (pushEvent: AnyPushEvent) => void
  ) {
    super(id);
    this.dispatchEventCallback = dispatchEventCallback;
    this.pushEventCallback = pushEventCallback;
  }

  dispatchEvent(event: Event<E>): void {
    this.dispatchEventCallback(event);
  }

  pushEvent(pushEvent: AnyPushEvent): void {
    this.pushEventCallback(pushEvent);
  }
}

/**
 * A `LiveComponent` is a component that is embedded in a `LiveView` via
 * the `live_component` helper.  Their lifecycle is managed by and the same length
 * as their parent `LiveView`.
 *
 * `LiveComponent`s can be stateless or stateful.  Stateless components' lifecycle
 * consists of running `preload`, `mount`, `update`, and `render` when any new data is received
 * (via the `live_component` helper).  Stateful components' lifecycle consists is different.
 * Stateful components' lifecycle consists of running `preload` `mount`, `update`, and `render`
 * on the first time a `LiveComponent` is loaded followed by `preload`, `update`, and `render` on
 * subsequent renders.  In other words, subsequent updates only run `preload`, `update` and `render`
 * and the state (contenxt) is managed for the lifecycle of the `LiveView`.
 *
 * To make a `LiveComponent` stateful, you must pass an `id` to the `live_component` helper in the
 * `LiveView` template.
 */
export interface Component<S, E extends ViewEvent, RenderResult> {
  id?: string;

  /**
   * `preload` is useful when multiple `LiveComponent`s of the same type are loaded
   * within the same `LiveView` and you want to preload data for all of them in batch.
   * This helps to solve the N+1 query problem.
   * @param contextsList
   */
  //preload(contextsList: Context[]): Partial<Context>[];

  /**
   * Mounts the `LiveComponent`'s stateful context.  This is called only once
   * for stateful `LiveComponent` and every render for a stateless `LiveComponent`.
   * This is called prior to `update` and `render`.
   *
   */
  mount?: (ctx: ComponentContext<E>) => void | Promise<void>;

  /**
   * Allows the `LiveComponent` to update its stateful context.  This is called
   * prior to `render` for both stateful and stateless `LiveComponent`s.  This is a
   * good place to add additional business logic to the `LiveComponent` if you
   * need to change the context (e.g. derive data from or transform) of the `LiveComponentSocket`.
   *
   * @param ctx a `ComponentContext` with the context for this `LiveComponent`
   */
  update?: (ctx: ComponentContext<E>) => void | Promise<void>;

  /**
   * Optional method that handles events from the `LiveComponent` initiated by the end-user. Only
   * called for "stateful" `LiveComponent`s (i.e. `LiveComponent`s with an "id" in their context).
   * In other words, only components with an `id` attribute in their "LiveContext" can handleEvents.
   */
  handleEvent?: (ctx: ComponentContext<E>, event: E) => void | Promise<void>;

  shutdown?(): void;

  render(): RenderResult;
}

export abstract class BaseComponent<State, E extends ViewEvent = AnyEvent> implements Component<State, E, Template> {
  // Hotdog interface
  id?: string | undefined;
  mount(ctx: ComponentContext<any>): void | Promise<void> {
    // no op
  }
  update(ctx: ComponentContext<any>): void | Promise<void> {
    // no op
  }
  handleEvent(ctx: ComponentContext<any>, event: any): void | Promise<void> {
    // no op
  }
  shutdown(): void {
    // no op
  }
  abstract render(): Template;
}

export abstract class BaseJSXComponent<State, E extends ViewEvent = AnyEvent>
  implements Component<State, E, ReactNode>, ReactComponent
{
  /**
   * React Component Callbacks
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("error in component", error, errorInfo);
  }
  componentDidMount(): void {
    // no op
  }
  componentDidUpdate(prevProps: Readonly<{}>, prevState: Readonly<{}>, snapshot?: any): void {
    // no op
  }
  componentWillUnmount(): void {
    // no op
  }

  forceUpdate(callback?: (() => void) | undefined): void {
    throw new Error("Updates are handled by the `Hotdogjs` runtime");
  }
  shouldComponentUpdate(nextProps: Readonly<{}>, nextState: Readonly<{}>, nextContext: any): boolean {
    throw new Error("Updates are handled by the `Hotdogjs` runtime");
  }
  getSnapshotBeforeUpdate(prevProps: Readonly<{}>, prevState: Readonly<{}>) {
    throw new Error("Updates are handled by the `Hotdogjs` runtime");
  }

  setState<K extends never>(
    state: {} | ((prevState: Readonly<{}>, props: Readonly<{}>) => {} | Pick<{}, K> | null) | Pick<{}, K> | null,
    callback?: (() => void) | undefined
  ): void {
    throw new Error("setState not supported.  Use class properties for state");
  }

  props: Readonly<State> & Readonly<{ children?: ReactNode }> = {} as State & { children?: ReactNode };
  // state: Readonly<{}> = {};
  get state(): Readonly<State> {
    throw new Error("State is not supported.  Use class properties for state");
  }
  set state(value: Readonly<State>) {
    throw new Error("State is not supported.  Use class properties for state");
  }

  // TODO replace passing ctx into mount and update with this.context?
  get context(): any {
    throw new Error("Context is not supported.  Use `ComponentContext` instead.");
  }
  set context(value: any) {
    throw new Error("Method not implemented.");
  }

  // refs: { [key: string]: ReactInstance } = {};
  get refs(): { [key: string]: ReactInstance } {
    throw new Error("Refs not supported");
  }
  set refs(value: { [key: string]: ReactInstance }) {
    throw new Error("Refs not supported");
  }

  /**
   * safeMount is called by the `Hotdogjs` runtime as part of the lifecycle of a `Component`.
   */
  async safeMount(ctx: ComponentContext<E>): Promise<void> {
    try {
      if (this.mount) {
        await this.mount(ctx);
        this.componentDidMount();
      }
    } catch (e: any) {
      const error: Error = new Error("error in mount", e);
      const errorInfo: ErrorInfo = {
        digest: e.toString(),
      };
      this.componentDidCatch(error, errorInfo);
    }
  }

  /**
   * safeUpdate is called by the `Hotdogjs` runtime as part of the lifecycle of a `Component`.
   */
  async safeUpdate(ctx: ComponentContext<E>): Promise<void> {
    try {
      if (this.update) {
        await this.update(ctx);
        // todo track props, state, etc
        this.componentDidUpdate({}, {}, {});
      }
    } catch (e: any) {
      const error: Error = new Error("error in update", e);
      const errorInfo: ErrorInfo = {
        digest: e.toString(),
      };
      this.componentDidCatch(error, errorInfo);
    }
  }

  // Hotdog interface
  id?: string | undefined;
  mount(ctx: ComponentContext<any>): void | Promise<void> {
    // no op
  }
  update(ctx: ComponentContext<any>): void | Promise<void> {
    // no op
  }
  handleEvent(ctx: ComponentContext<any>, event: any): void | Promise<void> {
    // no op
  }
  shutdown(): void {
    // no op
  }
  abstract render(): ReactNode;
}

/**
 * Calculates the "hash" (opaque string) of a `LiveComponent` given its `CreateLiveComponentParams`.
 * @param c
 * @returns
 */
export function hashLiveComponent(c: Component<any, any, any>): string {
  const code =
    (c.mount?.toString() ?? "") +
    (c.update?.toString() ?? "") +
    (c.render?.toString() ?? "") +
    (c.handleEvent?.toString() ?? "");
  return crypto.createHash("sha1").update(code).digest("hex");
}
