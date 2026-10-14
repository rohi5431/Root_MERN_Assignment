import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { TaskForm } from '../components/tasks/TaskForm';
import { PageHeader } from '../components/ui/PageHeader';
import { createTask, type TaskPayload } from '../services/taskService';

export function TaskNewPage() {
  const navigate = useNavigate();

  async function handleCreate(payload: TaskPayload) {
    const task = await createTask(payload);
    toast.success('Task created successfully.');
    navigate(`/tasks/${task._id}`);
  }

  return (
    <>
      <PageHeader
        title="Add task"
        description="Create a task and assign it to an eligible employee."
      />
      <TaskForm onSubmit={handleCreate} submitLabel="Create task" />
    </>
  );
}
