import { getDashboardMetrics } from '../services/dashboardService.js';

export async function getDashboard(_request, response) {
  const metrics = await getDashboardMetrics();
  return response.status(200).json({ success: true, data: metrics });
}
