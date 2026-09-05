// Browsing screens get the create-report FAB; form screens don't, because it
// would sit on top of their own bottom action bars. Matched against the
// resolved path, not the route pattern — /establishment/edit is a form, every
// other /establishment/<id> is a detail screen.
//
// Its own module rather than living in the layout: this is a pure predicate,
// and importing the layout to test it would pull in the router, the auth
// provider and the sync orchestrator.
export function isFabRoute(pathname: string): boolean {
  if (pathname === '/home') return true;
  return /^\/establishment\/(?!edit$)[^/]+$/.test(pathname);
}
