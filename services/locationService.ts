import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import socketService from './socketService';
import authService from './authService';

// Nome da tarefa de rastreamento em segundo plano
export const BACKGROUND_LOCATION_TASK = 'background-location-task';

// Define o intervalo de atualização da localização (em milissegundos)
const LOCATION_TRACKING_INTERVAL = 15000; // 15 segundos

class LocationService {
  private isTracking: boolean = false;

  // Solicita permissões de localização
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
      
      if (foregroundStatus !== 'granted') {
        console.log('Permissão de localização em primeiro plano negada');
        return false;
      }

      // Permissão de segundo plano é necessária para rastrear quando o app está em segundo plano
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      
      if (backgroundStatus !== 'granted') {
        console.log('Permissão de localização em segundo plano negada');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao solicitar permissões de localização:', error);
      return false;
    }
  }

  // Inicia o rastreamento de localização
  async startLocationTracking(): Promise<boolean> {
    try {
      const hasPermissions = await this.requestPermissions();
      
      if (!hasPermissions) {
        return false;
      }

      // Verifica se já está rastreando
      if (this.isTracking) {
        console.log('Rastreamento de localização já está ativo');
        return true;
      }

      // Registra a tarefa de segundo plano se ainda não estiver registrada
      if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
        this.registerBackgroundTask();
      }

      // Inicia o rastreamento de localização
      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: LOCATION_TRACKING_INTERVAL,
        distanceInterval: 0, // Atualiza independentemente da distância
        deferredUpdatesInterval: LOCATION_TRACKING_INTERVAL,
        deferredUpdatesDistance: 0,
        showsBackgroundLocationIndicator: true,
        foregroundService: Platform.OS === 'android' ? {
          notificationTitle: 'Rastreamento ativo',
          notificationBody: 'Enviando sua localização para o servidor',
          notificationColor: '#3274e9',
        } : undefined,
      });

      this.isTracking = true;
      console.log('Rastreamento de localização iniciado');
      return true;
    } catch (error) {
      console.error('Erro ao iniciar rastreamento de localização:', error);
      return false;
    }
  }

  // Registra a tarefa de rastreamento em segundo plano
  private registerBackgroundTask() {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
      if (error) {
        console.error('Erro na tarefa de rastreamento:', error);
        return;
      }

      if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        const location = locations[0];
        
        if (location) {
          // Atualiza a localização no serviço de autenticação
          authService.atualizarLocalizacao(
            location.coords.latitude,
            location.coords.longitude
          );

          // Obtém o objeto do usuário atualizado
          const usuarioAtualizado = authService.getUsuarioAtualizado();

          if (usuarioAtualizado) {
            // Envia o objeto atualizado para o servidor
            socketService.enviarLocalizacao(usuarioAtualizado);
            console.log('Localização enviada:', usuarioAtualizado.localizacao);
          } else {
            console.log('Usuário não autenticado, não foi possível enviar localização');
          }
        }
      }
    });
  }

  // Para o rastreamento de localização
  async stopLocationTracking(): Promise<void> {
    try {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
      this.isTracking = false;
      console.log('Rastreamento de localização parado');
    } catch (error) {
      console.error('Erro ao parar rastreamento de localização:', error);
    }
  }

  // Verifica se o rastreamento está ativo
  isLocationTracking(): boolean {
    return this.isTracking;
  }
}

// Exporta uma instância única do serviço
export default new LocationService(); 