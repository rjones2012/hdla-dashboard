'use client';

import { useState, useEffect } from 'react';

export function useData(type, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { office, refreshInterval } = options;

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ type });
      if (office) params.set('office', office);

      const response = await fetch(`/api/data?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.details || result.error);
      }

      setData(result);
    } catch (err) {
      console.error('Data fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    if (refreshInterval) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [type, office]);

  return { data, loading, error, refetch: fetchData };
}

export function useExecutiveData() {
  return useData('executive', { refreshInterval: 5 * 60 * 1000 });
}

export function usePipelineData() {
  return useData('pipeline', { refreshInterval: 5 * 60 * 1000 });
}

export function useCapacityData() {
  return useData('capacity', { refreshInterval: 5 * 60 * 1000 });
}

export function useMarketingData(office = null) {
  return useData('marketing', { office, refreshInterval: 5 * 60 * 1000 });
}

export function useTrendsData() {
  return useData('trends', { refreshInterval: 5 * 60 * 1000 });
}
