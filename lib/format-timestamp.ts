export function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isSameYear = date.getFullYear() === now.getFullYear();

  const timeString = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) {
    return timeString;
  }

  const dateString = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  if (isSameYear) {
    return `${dateString}, ${timeString}`;
  }

  const yearString = date.getFullYear();
  return `${dateString} ${yearString}, ${timeString}`;
}
