export function getTrackerRoutingKey(trackerId: string) {
  return `tracker.${trackerId}.notification.respond`;
}
