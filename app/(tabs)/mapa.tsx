import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import authService, { Usuario } from '@/services/authService';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Criar versão animada após ThemedView ter sido atualizado com forwardRef
const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);
const { width, height } = Dimensions.get('window');

const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "elementType": "labels.icon",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [
      {
        "color": "#f5f5f5"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "administrative.land_parcel",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#bdbdbd"
      }
    ]
  },
  {
    "featureType": "administrative.neighborhood",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#ffffff"
      }
    ]
  },
  {
    "featureType": "road",
    "elementType": "labels",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "road.arterial",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#757575"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#dadada"
      }
    ]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#616161"
      }
    ]
  },
  {
    "featureType": "road.local",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  },
  {
    "featureType": "transit.line",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#e5e5e5"
      }
    ]
  },
  {
    "featureType": "transit.station",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#eeeeee"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [
      {
        "color": "#c9c9c9"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text",
    "stylers": [
      {
        "visibility": "off"
      }
    ]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [
      {
        "color": "#9e9e9e"
      }
    ]
  }
];

export default function MapaScreen() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mapRef = useRef<MapView>(null);
  const infoExpanded = useSharedValue(0);
  
  // Estilo animado para o painel de informações
  const infoAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: withSpring(infoExpanded.value ? 0 : 100) }],
      opacity: withSpring(infoExpanded.value ? 1 : 0.5),
    };
  });

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const usuarioAutenticado = authService.getUsuario();
    
    if (!usuarioAutenticado) {
      setErrorMsg('Usuário não autenticado');
      setCarregando(false);
      return;
    }
    
    setUsuario(usuarioAutenticado);
    setCarregando(false);
    
    // Mostrar o painel de informações após 500ms
    setTimeout(() => {
      infoExpanded.value = 1;
    }, 500);
    
    // Atualizar os dados do usuário a cada segundo
    const intervalId = setInterval(() => {
      const usuarioAtualizado = authService.getUsuarioAtualizado();
      if (usuarioAtualizado) {
        setUsuario(usuarioAtualizado);
        
        // Centralizar mapa na posição do usuário
        if (mapRef.current && usuarioAtualizado.localizacao) {
          mapRef.current.animateToRegion({
            latitude: usuarioAtualizado.localizacao.latitude,
            longitude: usuarioAtualizado.localizacao.longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 1000);
        }
      }
    }, 5000); // Atualizar a cada 5 segundos para não sobrecarregar a animação
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const centralizarMapa = () => {
    if (usuario && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: usuario.localizacao.latitude,
        longitude: usuario.localizacao.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 500);
    }
  };

  if (carregando) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3274e9" />
        <ThemedText style={styles.loadingText}>Carregando mapa...</ThemedText>
      </ThemedView>
    );
  }

  if (errorMsg) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#e53935" />
        <ThemedText style={styles.errorText}>{errorMsg}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Cabeçalho */}
      <AnimatedThemedView 
        entering={FadeIn.delay(200).springify()}
        style={styles.headerContainer}
      >
        <ThemedText style={styles.headerTitle}>Localização Atual</ThemedText>
      </AnimatedThemedView>

      {/* Mapa */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        customMapStyle={mapStyle}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={false}
        showsTraffic={false}
        showsIndoors={false}
        initialRegion={{
          latitude: usuario?.localizacao.latitude || -23.550520,
          longitude: usuario?.localizacao.longitude || -46.633308,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
      >
        {usuario && (
          <Marker
            coordinate={{
              latitude: usuario.localizacao.latitude,
              longitude: usuario.localizacao.longitude,
            }}
            title={usuario.userName}
            description="Sua localização atual"
          >
            <ThemedView style={styles.markerContainer}>
              <ThemedView style={styles.markerInner}>
                <Ionicons name="person" size={16} color="#fff" />
              </ThemedView>
              <ThemedView style={styles.markerTriangle} />
            </ThemedView>
          </Marker>
        )}
      </MapView>
      
      {/* Botão de centralizar mapa */}
      <TouchableOpacity style={styles.centerButton} onPress={centralizarMapa}>
        <Ionicons name="locate" size={24} color="#3274e9" />
      </TouchableOpacity>
      
      {/* Painel de informações */}
      <Animated.View style={[styles.infoPanel, infoAnimatedStyle]}>
        {usuario && (
          <>
            <ThemedView style={styles.infoPanelHeader}>
              <ThemedText style={styles.infoPanelTitle}>Detalhes da Localização</ThemedText>
            </ThemedView>
            
            <ThemedView style={styles.infoPanelContent}>
              <ThemedView style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Latitude:</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {usuario.localizacao.latitude.toFixed(6)}
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Longitude:</ThemedText>
                <ThemedText style={styles.infoValue}>
                  {usuario.localizacao.longitude.toFixed(6)}
                </ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Motorista:</ThemedText>
                <ThemedText style={styles.infoValue}>{usuario.userName}</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Status:</ThemedText>
                <ThemedView style={styles.statusBadge}>
                  <ThemedText style={styles.statusText}>{usuario.status}</ThemedText>
                </ThemedView>
              </ThemedView>
            </ThemedView>
          </>
        )}
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
    color: '#e53935',
  },
  headerContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  map: {
    width,
    height,
  },
  centerButton: {
    position: 'absolute',
    bottom: 220,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 30,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerInner: {
    backgroundColor: '#3274e9',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  markerTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#3274e9',
    transform: [{ rotate: '180deg' }],
    marginTop: -2,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
    paddingBottom: 30, // Para compensar a barra de navegação
  },
  infoPanelHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoPanelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
  infoPanelContent: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 