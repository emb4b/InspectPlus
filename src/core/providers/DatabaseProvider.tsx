import React from 'react';
import { DatabaseProvider as WatermelonDBProvider } from '@nozbe/watermelondb/react';
import { database } from '../../db/database';

// ── DatabaseProvider ──────────────────────────────────────────────────────────
// Wraps the app with WatermelonDB's React context so any component can
// access the database via useDatabase() or withDatabase() HOC.
// Must be mounted INSIDE AuthProvider (so auth is ready first) but
// OUTSIDE any screen components that query the DB.
// ─────────────────────────────────────────────────────────────────────────────

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export const DatabaseProvider: React.FC<DatabaseProviderProps> = ({
  children,
}) => {
  return (
    <WatermelonDBProvider database={database}>
      {children}
    </WatermelonDBProvider>
  );
};
