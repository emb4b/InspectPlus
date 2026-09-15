import React, { createContext, useContext, useMemo } from 'react';
import { REPORT_TYPE_DISPLAY, ReportDataKey } from '../../constants/reportTypeDisplay';

interface ReportTheme {
  // The report type's own text colour - the one its list tile, R.A. pill
  // and header edge already use - so anything themed by it reads as the
  // same kind of report everywhere.
  accent: string;
}

const ReportThemeContext = createContext<ReportTheme | null>(null);

// Provided once by each screen that knows its report type (the detail
// screen, the create form). A context rather than a prop because the two
// consumers - FormSection and TwoRowTabs - sit under ~70 call sites between
// them, none of which should have to know a colour to pass one along.
//
// Only identity is themed, never function: section icons and the active
// tab take the accent; Save, Edit, links and everything an inspector taps
// stay brand green so they look the same on every form.
export const ReportThemeProvider: React.FC<{ reportType: string; children: React.ReactNode }> = ({
  reportType,
  children,
}) => {
  const value = useMemo<ReportTheme | null>(() => {
    // An unrecognised type - a report written by a newer build - provides
    // nothing, and every consumer falls back to its own default.
    const meta = REPORT_TYPE_DISPLAY[reportType as ReportDataKey];
    return meta ? { accent: meta.textColor } : null;
  }, [reportType]);
  return <ReportThemeContext.Provider value={value}>{children}</ReportThemeContext.Provider>;
};

// The accent when a report screen provides one, else the colour the caller
// always used - so off a report screen nothing changes.
export function useReportAccent(fallback: string): string {
  return useContext(ReportThemeContext)?.accent ?? fallback;
}
