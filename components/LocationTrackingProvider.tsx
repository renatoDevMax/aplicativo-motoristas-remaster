import React, { createContext, useContext, useEffect, useState } from 'react';
import { useLocationTracker } from '../hooks/useLocationTracker';
import { Alert } from 'react-native';

interface LocationTrackingContextType {
  isTracking: boolean;
  hasPermissions: boolean;
  requestPermissions: () => Promise<boolean>;
  startTracking: () => Promise<boolean>;
  stopTracking: () => Promise<boolean>;
}

const LocationTrackingContext = createContext<LocationTrackingContextType | null>(null);

export const useLocationTracking = () => {
  const context = useContext(LocationTrackingContext);
  if (!context) {
    throw new Error('useLocationTracking deve ser usado dentro de LocationTrackingProvider');
  }
  return context;
};

interface LocationTrackingProviderProps {
  children: React.ReactNode;
  autoStart?: boolean;
}

export const LocationTrackingProvider: React.FC<LocationTrackingProviderProps> = ({
  children,
  autoStart = false,
}) => {
  const tracker = useLocationTracker();
  const [initialized, setInitialized] = useState(false);

  // Inicializa o rastreamento no primeiro carregamento (se autoStart for true)
  useEffect(() => {
    const initialize = async () => {
      if (!initialized) {
        const hasPermissions = await tracker.requestPermissions();
        
        if (hasPermissions && autoStart) {
          await tracker.startTracking();
        } else if (autoStart && !hasPermissions) {
          Alert.alert(
            'Permissões necessárias',
            'Para o rastreamento funcionar corretamente, você precisa conceder permissões de localização.'
          );
        }
        
        setInitialized(true);
      }
    };

    initialize();
  }, [initialized, autoStart]);

  return (
    <LocationTrackingContext.Provider value={tracker}>
      {children}
    </LocationTrackingContext.Provider>
  );
}; 