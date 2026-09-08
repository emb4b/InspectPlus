// Browsing screens get the create-report FAB; form screens don't, because it
// would sit on top of their own bottom action bars. Every /establishment/<id>
// is a detail screen — establishment editing lives on that same screen as
// per-section edits now, not a separate /establishment/edit form route.
//
// Its own module rather than living in the layout: this is a pure predicate,
// and importing the layout to test it would pull in the router, the auth
// provider and the sync orchestrator.
export function isFabRoute(pathname: string): boolean {
  if (pathname === '/home') return true;
  return /^\/establishment\/[^/]+$/.test(pathname);
}
