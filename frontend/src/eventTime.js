export function eventIsComplete(event) {
  return Boolean(event?.end_time && new Date(event.end_time).getTime() <= Date.now());
}
