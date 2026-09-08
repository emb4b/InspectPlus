import { isFabRoute } from './fabRoute';

describe('isFabRoute', () => {
  it('shows the FAB on home', () => {
    expect(isFabRoute('/home')).toBe(true);
  });

  it('shows the FAB on an establishment detail screen', () => {
    expect(isFabRoute('/establishment/abc-123')).toBe(true);
  });

  it('hides the FAB on inspection forms, new and existing', () => {
    expect(isFabRoute('/inspection/new')).toBe(false);
    expect(isFabRoute('/inspection/some-id')).toBe(false);
  });

  it('hides the FAB on survey and report forms', () => {
    expect(isFabRoute('/survey/new')).toBe(false);
    expect(isFabRoute('/report/new')).toBe(false);
  });

  it('hides the FAB on an unknown path', () => {
    expect(isFabRoute('/settings')).toBe(false);
  });

  // Anything with more path segments past the id is not a detail screen at
  // all, so it must not slip through as a false positive.
  it('does not treat a nested path under an establishment id as a detail screen', () => {
    expect(isFabRoute('/establishment/abc-123/edit')).toBe(false);
  });

  it('does not match a bare /establishment with no id segment', () => {
    expect(isFabRoute('/establishment')).toBe(false);
    expect(isFabRoute('/establishment/')).toBe(false);
  });
});
