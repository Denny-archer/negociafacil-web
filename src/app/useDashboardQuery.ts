import { useEffect, useState } from 'react';
import { dashboardRepository, SOURCE_DATE } from '../domain';
import type { QueryContext } from '../domain';

const scenarios = ['available', 'error', 'denied', 'pending', 'empty', 'partial', 'stale'] as const;
type Scenario = typeof scenarios[number];

function readScenario(): Scenario {
  const scenario = new URLSearchParams(window.location.search).get('scenario');
  return scenarios.find((value) => value === scenario) ?? 'available';
}

export function useDashboardQuery(context: QueryContext) {
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [dataBase, setDataBase] = useState(SOURCE_DATE);
  const [scenario, setScenario] = useState(readScenario);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    void dashboardRepository
      .getSnapshot(context)
      .then((snapshot) => {
        if (!active) return;
        if (scenario === 'error') {
          setError(true);
          return;
        }
        setDataBase(snapshot.dataBase);
        setLoaded(true);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [context, attempt, scenario]);

  function reload() {
    setAttempt((value) => value + 1);
  }

  function retry() {
    setScenario('available');
    reload();
    const url = new URL(window.location.href);
    url.searchParams.delete('scenario');
    window.history.replaceState(null, '', url);
  }
  const { filters } = context;
  const invalidPeriod = !!(filters.from && filters.to && filters.from > filters.to);
  const unavailable = scenario === 'denied' || scenario === 'pending' || scenario === 'empty';
  const allowContent = loaded && !invalidPeriod && !unavailable;

  return {
    loading,
    loaded,
    error,
    dataBase,
    scenario,
    invalidPeriod,
    unavailable,
    allowContent,
    reload,
    retry,
  };
}

export type DashboardQuery = ReturnType<typeof useDashboardQuery>;
