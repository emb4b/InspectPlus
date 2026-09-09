import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import TestRenderer from 'react-test-renderer';
import { InspectionReportHeader } from './InspectionReportHeader';
import { Colors } from '../../../design/colors';
import type { TwoRowMainTabDef } from './TwoRowTabs';

// The header reaches the WatermelonDB adapter chain three ways — the sync
// conflict pill, the delete gate's role lookup, and the inspector-name
// resolver — none of which this file is testing. Same rationale as
// ReportListCard.test.tsx.
jest.mock('../../../db/database', () => ({ database: {}, collections: {} }));
// AuthProvider transitively constructs the real Supabase client at import
// time, which throws without a configured URL. Mocked with a factory rather
// than an automock: an automock still loads the module to derive its shape,
// so it throws just the same.
jest.mock('../../../core/providers/AuthProvider', () => ({
  useAuthContext: () => ({ fullName: 'Inspector One', session: { user: { id: 'uid-1' } }, role: 'Inspector' }),
}));
jest.mock('../../../services/sync/syncConflictResolution', () => ({
  confirmResolveConflict: jest.fn(),
}));
jest.mock('../../../core/hooks/useInspectorName', () => ({
  useInspectorName: () => ({ name: 'Inspector One', loading: false }),
}));
jest.mock('../../establishments/hooks/useEstablishment', () => ({
  canManageAllRecords: () => false,
}));

type Renderer = TestRenderer.ReactTestRenderer;

const render = (element: React.ReactElement) => {
  let r!: Renderer;
  TestRenderer.act(() => { r = TestRenderer.create(element); });
  return r;
};

const flattenStyle = (style: unknown): Record<string, unknown> =>
  Object.assign({}, ...([style].flat(Infinity).filter(Boolean) as Record<string, unknown>[]));

const iconGlyphTexts = (r: Renderer): Set<TestRenderer.ReactTestInstance> =>
  new Set(r.root.findAllByType(Ionicons).flatMap((icon) => icon.findAllByType(Text)));

const proseTexts = (r: Renderer) =>
  r.root.findAllByType(Text).filter((n) => !iconGlyphTexts(r).has(n));

const labels = (r: Renderer) => proseTexts(r).map((n) => n.props.children);

const tabs: TwoRowMainTabDef[] = [{ key: 'general', number: 'I', label: 'General' }];

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

const noop = () => {};

const renderHeader = (overrides: { inspectionDate?: string; reportStatus?: string } = {}) =>
  render(
    <InspectionReportHeader
      reportId="report-1"
      establishmentName="NELTEX Philippine Hardwarehouse Co., Inc."
      establishmentLocation="Aborlan, Palawan"
      reportType="water_monitoring"
      reportControlNo="CTRL-1"
      inspectionDate={overrides.inspectionDate ?? daysAgo(2)}
      reportStatus={overrides.reportStatus ?? 'draft'}
      syncStatus="synced"
      inspectorUid="uid-1"
      tabs={tabs}
      activeMain="general"
      onMainChange={noop}
      onBack={noop}
    />,
  );

// A single report has no count to give, so this screen carries the state
// instead — and in the same words as the corner ribbon its card wears in the
// list, so the report does not read as two different things in two places.
describe('InspectionReportHeader due indicator', () => {
  const findUrgencyChip = (r: Renderer) => {
    const views = r.root.findAll((n) => (n.type as any)?.name === 'View' || n.type === View);
    const matches = views.filter(
      (n) =>
        typeof n.props.accessibilityLabel === 'string' &&
        /^(Overdue|Due in)/.test(n.props.accessibilityLabel),
    );
    if (matches.length > 1) {
      throw new Error(`Expected at most 1 urgency chip but found ${matches.length}`);
    }
    return matches[0];
  };

  it('shows nothing for a draft that is not flagged yet', () => {
    const r = renderHeader({ inspectionDate: daysAgo(2) });
    expect(findUrgencyChip(r)).toBeUndefined();
  });

  it('shows nothing for a submitted report, however old', () => {
    const r = renderHeader({ inspectionDate: daysAgo(400), reportStatus: 'submitted' });
    expect(findUrgencyChip(r)).toBeUndefined();
  });

  it('carries the overdue state in the ribbon\'s own wording', () => {
    const r = renderHeader({ inspectionDate: daysAgo(45) });
    const chip = findUrgencyChip(r);

    expect(flattenStyle(chip.props.style).backgroundColor).toBe(Colors.hazwaste.badgeBg);
    expect(chip.props.accessibilityLabel).toBe('Overdue by 15 days');
    expect(labels(r)).toContain('15d late');
  });

  it('carries the due-soon state in the ribbon\'s own wording', () => {
    const r = renderHeader({ inspectionDate: daysAgo(15) });
    const chip = findUrgencyChip(r);

    expect(flattenStyle(chip.props.style).backgroundColor).toBe(Colors.warning.badgeBg);
    expect(chip.props.accessibilityLabel).toBe('Due in 15 days');
    expect(labels(r)).toContain('15d left');
  });

  // The Draft/Submitted chip says where the report stands with filing; the
  // urgency chip says how that is going against the clock. They are different
  // facts and both belong.
  it('sits beside the Draft chip rather than replacing it', () => {
    const r = renderHeader({ inspectionDate: daysAgo(45) });
    expect(labels(r)).toContain('Draft');
    expect(labels(r)).toContain('15d late');
  });
});
