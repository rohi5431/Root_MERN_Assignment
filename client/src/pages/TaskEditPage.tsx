import { RefreshCw } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TaskForm } from '../components/tasks/TaskForm';
import { PageHeader } from '../components/ui/PageHeader';
import { StatePanel } from '../components/ui/StatePanel';
import { useTask } from '../hooks/useTask';
import { updateTask, type TaskPayload } from '../services/taskService';

export function TaskEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { task, loading, error, notFound, retry } = useTask(id);

  async function handleUpdate(payload: TaskPayload) {
    if (!id) return;
    const updated = await updateTask(id, payload);
    toast.success('Task updated successfully.');
    navigate(`/tasks/${updated._id}`);
  }

  if (loading) {
    return (
      <StatePanel description="Loading the task details." title="Loading task" variant="loading" />
    );
  }
  if (notFound) {
    return (
      <StatePanel
        action={
          <Link className="text-sm font-medium text-accent hover:underline" to="/tasks">
            Back to Tasks
          </Link>
        }
        description="The task may have been removed or the address is incorrect."
        title="Task not found"
      />
    );
  }
  if (error || !task) {
    return (
      <StatePanel
        action={
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-primary-text hover:bg-secondary-background"
            onClick={retry}
            type="button"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Retry
          </button>
        }
        description={error ?? 'The task could not be loaded.'}
        title="Task could not be loaded"
        variant="error"
      />
    );
  }
  if (task.status === 'Completed' || task.status === 'Cancelled') {
    return (
      <StatePanel
        action={
          <Link
            className="inline-flex min-h-9 items-center rounded-lg bg-accent px-3 text-sm font-medium text-white hover:bg-blue-700"
            to={`/tasks/${task._id}`}
          >
            Back to task details
          </Link>
        }
        description={`${task.status} tasks are terminal and cannot be edited. Task status changes use the dedicated status workflow.`}
        title="This task cannot be edited"
      />
    );
  }

  return (
    <>
      <PageHeader title="Edit task" description={`Update the details for ${task.taskId}.`} />
      <TaskForm onSubmit={handleUpdate} submitLabel="Save changes" task={task} />
    </>
  );
}
