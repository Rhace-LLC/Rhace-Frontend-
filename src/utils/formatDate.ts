export function formatCustomDate(dateString: string | Date): string {
  const date = new Date(dateString);

  // Format time like "8:00 AM"
  const time = date
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase(); // to make "am" lowercase

  // Format date like "May 28, 2025"
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `${time}. ${formattedDate}`;
}

export function formatCustomDateTime(dateString: string | Date): string {
  const date = new Date(dateString);

  // Format time like "8:00 AM"
  const time = date
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase(); // to make "am" lowercase

  // Format date like "May 28, 2025"
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `${formattedDate}. ${time}`;
}

export function formatTime(dateString: string | Date): string {
  const date = new Date(dateString);
  const time = date
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase(); //
  return time;
}

export function formatDate(dateString: string | Date): string {
  const date = new Date(dateString);

  // Format date like "May 28, 2025"
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `${formattedDate}`;
}
