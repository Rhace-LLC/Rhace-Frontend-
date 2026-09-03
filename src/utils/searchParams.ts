import { useLocation } from 'react-router';

export function useSearchParams(): URLSearchParams {
  return new URLSearchParams(useLocation().search);
}
