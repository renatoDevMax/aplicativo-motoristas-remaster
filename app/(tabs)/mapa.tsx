import React, { useEffect, useState } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { WebView } from 'react-native-webview';
import socketService from '@/services/socketService';
import entregasService from '@/services/entregasService';
import { entregasTipo } from '@/types/entregaType';
import authService from '@/services/authService';
import { useLocalSearchParams } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function MapaScreen() {
  const [entregas, setEntregas] = useState<entregasTipo[]>([]);
  const [usuario, setUsuario] = useState<string>('');
  const params = useLocalSearchParams();
  const { latitude, longitude, zoom } = params;

  useEffect(() => {
    // Obter usuário autenticado
    const usuarioAutenticado = authService.getUsuario();
    if (usuarioAutenticado) {
      setUsuario(usuarioAutenticado.userName);
    }

    // Obter entregas iniciais
    const entregasIniciais = entregasService.getEntregas();
    console.log('Entregas iniciais:', entregasIniciais);
    setEntregas(entregasIniciais);

    // Configurar listener para atualizações de entregas
    const handleEntregasAtualizadas = (entregasAtualizadas: entregasTipo[]) => {
      console.log('Entregas atualizadas:', entregasAtualizadas);
      setEntregas(entregasAtualizadas);
    };

    socketService.on('Entregas do Dia', handleEntregasAtualizadas);

    return () => {
      socketService.off('Entregas do Dia', handleEntregasAtualizadas);
    };
  }, []);

  // HTML básico para o mapa Leaflet
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          .delivery-icon {
            background-color: #3274e9;
            border-radius: 50%;
            padding: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .delivery-icon svg {
            width: 16px;
            height: 16px;
            fill: white;
            display: block;
            margin: auto;
          }
          .custom-popup {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 0;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            overflow: hidden;
          }
          .custom-popup .leaflet-popup-content-wrapper {
            background: white;
            padding: 0;
            border-radius: 12px;
            box-shadow: none;
          }
          .custom-popup .leaflet-popup-content {
            margin: 0;
            width: 280px;
          }
          .custom-popup .leaflet-popup-tip {
            background: white;
          }
          .popup-header {
            background: linear-gradient(135deg, #3274e9, #1a5bb8);
            padding: 16px;
            color: white;
            font-size: 18px;
            font-weight: 600;
            text-align: center;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .popup-content {
            padding: 16px;
            text-align: center;
          }
          .popup-button {
            background: #3274e9;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin: 0 auto;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(50,116,233,0.3);
          }
          .popup-button:hover {
            background: #1a5bb8;
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(50,116,233,0.4);
          }
          .popup-button svg {
            width: 20px;
            height: 20px;
            fill: currentColor;
          }
        </style>
      </head>
      <body style="margin:0;padding:0;">
        <div id="map" style="width:100%;height:100vh;"></div>
        <script>
          const map = L.map('map').setView([-25.8167, -48.5333], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          // Função para navegar até coordenadas específicas
          function flyToLocation(lat, lng, zoomLevel = 15) {
            map.flyTo([lat, lng], zoomLevel, {
              duration: 2,
              easeLinearity: 0.25
            });
          }

          // Função para criar o ícone de entrega
          function createDeliveryIcon() {
            return L.divIcon({
              className: 'delivery-icon',
              html: '<svg viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l3 4h-3V9.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>',
              iconSize: [25, 25],
              iconAnchor: [12.5, 12.5]
            });
          }

          // Função para criar o conteúdo do popup
          function createPopupContent(entrega) {
            if (!entrega) return '';
            
            const header = \`<div class="popup-header">\${entrega.nome || 'Entrega'}</div>\`;
            const content = \`<div class="popup-content">\`;
            
            if (entrega.status === 'Disponível') {
              return \`\${header}\${content}
                <button class="popup-button" onclick="window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'iniciarEntrega',
                  entregaId: '\${entrega.id}'
                }))">
                  <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  Iniciar Entrega
                </button>
              </div>\`;
            } else {
              return \`\${header}\${content}</div>\`;
            }
          }

          // Função para atualizar marcadores
          function updateMarkers(entregas, usuarioAtual) {
            console.log('Atualizando marcadores com:', entregas);
            console.log('Usuário atual:', usuarioAtual);
            
            // Limpar marcadores existentes
            map.eachLayer((layer) => {
              if (layer instanceof L.Marker) {
                map.removeLayer(layer);
              }
            });

            // Adicionar novos marcadores
            entregas.forEach(entrega => {
              if (entrega.coordenadas && 
                  entrega.coordenadas.latitude && 
                  entrega.coordenadas.longitude &&
                  (entrega.status === 'Disponível' || 
                   (entrega.status === 'Andamento' && entrega.entregador === usuarioAtual))) {
                console.log('Adicionando marcador para:', entrega.nome, 'nas coordenadas:', entrega.coordenadas);
                const marker = L.marker([entrega.coordenadas.latitude, entrega.coordenadas.longitude], {
                  icon: createDeliveryIcon()
                })
                .bindPopup(createPopupContent(entrega), {
                  className: 'custom-popup',
                  closeButton: true
                })
                .addTo(map);
              } else {
                console.log('Entrega não atende aos critérios:', entrega);
              }
            });
          }

          // Função para receber mensagens do React Native
          window.addEventListener('message', function(event) {
            const data = event.data;
            if (data.type === 'updateEntregas') {
              console.log('Recebendo entregas no mapa:', data.entregas);
              updateMarkers(data.entregas, data.usuario);
            } else if (data.type === 'navigateTo') {
              console.log('Navegando para:', data.coordinates);
              flyToLocation(data.coordinates.latitude, data.coordinates.longitude);
            }
          });
        </script>
      </body>
    </html>
  `;

  const webViewRef = React.useRef<WebView>(null);

  // Atualizar marcadores quando as entregas mudarem
  useEffect(() => {
    if (webViewRef.current) {
      console.log('Enviando entregas para o mapa:', entregas);
      webViewRef.current.injectJavaScript(`
        window.postMessage({
          type: 'updateEntregas',
          entregas: ${JSON.stringify(entregas)},
          usuario: ${JSON.stringify(usuario)}
        }, '*');
      `);
    }
  }, [entregas, usuario]);

  // Efeito para navegação inicial
  useEffect(() => {
    if (latitude && longitude && webViewRef.current) {
      console.log('Navegando para coordenadas:', { latitude, longitude });
      webViewRef.current.injectJavaScript(`
        window.postMessage({
          type: 'navigateTo',
          coordinates: {
            latitude: ${latitude},
            longitude: ${longitude}
          }
        }, '*');
      `);
    }
  }, [latitude, longitude]);

  // Função para lidar com mensagens do WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'iniciarEntrega') {
        // Encontrar a entrega pelo ID
        const entrega = entregas.find(e => e.id === data.entregaId);
        if (entrega) {
          // Atualizar status da entrega
          const entregaAtualizada = {
            ...entrega,
            status: 'Andamento',
            entregador: usuario
          };

          // Emitir evento de atualização via socket
          const socket = socketService.getSocket();
          if (socket) {
            socket.emit('Atualizar Entrega', entregaAtualizada);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao processar mensagem do WebView:', error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        onMessage={handleWebViewMessage}
        onLoadEnd={() => {
          // Enviar entregas iniciais quando o mapa carregar
          if (webViewRef.current) {
            console.log('Mapa carregado, enviando entregas iniciais');
            webViewRef.current.injectJavaScript(`
              window.postMessage({
                type: 'updateEntregas',
                entregas: ${JSON.stringify(entregas)},
                usuario: ${JSON.stringify(usuario)}
              }, '*');
            `);
          }
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width,
    height,
  },
}); 