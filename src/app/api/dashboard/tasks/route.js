import { completeStaffTask, getTasksWithCreator } from '@/lib/utils/dashboard/tasks';

export async function GET(req) {
  try {
    const tasks = await getTasksWithCreator();
    return new Response(JSON.stringify({ tasks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch tasks', details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}