/**
 * Socket.io uses this `ExtendedError` type for passing errors through the `next` 
 * function in Socket.io middlewares, but Socket.io doesn't export that type when 
 * they should be.
 */
export default interface SocketExtendedError extends Error {
  data: { name: string; ERROR: string; status: string };
}
