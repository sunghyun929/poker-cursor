// Keep-alive hook to prevent Render service from sleeping
import { useEffect, useRef } from 'react';

export function useKeepAlive() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Ping server every 5 minutes to keep it awake
    intervalRef.current = setInterval(async () => {
      try {
        await fetch('/keep-alive', { 
          method: 'GET',
          keepalive: true,
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        console.log('Keep-alive ping sent');
      } catch (error) {
        console.error('Keep-alive failed:', error);
      }
    }, 5 * 60 * 1000); // 5분마다

    // 초기 ping
    fetch('/keep-alive').catch(console.error);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null;
}
