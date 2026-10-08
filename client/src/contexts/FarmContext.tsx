import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { farmApi } from '../services/api';

interface FarmData {
  _id?: string;
  farmName: string;
  crop: string;
  cropStage: string;
  area: number;
  areaUnit: string;
  location: { city?: string; state?: string; district?: string };
  latitude?: number;
  longitude?: number;
  soilType?: string;
}

interface FarmContextType {
  farm: FarmData | null;
  loading: boolean;
  saveFarm: (data: Partial<FarmData>) => Promise<void>;
  refreshFarm: () => Promise<void>;
}

const FarmContext = createContext<FarmContextType>({
  farm: null,
  loading: false,
  saveFarm: async () => {},
  refreshFarm: async () => {},
});

export function FarmProvider({ children }: { children: ReactNode }) {
  const [farm, setFarm] = useState<FarmData | null>(() => {
    const saved = localStorage.getItem('kisanlens_farm');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const refreshFarm = async () => {
    try {
      setLoading(true);
      const res = await farmApi.get();
      if (res.data) {
        setFarm(res.data);
        localStorage.setItem('kisanlens_farm', JSON.stringify(res.data));
      }
    } catch {
      // Use local data
    } finally {
      setLoading(false);
    }
  };

  const saveFarm = async (data: Partial<FarmData>) => {
    try {
      setLoading(true);
      const updatedFarm = { ...farm, ...data } as FarmData;
      const res = farm?._id
        ? await farmApi.update(updatedFarm)
        : await farmApi.create(updatedFarm);
      setFarm(res.data);
      localStorage.setItem('kisanlens_farm', JSON.stringify(res.data));
    } catch {
      // Save locally even if server fails
      const updatedFarm = { ...farm, ...data } as FarmData;
      setFarm(updatedFarm);
      localStorage.setItem('kisanlens_farm', JSON.stringify(updatedFarm));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshFarm();
  }, []);

  return (
    <FarmContext.Provider value={{ farm, loading, saveFarm, refreshFarm }}>
      {children}
    </FarmContext.Provider>
  );
}

export const useFarm = () => useContext(FarmContext);
