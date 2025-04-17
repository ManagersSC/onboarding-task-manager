import { useEffect, useState } from 'react';

export function useDebounce(callback, delay) {
  const [args, setArgs] = useState(null);

  useEffect(() => {
    if (args === null) return;
    const handler = setTimeout(() => callback(...args), delay);
    return () => clearTimeout(handler);
  }, [args, delay, callback]);

  return (...args) => setArgs(args);
}