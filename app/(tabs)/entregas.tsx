import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, View, Linking, Alert, TextInput } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import authService, { Usuario } from '@/services/authService';
import entregasService from '@/services/entregasService';
import socketService from '@/services/socketService';
import { entregasTipo } from '@/types/entregaType';
import Animated, { 
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  Layout
} from 'react-native-reanimated';
import DraggableFlatList, { 
  RenderItemParams,
  ScaleDecorator 
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);

export default function EntregasScreen() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [entregas, setEntregas] = useState<entregasTipo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [entregasDisponiveis, setEntregasDisponiveis] = useState<entregasTipo[]>([]);
  const [entregaExpandida, setEntregaExpandida] = useState<string | null>(null);
  const [editandoTelefone, setEditandoTelefone] = useState<string | null>(null);
  const [novoTelefone, setNovoTelefone] = useState('');
  const [modoArrastar, setModoArrastar] = useState(false);

  const handleWhatsAppPress = async (telefone: string) => {
    if (telefone.toLowerCase() === 'sem contato') {
      setEditandoTelefone(telefone);
      return;
    }

    try {
      const numeroWhatsApp = telefone.replace(/\D/g, '');
      const whatsappUrl = `whatsapp://send?phone=${numeroWhatsApp}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Erro', 'O WhatsApp não está instalado no dispositivo.');
      }
    } catch (error) {
      console.error('Erro ao tentar abrir WhatsApp:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao tentar abrir o WhatsApp.');
    }
  };

  const handleSalvarTelefone = (entrega: entregasTipo) => {
    if (!novoTelefone.trim()) {
      Alert.alert('Erro', 'Por favor, insira um número de telefone válido.');
      return;
    }

    const entregaAtualizada = {
      ...entrega,
      telefone: novoTelefone
    };
    
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('Atualizar Entrega', entregaAtualizada);
      setEditandoTelefone(null);
      setNovoTelefone('');
    }
  };

  const handleCancelarEdicao = () => {
    setEditandoTelefone(null);
    setNovoTelefone('');
  };

  const handleReordenarEntregas = ({ data }: { data: entregasTipo[] }) => {
    setEntregasDisponiveis(data);
    // Aqui você pode adicionar a lógica para salvar a nova ordem no servidor se necessário
  };

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const usuarioAutenticado = authService.getUsuario();
    
    if (!usuarioAutenticado) {
      router.replace('/(auth)/login');
      return;
    }
    
    setUsuario(usuarioAutenticado);
    
    // Obter as entregas já carregadas
    const entregasCarregadas = entregasService.getEntregas();
    setEntregas(entregasCarregadas);
    
    // Filtrar entregas disponíveis para este entregador
    const disponiveis = entregasCarregadas.filter(
      entrega => entrega.status === 'Disponível' && 
      entrega.entregador === usuarioAutenticado.userName
    );
    setEntregasDisponiveis(disponiveis);
    setCarregando(false);

    // Configurar listeners do socket
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('Entregas do Dia', (novasEntregas: entregasTipo[]) => {
        entregasService.setEntregas(novasEntregas);
        setEntregas(novasEntregas);
        
        // Atualizar entregas disponíveis
        const novasDisponiveis = novasEntregas.filter(
          entrega => entrega.status === 'Disponível' && 
          entrega.entregador === usuarioAutenticado.userName
        );
        setEntregasDisponiveis(novasDisponiveis);
      });

      return () => {
        socket.off('Entregas do Dia');
      };
    }
  }, []);

  const handleIniciarEntrega = (entrega: entregasTipo) => {
    const entregaAtualizada = {
      ...entrega,
      status: 'Andamento'
    };
    
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('Atualizar Entrega', entregaAtualizada);
      // Redirecionar para a página inicial após iniciar a entrega
      router.replace('/(tabs)');
    }
  };

  const handleEntregaPress = (entregaId: string) => {
    if (!modoArrastar) {
      setEntregaExpandida(entregaId === entregaExpandida ? null : entregaId);
    }
  };

  const handleLongPress = () => {
    setModoArrastar(true);
    setEntregaExpandida(null); // Contrai todos os cards
  };

  const handleDragEnd = ({ data }: { data: entregasTipo[] }) => {
    setEntregasDisponiveis(data);
    setModoArrastar(false);
  };

  const renderTelefoneSection = (item: entregasTipo) => {
    if (editandoTelefone === item.telefone) {
      return (
        <ThemedView style={styles.edicaoTelefoneContainer}>
          <TextInput
            style={styles.telefoneInput}
            value={novoTelefone}
            onChangeText={setNovoTelefone}
            placeholder="Digite o número de telefone"
            keyboardType="phone-pad"
            autoFocus
          />
          <ThemedView style={styles.botoesEdicao}>
            <TouchableOpacity 
              style={[styles.botaoEdicao, styles.botaoSalvar]}
              onPress={() => handleSalvarTelefone(item)}
            >
              <Ionicons name="save" size={20} color="#fff" />
              <ThemedText style={styles.botaoEdicaoText}>Salvar</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.botaoEdicao, styles.botaoCancelar]}
              onPress={handleCancelarEdicao}
            >
              <Ionicons name="close-circle" size={20} color="#fff" />
              <ThemedText style={styles.botaoEdicaoText}>Cancelar</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </ThemedView>
      );
    }

    return (
      <TouchableOpacity 
        style={styles.whatsappButton}
        onPress={() => handleWhatsAppPress(item.telefone || '')}
      >
        <FontAwesome5 name="whatsapp" size={16} color="#fff" />
        <ThemedText style={styles.telefoneText}>{item.telefone}</ThemedText>
      </TouchableOpacity>
    );
  };

  const renderEntrega = ({ item, index }: { item: entregasTipo; index: number }) => {
    const isExpandida = entregaExpandida === item.id;

    return (
      <AnimatedThemedView 
        entering={FadeInDown.delay(index * 100).springify()}
        style={[
          styles.entregaCard,
          isExpandida && styles.entregaCardExpandida
        ]}
      >
        <TouchableOpacity 
          style={styles.entregaCardHeader}
          onPress={() => handleEntregaPress(item.id || '')}
          delayLongPress={200}
        >
          <ThemedView style={styles.headerContent}>
            <ThemedView style={styles.headerLeft}>
              <Ionicons name="menu" size={20} color="#3274e9" style={styles.dragIcon} />
              <ThemedText style={styles.ordemEntrega}>{`${index + 1}ª Entrega`}</ThemedText>
            </ThemedView>
            <ThemedView style={styles.entregaStatusBadge}>
              <ThemedText style={styles.entregaStatusText}>{item.status}</ThemedText>
            </ThemedView>
          </ThemedView>
          <ThemedView style={styles.clienteResumo}>
            <Ionicons name="person" size={20} color="#3274e9" />
            <ThemedText style={styles.clienteNome}>{item.nome || 'Cliente não identificado'}</ThemedText>
          </ThemedView>
        </TouchableOpacity>

        <Animated.View layout={Layout.springify()}>
          {isExpandida && (
            <TouchableOpacity 
              style={styles.entregaCardBody}
              activeOpacity={1}
              onPress={() => handleEntregaPress(item.id || '')}
            >
              <ThemedView style={styles.clienteSection}>
                <ThemedView style={styles.clienteInfo}>
                  {item.telefone && (
                    <ThemedView style={styles.clienteInfo}>
                      {renderTelefoneSection(item)}
                    </ThemedView>
                  )}
                </ThemedView>
              </ThemedView>

              <ThemedView style={styles.enderecoSection}>
                <ThemedView style={styles.secaoTitulo}>
                  <Ionicons name="location" size={18} color="#3274e9" />
                  <ThemedText style={styles.secaoTituloTexto}>Endereço de Entrega</ThemedText>
                </ThemedView>
                
                <ThemedView style={styles.enderecoInfo}>
                  {item.cidade && (
                    <ThemedText style={styles.enderecoCidade}>
                      {item.cidade}
                    </ThemedText>
                  )}
                  {item.bairro && (
                    <ThemedText style={styles.enderecoBairro}>
                      {item.bairro}
                    </ThemedText>
                  )}
                  {(item.rua || item.numero) && (
                    <ThemedText style={styles.enderecoRua}>
                      {[item.rua, item.numero].filter(Boolean).join(', ')}
                    </ThemedText>
                  )}
                </ThemedView>
              </ThemedView>

              {(item.valor || item.pagamento) && (
                <ThemedView style={styles.pagamentoSection}>
                  <ThemedView style={styles.secaoTitulo}>
                    <Ionicons name="cash" size={18} color="#3274e9" />
                    <ThemedText style={styles.secaoTituloTexto}>Pagamento</ThemedText>
                  </ThemedView>
                  
                  <ThemedView style={styles.pagamentoInfo}>
                    {item.valor && (
                      <ThemedText style={styles.valorText}>
                        Valor: <ThemedText style={styles.valorDestaque}>R$ {item.valor}</ThemedText>
                      </ThemedText>
                    )}
                    {item.pagamento && (
                      <ThemedText style={styles.formaPagamentoText}>
                        Forma: <ThemedText style={styles.pagamentoDestaque}>{item.pagamento}</ThemedText>
                      </ThemedText>
                    )}
                  </ThemedView>
                </ThemedView>
              )}
              
              {item.observacoes && (
                <ThemedView style={styles.observacoesSection}>
                  <ThemedView style={styles.secaoTitulo}>
                    <Ionicons name="information-circle" size={18} color="#3274e9" />
                    <ThemedText style={styles.secaoTituloTexto}>Observações</ThemedText>
                  </ThemedView>
                  
                  <ThemedText style={styles.observacoesText}>
                    {item.observacoes}
                  </ThemedText>
                </ThemedView>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>

        <ThemedView style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.iniciarEntregaButton}
            onPress={() => handleIniciarEntrega(item)}
          >
            <Ionicons name="play-circle" size={20} color="#3274e9" />
            <ThemedText style={styles.iniciarEntregaText}>Iniciar Entrega</ThemedText>
          </TouchableOpacity>
        </ThemedView>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.content}>
          <ThemedView style={styles.controlButtons}>
            {/* ... existing code ... */}
          </ThemedView>
          
          {entregasDisponiveis.length === 0 ? (
            <ThemedView style={styles.mensagemVaziaContainer}>
              <ThemedView style={styles.emptyIconContainer}>
                <Ionicons name="cube" size={40} color="#AAA" />
              </ThemedView>
              <ThemedText style={styles.emptyTitle}>Sem entregas disponíveis</ThemedText>
              <ThemedText style={styles.emptySubtitle}>Não temos entregas disponíveis no momento</ThemedText>
            </ThemedView>
          ) : (
            <DraggableFlatList
              data={entregasDisponiveis}
              onDragEnd={handleDragEnd}
              keyExtractor={(item) => item.id || Math.random().toString()}
              contentContainerStyle={styles.listaEntregas}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, drag, isActive }: RenderItemParams<entregasTipo>) => (
                <ScaleDecorator>
                  <TouchableOpacity
                    onLongPress={drag}
                    onPress={() => handleEntregaPress(item.id || '')}
                    delayLongPress={1000}
                    disabled={isActive}
                    style={[
                      styles.dragHandle,
                      isActive && styles.dragHandleActive
                    ]}
                  >
                    <AnimatedThemedView 
                      entering={FadeInDown.delay(entregasDisponiveis.indexOf(item) * 100).springify()}
                      style={[
                        styles.entregaCard,
                        modoArrastar && styles.entregaCardModoArrastar,
                        isActive && styles.entregaCardActive
                      ]}
                    >
                      <ThemedView style={styles.entregaCardHeader}>
                        <ThemedView style={styles.headerContent}>
                          <ThemedView style={styles.headerLeft}>
                            <Ionicons name="menu" size={20} color="#3274e9" style={styles.dragIcon} />
                            <ThemedText style={styles.ordemEntrega}>{`${entregasDisponiveis.indexOf(item) + 1}ª Entrega`}</ThemedText>
                          </ThemedView>
                          <ThemedView style={styles.entregaStatusBadge}>
                            <ThemedText style={styles.entregaStatusText}>{item.status}</ThemedText>
                          </ThemedView>
                        </ThemedView>
                        <ThemedView style={styles.clienteResumo}>
                          <Ionicons name="person" size={20} color="#3274e9" />
                          <ThemedText style={styles.clienteNome}>{item.nome || 'Cliente não identificado'}</ThemedText>
                        </ThemedView>
                      </ThemedView>

                      <Animated.View layout={Layout.springify()}>
                        {!modoArrastar && entregaExpandida === item.id && (
                          <ThemedView style={styles.entregaCardBody}>
                            <ThemedView style={styles.clienteSection}>
                              <ThemedView style={styles.clienteInfo}>
                                {item.telefone && (
                                  <ThemedView style={styles.clienteInfo}>
                                    {renderTelefoneSection(item)}
                                  </ThemedView>
                                )}
                              </ThemedView>
                            </ThemedView>

                            <ThemedView style={styles.enderecoSection}>
                              <ThemedView style={styles.secaoTitulo}>
                                <Ionicons name="location" size={18} color="#3274e9" />
                                <ThemedText style={styles.secaoTituloTexto}>Endereço de Entrega</ThemedText>
                              </ThemedView>
                              
                              <ThemedView style={styles.enderecoInfo}>
                                {item.cidade && (
                                  <ThemedText style={styles.enderecoCidade}>
                                    {item.cidade}
                                  </ThemedText>
                                )}
                                {item.bairro && (
                                  <ThemedText style={styles.enderecoBairro}>
                                    {item.bairro}
                                  </ThemedText>
                                )}
                                {(item.rua || item.numero) && (
                                  <ThemedText style={styles.enderecoRua}>
                                    {[item.rua, item.numero].filter(Boolean).join(', ')}
                                  </ThemedText>
                                )}
                              </ThemedView>
                            </ThemedView>

                            {(item.valor || item.pagamento) && (
                              <ThemedView style={styles.pagamentoSection}>
                                <ThemedView style={styles.secaoTitulo}>
                                  <Ionicons name="cash" size={18} color="#3274e9" />
                                  <ThemedText style={styles.secaoTituloTexto}>Pagamento</ThemedText>
                                </ThemedView>
                                
                                <ThemedView style={styles.pagamentoInfo}>
                                  {item.valor && (
                                    <ThemedText style={styles.valorText}>
                                      Valor: <ThemedText style={styles.valorDestaque}>R$ {item.valor}</ThemedText>
                                    </ThemedText>
                                  )}
                                  {item.pagamento && (
                                    <ThemedText style={styles.formaPagamentoText}>
                                      Forma: <ThemedText style={styles.pagamentoDestaque}>{item.pagamento}</ThemedText>
                                    </ThemedText>
                                  )}
                                </ThemedView>
                              </ThemedView>
                            )}

                            {item.observacoes && (
                              <ThemedView style={styles.observacoesSection}>
                                <ThemedView style={styles.secaoTitulo}>
                                  <Ionicons name="information-circle" size={18} color="#3274e9" />
                                  <ThemedText style={styles.secaoTituloTexto}>Observações</ThemedText>
                                </ThemedView>
                                
                                <ThemedText style={styles.observacoesText}>
                                  {item.observacoes}
                                </ThemedText>
                              </ThemedView>
                            )}
                          </ThemedView>
                        )}
                      </Animated.View>

                      <ThemedView style={styles.buttonContainer}>
                        <TouchableOpacity 
                          style={styles.iniciarEntregaButton}
                          onPress={() => handleIniciarEntrega(item)}
                        >
                          <Ionicons name="play-circle" size={20} color="#3274e9" />
                          <ThemedText style={styles.iniciarEntregaText}>Iniciar Entrega</ThemedText>
                        </TouchableOpacity>
                      </ThemedView>
                    </AnimatedThemedView>
                  </TouchableOpacity>
                </ScaleDecorator>
              )}
            />
          )}
        </ThemedView>
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  controlButtons: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
  listaEntregas: {
    padding: 20,
    paddingTop: 120,
  },
  entregaCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    overflow: 'hidden',
  },
  entregaCardHeader: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ordemEntrega: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3274e9',
    backgroundColor: 'rgba(50, 116, 233, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  entregaStatusBadge: {
    backgroundColor: '#4CAF50',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  entregaStatusText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  entregaCardBody: {
    padding: 18,
  },
  clienteSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  clienteInfo: {
    flex: 1,
  },
  clienteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  clienteNome: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#25D366',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    shadowColor: '#25D366',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  telefoneText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  secaoTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  secaoTituloTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  enderecoSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  enderecoInfo: {
    marginLeft: 26,
    marginBottom: 12,
  },
  enderecoCidade: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  enderecoBairro: {
    fontSize: 14,
    color: '#555',
    marginBottom: 2,
  },
  enderecoRua: {
    fontSize: 14,
    color: '#555',
  },
  pagamentoSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pagamentoInfo: {
    marginLeft: 26,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  valorText: {
    fontSize: 14,
    color: '#555',
    marginRight: 15,
  },
  valorDestaque: {
    color: '#333',
    fontWeight: '600',
  },
  formaPagamentoText: {
    fontSize: 14,
    color: '#555',
  },
  pagamentoDestaque: {
    color: '#333',
    fontWeight: '600',
  },
  observacoesSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  observacoesText: {
    fontSize: 14,
    color: '#555',
    marginLeft: 26,
    lineHeight: 20,
  },
  buttonContainer: {
    padding: 18,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  iniciarEntregaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3274e9',
    backgroundColor: 'transparent',
    shadowColor: '#3274e9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iniciarEntregaText: {
    color: '#3274e9',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  entregaCardExpandida: {
    shadowColor: '#3274e9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clienteResumo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
  },
  edicaoTelefoneContainer: {
    width: '100%',
  },
  telefoneInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  botoesEdicao: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  botaoEdicao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    flex: 1,
  },
  botaoSalvar: {
    backgroundColor: '#4CAF50',
  },
  botaoCancelar: {
    backgroundColor: '#F44336',
  },
  botaoEdicaoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  dragHandle: {
    width: '100%',
  },
  dragHandleActive: {
    opacity: 0.8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragIcon: {
    marginRight: 8,
  },
  entregaCardActive: {
    transform: [{ scale: 1.02 }],
    shadowColor: '#3274e9',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  entregaCardModoArrastar: {
    borderWidth: 2,
    borderColor: '#3274e9',
    shadowColor: '#3274e9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mensagemVaziaContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
}); 