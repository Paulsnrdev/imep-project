import { useEffect, useRef } from 'react';

const usePolling = (fetchFn, intervalMs = 30000, enabled = true) => {
  const savedFn = useRef(fetchFn);

  useEffect(() => {
    savedFn.current = fetchFn;
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) return;

    savedFn.current();

    const id = setInterval(() => {
      if (!document.hidden) {
        savedFn.current();
      }
    }, intervalMs);

    const onVisibilityChange = () => {
      if (!document.hidden) savedFn.current();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [intervalMs, enabled]);
};

export default usePolling;
