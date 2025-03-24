import { useEffect, useState } from 'react';
import locationService from '../services/locationService';
import socketService from '../services/socketService';
import { Alert, AppState, AppStateStatus } from 'react-native';

export const useLocationTracker = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);

  // Solicita permissões de localização
  const requestPermissions = async () => {
    const granted = await locationService.requestPermissions();
    setHasPermissions(granted);
    return granted;
  };

  // Inicia o rastreamento de localização
  const startTracking = async () => {
    try {
      // Conecta o socket
      socketService.connect();

      // Inicia o rastreamento
      const started = await locationService.startLocationTracking();
      setIsTracking(started);
      return started;
    } catch (error) {
      console.error('Erro ao iniciar rastreamento:', error);
      Alert.alert(
        'Erro',
        'Não foi possível iniciar o rastreamento de localização. Tente novamente.'
      );
      return false;
    }
  };

  // Para o rastreamento de localização
  const stopTracking = async () => {
    try {
      await locationService.stopLocationTracking();
      setIsTracking(false);
      return true;
    } catch (error) {
      console.error('Erro ao parar rastreamento:', error);
      return false;
    }
  };

  // Monitora as mudanças de estado do aplicativo
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      // Quando o aplicativo volta ao primeiro plano
      if (nextAppState === 'active' && isTracking) {
        // Reconecta o socket se necessário
        socketService.connect();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isTracking]);

  // Limpa recursos quando o componente é desmontado
  useEffect(() => {
    return () => {
      // Não para o rastreamento ao desmontar o componente,
      // apenas desconecta o socket se necessário
    };
  }, []);

  return {
    isTracking,
    hasPermissions,
    requestPermissions,
    startTracking,
    stopTracking,
  };
}; 