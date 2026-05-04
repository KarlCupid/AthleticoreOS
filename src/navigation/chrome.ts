const TAB_BAR_HIDDEN_ROUTE_NAMES = new Set(['GuidedWorkout', 'WorkoutSummary']);

export function shouldHideBottomNavForFocusedRouteName(routeName: string | undefined): boolean {
  return routeName ? TAB_BAR_HIDDEN_ROUTE_NAMES.has(routeName) : false;
}
