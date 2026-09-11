import React from 'react';
import { Text } from 'react-native';
import TestRenderer from 'react-test-renderer';
import { ReportThemeProvider, useReportAccent } from './ReportThemeProvider';
import { Colors } from '../../design/colors';

// A probe that renders whatever accent the hook hands it, so a test can read
// the resolved colour straight off the tree.
const Probe: React.FC<{ fallback: string }> = ({ fallback }) => <Text>{useReportAccent(fallback)}</Text>;

const accentOf = (element: React.ReactElement) => {
  let r!: TestRenderer.ReactTestRenderer;
  TestRenderer.act(() => { r = TestRenderer.create(element); });
  return r.root.findByType(Text).props.children as string;
};

// The accent is the report type's own text colour — the one its list tile,
// R.A. pill and header edge already use — so a form themed by it reads as
// the same kind of report everywhere. Outside a report screen there is no
// type to take it from, and each consumer keeps the colour it always had.
describe('useReportAccent', () => {
  it('hands back the fallback outside any provider', () => {
    expect(accentOf(<Probe fallback={Colors.navy} />)).toBe(Colors.navy);
  });

  it("hands back the report type's text colour inside a provider", () => {
    expect(
      accentOf(
        <ReportThemeProvider reportType="water_monitoring">
          <Probe fallback={Colors.navy} />
        </ReportThemeProvider>,
      ),
    ).toBe(Colors.water.text);
  });

  it('themes each type with its own colour, not a shared one', () => {
    const water = accentOf(
      <ReportThemeProvider reportType="water_monitoring"><Probe fallback={Colors.navy} /></ReportThemeProvider>,
    );
    const eia = accentOf(
      <ReportThemeProvider reportType="eia"><Probe fallback={Colors.navy} /></ReportThemeProvider>,
    );
    expect(water).toBe(Colors.water.text);
    expect(eia).toBe(Colors.eia.text);
    expect(water).not.toBe(eia);
  });

  // A report written by a newer build with a type this one doesn't know
  // must still render — with the consumer's own default, not a crash.
  it('hands back the fallback for a type it does not recognise', () => {
    expect(
      accentOf(
        <ReportThemeProvider reportType="noise_monitoring">
          <Probe fallback={Colors.green} />
        </ReportThemeProvider>,
      ),
    ).toBe(Colors.green);
  });
});
