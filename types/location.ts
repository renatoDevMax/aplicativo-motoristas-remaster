// Interface para representar as coordenadas de localização
export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

// Interface para representar os dados de localização enviados ao servidor
export interface LocationData {
  coordinates: LocationCoordinates;
  timestamp: number;
  driverId?: string; // ID do motorista (opcional)
  deviceInfo?: {
    platform: string;
    version: string;
    model?: string;
  };
}

// Interface para representar o status do serviço de rastreamento
export interface TrackingStatus {
  isTracking: boolean;
  lastUpdated: number | null;
  hasPermissions: boolean;
  errorMessage?: string;
} 