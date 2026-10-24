/**
 * parse_request_error
 *
 * Extracts a human-readable error message from unpredictable API error shapes.
 *
 * Handles:
 * - Axios-style errors: err.response.data.{message, error, errors, msg}
 * - Plain Error: err.message
 * - Nested objects (recursively searches for string message-like values)
 * - Arrays of error objects / strings
 * - Fallback default message
 */
export function parseRequestError(
  error: unknown,
  fallback = 'An unexpected error occurred.',
): string {
  if (error == null) {
    return fallback;
  }

  // Axios / fetch-style response payload
  const responseData = extractResponseData(error);

  const candidates: unknown[] = [];

  if (responseData != null) {
    candidates.push(responseData);
  }

  // Plain Error / thrown value
  if (typeof error === 'object' && 'message' in error) {
    candidates.push((error as { message?: unknown }).message);
  }

  // If it's a string itself
  if (typeof error === 'string') {
    candidates.push(error);
  }

  const extract = (value: unknown): string | null => {
    if (value == null) return null;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        const msg = extract(item);
        if (msg) return msg;
      }
      return null;
    }

    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;

      // Common message field names, checked in priority order
      const messageKeys = [
        'message',
        'msg',
        'error',
        'errors',
        'detail',
        'description',
        'title',
      ];

      for (const key of messageKeys) {
        if (key in obj && obj[key] != null) {
          const extracted = extract(obj[key]);
          if (extracted) return extracted;
        }
      }

      // Recursively search remaining values (multi-nested)
      for (const key of Object.keys(obj)) {
        if (messageKeys.includes(key)) continue;
        const extracted = extract(obj[key]);
        if (extracted) return extracted;
      }
    }

    return null;
  };

  for (const candidate of candidates) {
    const message = extract(candidate);
    if (message) return message;
  }

  return fallback;
}

function extractResponseData(error: unknown): unknown {
  if (
    error != null &&
    typeof error === 'object' &&
    'response' in error
  ) {
    const response = (error as { response?: unknown }).response;
    if (response != null && typeof response === 'object' && 'data' in response) {
      return (response as { data?: unknown }).data;
    }
  }
  return undefined;
}
