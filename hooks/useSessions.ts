import { useState, useEffect, useCallback, useRef } from 'react';
import { Session } from '@/types/session';
import { SessionManager } from '@/lib/session-management';

export function useSessions(academyId: string) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 3;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadingRef = useRef(false);

  const fetchSessions = useCallback(async (forceRefresh = false, newPage = 1) => {
    try {
      if (!academyId) return;

      // Set loading state
      setIsLoading(true);
      
      // Try cache first unless force refresh
      if (!forceRefresh) {
        const cached = SessionManager.getCache();
        if (cached?.length > 0) {
          setSessions(cached);
          setIsLoading(false);
          return;
        }
      }

      // Fetch from API with retry logic
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const response = await fetch(
            `/api/db/ams-sessions?academyId=${encodeURIComponent(academyId)}&page=${newPage}&limit=50`,
            {
              headers: {
                'Cache-Control': 'no-store',
                'Pragma': 'no-cache'
              },
              next: { revalidate: 0 }
            }
          );

          if (!response.ok) throw new Error('Failed to fetch sessions');

          const result = await response.json();
          
          if (result.success && Array.isArray(result.data)) {
            const newSessions = result.data;
            setSessions(prev => 
              newPage === 1 ? newSessions : [...prev, ...newSessions]
            );
            
            // Only cache on initial load
            if (newPage === 1) {
              SessionManager.setCache(newSessions);
            }
            
            setHasMore(newSessions.length === 50);
            setPage(newPage);
            setLastUpdate(Date.now());
            break;
          }
        } catch (error) {
          attempts++;
          if (attempts === maxAttempts) throw error;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }

    } catch (error) {
      console.error('Error fetching sessions:', error);
      // Use cached data as fallback
      const cached = SessionManager.getCache();
      if (cached?.length > 0) {
        setSessions(cached);
      }
      setError(error as Error);
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [academyId]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingRef.current) return;
    fetchSessions(false, page + 1);
  }, [fetchSessions, hasMore, page]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    
    const loadInitialData = async () => {
      if (!academyId) return;
      
      if (mounted) {
        await fetchSessions(true, 1);
      }
    };

    loadInitialData();

    // Setup polling
    const pollInterval = setInterval(() => {
      if (mounted && !loadingRef.current) {
        fetchSessions(true, 1);
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      mounted = false;
      clearInterval(pollInterval);
    };
  }, [academyId, fetchSessions]);

  // Auto-refresh on focus
  useEffect(() => {
    const handleFocus = () => {
      if (document.hasFocus()) {
        fetchSessions(true, 1);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchSessions]);

  return { 
    sessions, 
    isLoading, 
    error, 
    lastUpdate, 
    hasMore,
    loadMore,
    refetch: () => fetchSessions(true, 1)
  };
}
