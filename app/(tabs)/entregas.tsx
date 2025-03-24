import React, { useEffect, useState } from 'react';
import { StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import entregasService from '@/services/entregasService';
import { entregasTipo } from '@/types/entregaType';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';

// Criar versão animada após ThemedView ter sido atualizado com forwardRef
const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

export default function EntregasScreen() {
  const [entregas, setEntregas] = useState<entregasTipo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Obter as entregas já carregadas
    const entregasCarregadas = entregasService.getEntregas();
    setEntregas(entregasCarregadas);
    setCarregando(false);
  }, []);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'Entregue': return '#4CAF50';
      case 'Em rota': return '#2196F3';
      case 'Pendente': return '#FFC107';
      case 'Cancelada': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const renderEntregaItem = ({ item, index }: { item: entregasTipo; index: number }) => (
    <AnimatedThemedView 
      entering={FadeInRight.delay(index * 100).springify()} 
      style={styles.entregaCard}
    >
      <ThemedView style={styles.entregaHeader}>
        <ThemedText style={styles.entregaNome}>{item.nome || 'Cliente sem nome'}</ThemedText>
        <ThemedView style={[styles.entregaStatusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <ThemedText style={styles.entregaStatusText}>{item.status || 'Sem status'}</ThemedText>
        </ThemedView>
      </ThemedView>
      
      <ThemedView style={styles.entregaInfo}>
        {item.cidade && (
          <ThemedView style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <ThemedText style={styles.infoText}>
              {[item.cidade, item.bairro, item.rua, item.numero].filter(Boolean).join(', ')}
            </ThemedText>
          </ThemedView>
        )}
        
        {item.horario && (
          <ThemedView style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <ThemedText style={styles.infoText}>
              {`${item.horario[0].toString().padStart(2, '0')}:${item.horario[1].toString().padStart(2, '0')}`}
            </ThemedText>
          </ThemedView>
        )}
        
        {item.valor && (
          <ThemedView style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <ThemedText style={styles.infoText}>
              {`R$ ${item.valor} • ${item.pagamento || 'Pagamento não informado'}`}
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>
      
      {item.observacoes && (
        <ThemedView style={styles.entregaObs}>
          <ThemedText style={styles.obsText}>{item.observacoes}</ThemedText>
        </ThemedView>
      )}
    </AnimatedThemedView>
  );

  if (carregando) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3274e9" />
        <ThemedText style={styles.loadingText}>Carregando entregas...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <AnimatedThemedView 
        entering={FadeInDown.springify()}
        style={styles.header}
      >
        <ThemedText style={styles.title}>Entregas do Dia</ThemedText>
        <ThemedText style={styles.subtitle}>
          {entregas.length === 0 
            ? 'Nenhuma entrega agendada para hoje' 
            : `${entregas.length} ${entregas.length === 1 ? 'entrega' : 'entregas'} agendadas`}
        </ThemedText>
      </AnimatedThemedView>

      {entregas.length === 0 ? (
        <AnimatedThemedView 
          entering={FadeInDown.delay(300).springify()}
          style={styles.emptyContainer}
        >
          <Ionicons name="calendar-outline" size={80} color="#DDD" />
          <ThemedText style={styles.emptyText}>Nenhuma entrega para hoje</ThemedText>
          <ThemedText style={styles.emptySubtext}>
            Suas próximas entregas aparecerão aqui
          </ThemedText>
        </AnimatedThemedView>
      ) : (
        <FlatList
          data={entregas}
          renderItem={renderEntregaItem}
          keyExtractor={(item) => item.id || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  entregaCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  entregaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  entregaNome: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  entregaStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
  entregaStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  entregaInfo: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  entregaObs: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  obsText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
}); 