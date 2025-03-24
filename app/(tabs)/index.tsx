import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Dimensions } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import authService, { Usuario } from '@/services/authService';
import locationService from '@/services/locationService';
import socketService from '@/services/socketService';
import entregasService from '@/services/entregasService';
import { entregasTipo } from '@/types/entregaType';
import Animated, { FadeIn, FadeInDown, FadeInRight, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Criar versão animada após ThemedView ter sido atualizado com forwardRef
const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [entregas, setEntregas] = useState<entregasTipo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const headerHeight = useSharedValue(200);

  // Estilo animado para o cabeçalho
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(headerHeight.value, {
        damping: 20,
        stiffness: 100,
      }),
    };
  });

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const usuarioAutenticado = authService.getUsuario();
    
    if (!usuarioAutenticado) {
      // Redirecionar para a tela de login se não estiver autenticado
      router.replace('/(auth)/login');
      return;
    }
    
    setUsuario(usuarioAutenticado);
    setIsTracking(locationService.isLocationTracking());
    
    // Obter as entregas já carregadas
    const entregasCarregadas = entregasService.getEntregas();
    setEntregas(entregasCarregadas);
    setCarregando(false);
    
    // Animar o cabeçalho após carregar
    setTimeout(() => {
      headerHeight.value = 140;
    }, 500);
    
    // Atualizar os dados do usuário a cada segundo para mostrar sempre a localização mais recente
    const intervalId = setInterval(() => {
      const usuarioAtualizado = authService.getUsuarioAtualizado();
      if (usuarioAtualizado) {
        setUsuario(usuarioAtualizado);
      }
    }, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  const handleFinalizarDia = async () => {
    // Parar o rastreamento
    await locationService.stopLocationTracking();
    
    // Desconectar o socket
    socketService.disconnect();
    
    // Limpar os dados do usuário
    authService.limparUsuario();
    
    // Redirecionar para a tela de login
    router.replace('/(auth)/login');
  };

  const renderResumoEntregas = () => {
    if (entregas.length === 0) {
      return (
        <AnimatedThemedView 
          entering={FadeInDown.delay(200).springify()}
          style={styles.emptyEntregas}
        >
          <Ionicons name="calendar-outline" size={40} color="#DDD" />
          <ThemedText style={styles.emptyText}>Sem entregas hoje</ThemedText>
        </AnimatedThemedView>
      );
    }
    
    // Contar entregas por status
    const statusCounts = entregas.reduce((acc, entrega) => {
      const status = entrega.status || 'Pendente';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return (
      <FlatList
        data={Object.entries(statusCounts)}
        renderItem={({ item, index }) => (
          <AnimatedThemedView 
            entering={FadeInRight.delay(index * 100).springify()}
            style={styles.statusCard}
          >
            <ThemedText style={styles.statusCount}>{item[1]}</ThemedText>
            <ThemedText style={styles.statusLabel}>{item[0]}</ThemedText>
          </AnimatedThemedView>
        )}
        keyExtractor={(item) => item[0]}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusList}
      />
    );
  };

  const renderEntregasRecentes = () => {
    // Mostrar apenas as 3 primeiras entregas
    const entregasRecentes = entregas.slice(0, 3);
    
    return (
      <AnimatedThemedView 
        entering={FadeInDown.delay(300).springify()}
        style={styles.recentesContainer}
      >
        <ThemedView style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle}>Entregas Recentes</ThemedText>
          <TouchableOpacity onPress={() => router.push('/(tabs)/entregas')}>
            <ThemedText style={styles.verTodasText}>Ver todas</ThemedText>
          </TouchableOpacity>
        </ThemedView>
        
        {entregasRecentes.length > 0 ? (
          entregasRecentes.map((entrega, index) => (
            <AnimatedThemedView 
              key={entrega.id || index.toString()}
              entering={FadeInDown.delay(400 + index * 100).springify()}
              style={styles.entregaItem}
            >
              <ThemedView style={styles.entregaIconContainer}>
                <Ionicons name="cube-outline" size={24} color="#3274e9" />
              </ThemedView>
              <ThemedView style={styles.entregaDetails}>
                <ThemedText style={styles.entregaNome}>{entrega.nome || 'Sem nome'}</ThemedText>
                {entrega.cidade && (
                  <ThemedText style={styles.entregaEndereco} numberOfLines={1}>
                    {[entrega.cidade, entrega.bairro].filter(Boolean).join(', ')}
                  </ThemedText>
                )}
              </ThemedView>
              {entrega.status && (
                <ThemedView style={[
                  styles.entregaStatusBadge, 
                  { backgroundColor: entrega.status === 'Pendente' ? '#FFC107' : '#4CAF50' }
                ]}>
                  <ThemedText style={styles.entregaStatusText}>{entrega.status}</ThemedText>
                </ThemedView>
              )}
            </AnimatedThemedView>
          ))
        ) : (
          <ThemedView style={styles.semEntregas}>
            <ThemedText style={styles.semEntregasText}>Não há entregas recentes</ThemedText>
          </ThemedView>
        )}
      </AnimatedThemedView>
    );
  };

  if (carregando || !usuario) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3274e9" />
        <ThemedText style={styles.loadingText}>Carregando...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Cabeçalho com animação */}
      <Animated.View style={[headerAnimatedStyle]}>
        <LinearGradient
          colors={['#3274e9', '#1a56c5']}
          style={styles.headerGradient}
        >
          <AnimatedThemedView 
            entering={FadeIn.delay(100).springify()}
            style={styles.userInfoContainer}
          >
            <ThemedView style={styles.userInfo}>
              <ThemedText style={styles.saudacao}>Olá,</ThemedText>
              <ThemedText style={styles.userName}>{usuario.userName}</ThemedText>
            </ThemedView>
            
            <ThemedView style={styles.statusContainer}>
              <ThemedView style={styles.statusBadge}>
                <ThemedText style={styles.statusText}>{usuario.status}</ThemedText>
              </ThemedView>
              
              <ThemedView style={styles.monitoringIndicator}>
                <ThemedView 
                  style={[styles.indicatorDot, { backgroundColor: isTracking ? '#4CAF50' : '#F44336' }]} 
                />
                <ThemedText style={styles.monitoringText}>
                  {isTracking ? 'Rastreamento ativo' : 'Rastreamento inativo'}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </AnimatedThemedView>
        </LinearGradient>
      </Animated.View>
      
      {/* Conteúdo principal */}
      <ThemedView style={styles.content}>
        {/* Resumo de entregas */}
        <AnimatedThemedView 
          entering={FadeInDown.delay(100).springify()}
          style={styles.resumoContainer}
        >
          <ThemedText style={styles.resumoTitle}>Resumo do Dia</ThemedText>
          {renderResumoEntregas()}
        </AnimatedThemedView>
        
        {/* Entregas recentes */}
        {renderEntregasRecentes()}
        
        {/* Ações rápidas */}
        <AnimatedThemedView 
          entering={FadeInDown.delay(600).springify()}
          style={styles.actionButtonsContainer}
        >
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/mapa')}>
            <ThemedView style={[styles.actionIcon, { backgroundColor: '#3274e9' }]}>
              <Ionicons name="map-outline" size={22} color="white" />
            </ThemedView>
            <ThemedText style={styles.actionText}>Ver Mapa</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/entregas')}>
            <ThemedView style={[styles.actionIcon, { backgroundColor: '#4CAF50' }]}>
              <Ionicons name="list-outline" size={22} color="white" />
            </ThemedView>
            <ThemedText style={styles.actionText}>Entregas</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleFinalizarDia}>
            <ThemedView style={[styles.actionIcon, { backgroundColor: '#e53935' }]}>
              <Ionicons name="power-outline" size={22} color="white" />
            </ThemedView>
            <ThemedText style={styles.actionText}>Finalizar</ThemedText>
          </TouchableOpacity>
        </AnimatedThemedView>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
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
  headerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  userInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  userInfo: {
    flex: 1,
  },
  saudacao: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  monitoringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  monitoringText: {
    fontSize: 12,
    color: 'white',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  resumoContainer: {
    marginBottom: 20,
  },
  resumoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statusList: {
    paddingBottom: 5,
  },
  statusCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginRight: 15,
    width: width / 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  statusCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3274e9',
    marginBottom: 5,
  },
  statusLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  emptyEntregas: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: '#999',
  },
  recentesContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  verTodasText: {
    fontSize: 14,
    color: '#3274e9',
    fontWeight: '500',
  },
  entregaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  entregaIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(50, 116, 233, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entregaDetails: {
    flex: 1,
  },
  entregaNome: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  entregaEndereco: {
    fontSize: 13,
    color: '#888',
  },
  entregaStatusBadge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  entregaStatusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  semEntregas: {
    padding: 20,
    alignItems: 'center',
  },
  semEntregasText: {
    fontSize: 14,
    color: '#999',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  actionButton: {
    alignItems: 'center',
    width: '30%',
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  actionText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
});
