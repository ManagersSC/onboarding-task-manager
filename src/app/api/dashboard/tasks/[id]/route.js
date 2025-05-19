import { completeStaffTask } from "@/lib/utils/dashboard/tasks";

export async function PATCH(req, { params }){
  const p = await params;
  const { action } = await req.json();
  const { id } = p;

  switch (action){
    case "complete":
      await completeStaffTask(id);
      break;
    case "block":
      break;
    case "delete":
      break;
    default:
      return new Response(JSON.stringify({ error: "Invalid action" }), {status: 400});
  }
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
  