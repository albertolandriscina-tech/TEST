import { createContext, useContext } from 'react';
import { type DashboardPeriod, defaultDashboardPeriod } from '../../utils/period';

export const DashboardPeriodContext = createContext<DashboardPeriod>(defaultDashboardPeriod());

export function useDashboardPeriod(): DashboardPeriod {
  return useContext(DashboardPeriodContext);
}
