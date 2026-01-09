export const userDashboardTourSteps = [
  {
    element: '[data-tour="user.welcome"]',
    popover: {
      title: "Welcome to your Task Dashboard",
      description:
        "This quick tour shows where everything is. You can replay it anytime from Help (?).",
      side: "center",
      align: "center",
    },
  },
  {
    element: '[data-tour="user.metrics"]',
    popover: {
      title: "Overview metrics",
      description:
        "Completion rate, assigned and overdue counts update as you progress.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="user.search"]',
    popover: {
      title: "Search",
      description: "Find tasks by title or description.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="user.statusTabs"]',
    popover: {
      title: "Active status tabs",
      description: "Switch between All, Assigned and Overdue.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="user.filters"]',
    popover: {
      title: "Filters",
      description: "Refine by Type, Week, and Urgency. Use Clear all to reset.",
      side: "bottom",
    },
  },
  {
    element: '[data-tour="user.sectionToggle"]',
    popover: {
      title: "Active vs Completed",
      description: "Toggle to review completed items or keep working through active tasks.",
      side: "left",
    },
  },
  {
    element: '[data-tour="user.viewToggle"]',
    popover: {
      title: "Kanban or List",
      description: "Choose the layout that suits you best.",
      side: "left",
    },
  },
  {
    element: '[data-tour="user.taskCards"]',
    popover: {
      title: "Task cards",
      description: "Each card shows status and quick actions. Click a card for details.",
      side: "top",
    },
  },
  {
    element: '[data-tour="user.help"]',
    popover: {
      title: "Help and preferences",
      description: "Re-open the tour or control whether it auto-starts on this page.",
      side: "left",
    },
  },
]
