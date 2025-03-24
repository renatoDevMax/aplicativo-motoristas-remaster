import React, { useEffect, useState } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Dimensions, Linking, Alert, View, TextInput } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';
import authService, { Usuario } from '@/services/authService';
import locationService from '@/services/locationService';
import socketService from '@/services/socketService';
import entregasService from '@/services/entregasService';
import { entregasTipo } from '@/types/entregaType';
import Animated, { 
  FadeIn, 
  FadeInDown, 
  FadeInRight, 
  SlideInRight,
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  withSequence,
  withDelay,
  withRepeat,
  interpolateColor
} from 'react-native-reanimated';

// Criar versão animada após ThemedView ter sido atualizado com forwardRef
const AnimatedThemedView = Animated.createAnimatedComponent(ThemedView);
const { width } = Dimensions.get('window');

// Componente para o efeito de reflexo que será reutilizado
const ReflectionEffect = (): React.ReactElement => {
  return (
    <ThemedView style={styles.reflectionEffect} />
  );
};

export default function HomeScreen() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [entregas, setEntregas] = useState<entregasTipo[]>([]);
  const [entregasEmAndamento, setEntregasEmAndamento] = useState<entregasTipo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [contatoModalVisible, setContatoModalVisible] = useState(false);
  const [telefoneAtual, setTelefoneAtual] = useState('');
  const headerHeight = useSharedValue(220);
  const welcomeOpacity = useSharedValue(0);
  const statusRotate = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0.7);
  const indicatorScale = useSharedValue(1);
  const [isCalling, setIsCalling] = useState(false);
  const [modalProblemaVisible, setModalProblemaVisible] = useState(false);
  const [problemaDescricao, setProblemaDescricao] = useState('');

  // Estilo animado para o cabeçalho
  const headerAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: withSpring(headerHeight.value, {
        damping: 18,
        stiffness: 90,
        mass: 0.8,
      }),
    };
  });

  // Animação para o texto de boas-vindas
  const welcomeAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(welcomeOpacity.value, { duration: 800 }),
      transform: [
        { 
          translateY: interpolate(
            welcomeOpacity.value,
            [0, 1],
            [20, 0],
            Extrapolate.CLAMP
          ) 
        }
      ]
    };
  });

  // Animação para o badge de status
  const statusAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          rotateZ: `${statusRotate.value}deg` 
        }
      ]
    };
  });

  // Efeito de pulso para o indicador quando monitoramento estiver ativo
  useEffect(() => {
    if (isTracking) {
      indicatorOpacity.value = withRepeat(
        withTiming(1, { duration: 1200 }),
        -1,
        true
      );
      indicatorScale.value = withRepeat(
        withTiming(1.2, { duration: 1200 }),
        -1,
        true
      );
    } else {
      indicatorOpacity.value = withTiming(0.7, { duration: 300 });
      indicatorScale.value = withTiming(1, { duration: 300 });
    }
  }, [isTracking]);
  
  const indicatorAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: indicatorOpacity.value,
      transform: [{ scale: indicatorScale.value }],
      backgroundColor: isTracking 
        ? 'rgb(74, 222, 128)' // Verde mais vibrante quando ativo
        : 'rgb(239, 68, 68)', // Vermelho mais vibrante quando inativo
    };
  });

  const indicatorGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: indicatorOpacity.value * 0.7,
      transform: [{ scale: indicatorScale.value * 1.5 }],
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
    
    // Filtrar entregas em andamento para este entregador
    const emAndamento = entregasCarregadas.filter(
      entrega => entrega.status === 'Andamento' && 
      entrega.entregador === usuarioAutenticado.userName
    );
    setEntregasEmAndamento(emAndamento);
    setCarregando(false);
    
    // Configurar listener para atualizações de entregas
    const handleEntregasAtualizadas = (entregasAtualizadas: entregasTipo[]) => {
      // Atualizar lista completa de entregas
      setEntregas(entregasAtualizadas);
      
      // Atualizar entregas em andamento para este entregador
      const entregasEmAndamentoAtualizadas = entregasAtualizadas.filter(
        entrega => entrega.status === 'Andamento' && 
        entrega.entregador === usuarioAutenticado.userName
      );
      setEntregasEmAndamento(entregasEmAndamentoAtualizadas);
    };

    // Registrar o listener para o evento 'Entregas do Dia'
    socketService.on('Entregas do Dia', handleEntregasAtualizadas);
    
    // Sequência de animações
    headerHeight.value = withDelay(300, withSpring(160, {
      damping: 20,
      stiffness: 100,
    }));

    // Animações complementares
    welcomeOpacity.value = withDelay(500, withTiming(1, { duration: 800 }));
    statusRotate.value = withDelay(800, withSequence(
      withTiming(8, { duration: 200 }),
      withTiming(-8, { duration: 200 }),
      withTiming(0, { duration: 200 })
    ));
    
    // Atualizar os dados do usuário a cada segundo para mostrar sempre a localização mais recente
    const intervalId = setInterval(() => {
      const usuarioAtualizado = authService.getUsuarioAtualizado();
      if (usuarioAtualizado) {
        setUsuario(usuarioAtualizado);
      }
    }, 1000);
    
    return () => {
      clearInterval(intervalId);
      // Remover o listener quando o componente for desmontado
      socketService.off('Entregas do Dia', handleEntregasAtualizadas);
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

  const handleContatoPress = async (telefone: string) => {
    try {
      // Formatar número de telefone para o formato de URL telefônica
      const numeroTelefone = `tel:${telefone.replace(/\D/g, '')}`;
      
      // Verificar se o dispositivo pode abrir o app de telefone
      const canOpen = await Linking.canOpenURL(numeroTelefone);
      
      if (canOpen) {
        // Abrir app de telefone com o número
        await Linking.openURL(numeroTelefone);
      } else {
        Alert.alert('Erro', 'Não foi possível abrir o aplicativo de telefone.');
      }
    } catch (error) {
      console.error('Erro ao tentar fazer ligação:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao tentar realizar a ligação.');
    }
  };

  const handleWhatsAppPress = async (telefone: string) => {
    try {
      // Formatar número de telefone para o formato do WhatsApp
      const numeroWhatsApp = telefone.replace(/\D/g, '');
      const whatsappUrl = `whatsapp://send?phone=${numeroWhatsApp}`;
      
      // Verificar se o WhatsApp está instalado
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        // Abrir WhatsApp com o número
        await Linking.openURL(whatsappUrl);
      } else {
        Alert.alert('Erro', 'O WhatsApp não está instalado no dispositivo.');
      }
    } catch (error) {
      console.error('Erro ao tentar abrir WhatsApp:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao tentar abrir o WhatsApp.');
    }
  };

  const handlePausarEntrega = () => {
    if (entregasEmAndamento.length > 0) {
      const entregaAtual = entregasEmAndamento[0];
      const entregaAtualizada = {
        ...entregaAtual,
        status: 'Disponível',
        observacoes: entregaAtual.observacoes 
          ? `${entregaAtual.observacoes}\n${problemaDescricao}`
          : problemaDescricao
      };

      // Emitir evento de atualização via socket
      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('Atualizar Entrega', entregaAtualizada);
        setModalProblemaVisible(false);
        setProblemaDescricao('');
      }
    }
  };

  const handleConcluirEntrega = () => {
    if (entregasEmAndamento.length > 0 && usuario) {
      const entregaAtual = entregasEmAndamento[0];
      
      // Enviar mensagem de conclusão
      const mensagemConclusao = {
        contato: entregaAtual.telefone,
        mensagem: "Olá, entrega foi realizada com sucesso. Obrigado por comprar na EcoClean! 😊"
      };

      // Criar mensagem de observação com o horário atual
      const horarioAtual = new Date().toLocaleTimeString();
      const novaObservacao = `\nEntrega concluída por ${usuario.userName}, às ${horarioAtual}.`;

      // Atualizar status da entrega e adicionar observação
      const entregaAtualizada = {
        ...entregaAtual,
        status: 'Concluída',
        observacoes: entregaAtual.observacoes 
          ? `${entregaAtual.observacoes}${novaObservacao}`
          : novaObservacao
      };

      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('Enviar Mensagem', mensagemConclusao);
        socket.emit('Atualizar Entrega', entregaAtualizada);
      }
    }
  };

  const handleEnviarMensagem = () => {
    if (entregasEmAndamento.length > 0 && usuario) {
      const entregaAtual = entregasEmAndamento[0];
      
      // Enviar mensagem de aviso
      const mensagemAviso = {
        contato: entregaAtual.telefone,
        mensagem: `Olá, sou o entregador ${usuario.userName}. Estou a caminho com seus produtos adquiridos aqui na EcoClean! 😊\nPeço a gentileza de me receber em breve! Obrigado! 🤝`
      };

      // Atualizar status da mensagem
      const entregaAtualizada = {
        ...entregaAtual,
        statusMensagem: 'Enviada'
      };

      const socket = socketService.getSocket();
      if (socket) {
        socket.emit('Enviar Mensagem', mensagemAviso);
        socket.emit('Atualizar Entrega', entregaAtualizada);
      }
    }
  };

  const renderEntregaAtual = () => {
    if (entregasEmAndamento.length === 0) {
      return (
        <AnimatedThemedView 
          entering={FadeInDown.delay(200).springify()}
          style={styles.entregaVaziaCard}
        >
          <ThemedView style={styles.emptyIconContainer}>
            <Ionicons name="cube" size={40} color="#AAA" />
          </ThemedView>
          <ThemedText style={styles.emptyTitle}>Sem entregas em andamento</ThemedText>
          <ThemedText style={styles.emptySubtitle}>Você não possui entregas em andamento no momento</ThemedText>
          <TouchableOpacity 
            style={styles.verEntregasButton}
            onPress={() => router.push('/(tabs)/entregas')}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.verEntregasText}>Ver entregas disponíveis</ThemedText>
          </TouchableOpacity>
        </AnimatedThemedView>
      );
    }
    
    return (
      <FlatList
        data={entregasEmAndamento}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={({ item, index }) => (
          <AnimatedThemedView 
            entering={FadeInDown.delay(index * 100).springify()}
            style={styles.entregaCard}
          >
            <ThemedView style={styles.entregaCardHeader}>
              <ThemedText style={styles.entregaCardTitle}>Entrega em Andamento</ThemedText>
              <ThemedView style={styles.entregaStatusBadgeDetalhado}>
                <ThemedText style={styles.entregaStatusTextDetalhado}>Andamento</ThemedText>
            </ThemedView>
            </ThemedView>

            <ThemedView style={styles.entregaCardBody}>
              <ThemedView style={styles.clienteSection}>
                <ThemedView style={styles.clienteInfo}>
                  <ThemedView style={styles.clienteRow}>
                    <Ionicons name="person" size={20} color="#3274e9" />
                    <ThemedText style={styles.clienteNome}>{item.nome || 'Cliente não identificado'}</ThemedText>
                  </ThemedView>
                  {item.telefone && (
                    <TouchableOpacity 
                      style={styles.whatsappButton}
                      onPress={() => handleWhatsAppPress(item.telefone || '')}
                    >
                      <FontAwesome5 name="whatsapp" size={16} color="#fff" />
                      <ThemedText style={styles.telefoneText}>{item.telefone}</ThemedText>
                    </TouchableOpacity>
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
                
                <TouchableOpacity 
                  style={styles.navegarButton}
                  onPress={() => {
                    if (item.coordenadas) {
                      router.push({
                        pathname: '/(tabs)/mapa',
                        params: {
                          latitude: item.coordenadas.latitude,
                          longitude: item.coordenadas.longitude
                        }
                      });
                    }
                  }}
                >
                  <Ionicons name="navigate-outline" size={16} color="#fff" />
                  <ThemedText style={styles.navegarText}>Navegar até o local</ThemedText>
                </TouchableOpacity>
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
                    {item.statusPagamento && (
                <ThemedView style={[
                        styles.statusPagamentoBadge, 
                        { backgroundColor: item.statusPagamento === 'Pago' ? '#4CAF50' : '#FFC107' }
                ]}>
                        <ThemedText style={styles.statusPagamentoText}>{item.statusPagamento}</ThemedText>
                </ThemedView>
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
              
              {!modalProblemaVisible ? (
                <ThemedView style={styles.acoesSection}>
                  <TouchableOpacity 
                    style={[styles.acaoButton, styles.acaoConcluir]}
                    onPress={handleConcluirEntrega}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <ThemedText style={styles.acaoButtonText}>Concluir Entrega</ThemedText>
                  </TouchableOpacity>
                  
                  {item.statusMensagem !== 'Enviada' && (
                    <TouchableOpacity 
                      style={[styles.acaoButton, styles.acaoMensagem]}
                      onPress={handleEnviarMensagem}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="chatbubble-ellipses" size={18} color="#3274e9" />
                      <ThemedText style={styles.acaoButtonTextMensagem}>Mensagem para o Cliente</ThemedText>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity 
                    style={[styles.acaoButton, styles.acaoProblema]}
                    onPress={() => {
                      setProblemaDescricao(`Não foi possível fazer a entrega, ${usuario?.userName}, às ${new Date().toLocaleTimeString()}. Motivo:`);
                      setModalProblemaVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="alert-circle" size={18} color="#fff" />
                    <ThemedText style={styles.acaoButtonText}>Problema na Entrega</ThemedText>
                  </TouchableOpacity>
                </ThemedView>
              ) : (
                <ThemedView style={styles.problemaSection}>
                  <TextInput
                    style={styles.problemaTextArea}
                    multiline
                    numberOfLines={4}
                    value={problemaDescricao}
                    onChangeText={(text) => setProblemaDescricao(text)}
                    placeholder={`Não foi possível fazer a entrega, ${usuario?.userName}, às ${new Date().toLocaleTimeString()}. Motivo:`}
                    placeholderTextColor="#999"
                  />

                  <TouchableOpacity 
                    style={styles.problemaButtonPausar}
                    onPress={handlePausarEntrega}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="pause-circle" size={20} color="#fff" />
                    <ThemedText style={styles.problemaButtonText}>Pausar Entrega</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.problemaButtonCancelar}
                    onPress={() => {
                      setModalProblemaVisible(false);
                      setProblemaDescricao('');
                    }}
                    activeOpacity={0.7}
                  >
                    <ThemedText style={styles.problemaButtonTextCancelar}>Cancelar</ThemedText>
                  </TouchableOpacity>
          </ThemedView>
        )}
            </ThemedView>
            {/* Efeito de reflexão no final do card */}
            <ReflectionEffect />
      </AnimatedThemedView>
        )}
        contentContainerStyle={styles.listaEntregas}
        showsVerticalScrollIndicator={false}
      />
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
        <ThemedView style={styles.headerBackground}>
          <ThemedView style={styles.headerGradientBase} />
          <ThemedView style={styles.decorCircle1} />
          <ThemedView style={styles.decorCircle2} />
          <ThemedView style={styles.headerGlow} />
          <ThemedView style={styles.headerReflection} />
          
          {/* Linhas decorativas */}
          <ThemedView style={styles.decorLine1} />
          <ThemedView style={styles.decorLine2} />
          <ThemedView style={styles.decorLine3} />
          
          <AnimatedThemedView 
            style={styles.userInfoContainer}
            entering={FadeIn.delay(200).springify()}
          >
            <Animated.View style={[styles.userInfo, welcomeAnimatedStyle]}>
              <ThemedText style={styles.saudacao}>Olá,</ThemedText>
              <ThemedText style={styles.userName}>{usuario.userName}</ThemedText>
            </Animated.View>
            
            <ThemedView style={styles.statusContainer}>
              <Animated.View 
                entering={FadeInRight.delay(150).springify()}
                style={[styles.statusBadge, statusAnimatedStyle]}
              >
                <ThemedText style={styles.statusText}>{usuario.status}</ThemedText>
              </Animated.View>
              
              <ThemedView style={styles.monitoringIndicator}>
                <ThemedView style={styles.indicatorContainer}>
                  <Animated.View style={[styles.indicatorGlow, indicatorGlowStyle]} />
                  <Animated.View style={[styles.indicatorDot, indicatorAnimatedStyle]} />
                </ThemedView>
                <ThemedText style={styles.monitoringText}>
                  {isTracking ? 'Rastreamento ativo' : 'Rastreamento inativo'}
                </ThemedText>
              </ThemedView>
            </ThemedView>
          </AnimatedThemedView>
        </ThemedView>
      </Animated.View>
      
      {/* Conteúdo principal */}
      <ThemedView style={styles.content}>
        {renderEntregaAtual()}
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
  headerBackground: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#0a1c4e', // Azul profundo elegante
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  headerGradientBase: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#0a1c4e', // Mesma cor do fundo
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerGlow: {
    position: 'absolute',
    width: 220,
    height: 120,
    top: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 60,
    transform: [{ translateX: 30 }, { translateY: -20 }, { rotate: '15deg' }],
    zIndex: 0,
  },
  headerReflection: {
    position: 'absolute',
    left: 5,
    right: 5,
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 1,
  },
  decorCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    top: -60,
    right: -30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  decorCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    top: 5,
    left: -40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  userInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    position: 'relative',
    zIndex: 5,
    paddingTop: 15,
    marginBottom: 5,
    backgroundColor: 'transparent',
  },
  userInfo: {
    flex: 1,
  },
  saudacao: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 1)',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
  },
  statusContainer: {
    alignItems: 'flex-end',
    backgroundColor: 'transparent',
  },
  statusBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 10,
    backdropFilter: 'blur(8px)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 5,
    elevation: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 14.5, // Ligeiramente maior
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  monitoringIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 5,
  },
  indicatorContainer: {
    width: 18, // Ligeiramente maior
    height: 18, // Ligeiramente maior
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Mais escuro
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8, // Maior separação
    position: 'relative', // Necessário para posicionamento absoluto do glow
  },
  indicatorGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  indicatorDot: {
    width: '70%',
    height: '70%',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 3,
  },
  monitoringText: {
    fontSize: 12,
    color: 'white',
    opacity: 1, // Aumentado para garantir visibilidade
    textShadowColor: 'rgba(0, 0, 0, 0.7)', // Sombra mais forte
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  reflectionEffect: {
    position: 'absolute',
    left: 3,
    right: 3,
    bottom: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 1,
  },
  decorLine1: {
    position: 'absolute',
    height: 1,
    width: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: '25%',
    right: '15%',
    transform: [{ rotate: '-5deg' }],
  },
  decorLine2: {
    position: 'absolute',
    height: 0.5,
    width: '30%',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    top: '35%',
    right: '5%',
    transform: [{ rotate: '-10deg' }],
  },
  decorLine3: {
    position: 'absolute',
    height: 0.5,
    width: '25%',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    bottom: '15%',
    left: '10%',
    transform: [{ rotate: '8deg' }],
  },
  listaEntregas: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  entregaVaziaCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
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
  verEntregasButton: {
    backgroundColor: '#3274e9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: '#3274e9',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 4,
  },
  verEntregasText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 15,
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
    position: 'relative',
  },
  entregaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  entregaCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  entregaStatusBadgeDetalhado: {
    backgroundColor: '#2196F3',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  entregaStatusTextDetalhado: {
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
  navegarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3274e9',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginLeft: 26,
    shadowColor: '#3274e9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  navegarText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
  statusPagamentoBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  statusPagamentoText: {
    color: 'white',
    fontSize: 12,
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
  acoesSection: {
    marginTop: 20,
  },
  acaoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  acaoConcluir: {
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
  },
  acaoMensagem: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#3274e9',
    shadowColor: '#3274e9',
  },
  acaoProblema: {
    backgroundColor: '#F44336',
    shadowColor: '#F44336',
  },
  problemaSection: {
    marginTop: 20,
  },
  problemaTextArea: {
    width: '100%',
    height: 150,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  problemaButtonPausar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F44336',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  problemaButtonCancelar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    borderWidth: 2,
    borderColor: '#666',
  },
  problemaButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  problemaButtonTextCancelar: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  acaoButtonTextMensagem: {
    color: '#3274e9',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  acaoButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
