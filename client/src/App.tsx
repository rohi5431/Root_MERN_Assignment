import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { EmployeeDetailsPage } from './pages/EmployeeDetailsPage';
import { EmployeeEditPage } from './pages/EmployeeEditPage';
import { EmployeeNewPage } from './pages/EmployeeNewPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TasksPage } from './pages/TasksPage';
import { TaskNewPage } from './pages/TaskNewPage';
import { TaskDetailsPage } from './pages/TaskDetailsPage';
import { TaskEditPage } from './pages/TaskEditPage';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate replace to="/dashboard" />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/employees/new" element={<EmployeeNewPage />} />
        <Route path="/employees/:id/edit" element={<EmployeeEditPage />} />
        <Route path="/employees/:id" element={<EmployeeDetailsPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/new" element={<TaskNewPage />} />
        <Route path="/tasks/:id/edit" element={<TaskEditPage />} />
        <Route path="/tasks/:id" element={<TaskDetailsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
