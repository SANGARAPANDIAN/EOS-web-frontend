/** Fired by the API client on a 401 so AuthProvider can react without a hard import cycle. */
export const authEvents = new EventTarget();

export const UNAUTHORIZED_EVENT = "unauthorized";

export function emitUnauthorized(): void {
  authEvents.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
}
