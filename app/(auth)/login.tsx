import React, { useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform, ScrollView, KeyboardAvoidingView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import authService from '@/services/authService';
import socketService from '@/services/socketService';
import locationService from '@/services/locationService';
import entregasService from '@/services/entregasService';

export default function LoginScreen() {
  const [userName, setUserName] = useState('Marcos');
  const [senha, setSenha] = useState('ecomarcos');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!userName.trim() || !senha.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    setError('');
    setLoading(true);
    setStatusMessage('Conectando ao servidor socket...');

    try {
      // Conectar ao servidor socket
      socketService.connect();
      
      // Aguardar um pouco para garantir a conexão
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setStatusMessage('Conexão socket estabelecida');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStatusMessage('Enviando credenciais para autenticação...');
      
      // Autenticar o usuário
      const usuario = await authService.autenticarUsuario(userName, senha);
      
      setStatusMessage('Usuário autenticado com sucesso');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStatusMessage('Solicitando permissões de localização...');
      
      // Solicitar permissões de localização
      const hasPermissions = await locationService.requestPermissions();
      
      if (!hasPermissions) {
        setError('Permissões de localização necessárias');
        setLoading(false);
        return;
      }
      
      setStatusMessage('Iniciando rastreamento de localização...');
      
      // Iniciar rastreamento
      await locationService.startLocationTracking();
      
      setStatusMessage('Rastreamento iniciado com sucesso');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Carregar as entregas do dia
      setStatusMessage('Carregando entregas do dia...');
      
      try {
        await entregasService.solicitarEntregasDoDia();
        setStatusMessage('Entregas carregadas com sucesso');
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (entregasError) {
        console.warn('Aviso ao carregar entregas:', entregasError);
        setStatusMessage('Aviso: Não foi possível carregar entregas, continuando...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Redirecionar para a tela do usuário
      setLoading(false);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setError(error instanceof Error ? error.message : 'Erro ao fazer login');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedView style={styles.formContainer}>
          <ThemedText type="title" style={styles.title}>Rastreador GPS</ThemedText>
          <ThemedText style={styles.subtitle}>Aplicativo para Motoristas de Entrega</ThemedText>
          
          {!loading ? (
            <>
              <ThemedView style={styles.inputContainer}>
                <ThemedText style={styles.label}>Nome de Usuário</ThemedText>
                <TextInput
                  style={styles.input}
                  value={userName}
                  onChangeText={setUserName}
                  placeholder="Seu nome de usuário"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                />
              </ThemedView>
              
              <ThemedView style={styles.inputContainer}>
                <ThemedText style={styles.label}>Senha</ThemedText>
                <TextInput
                  style={styles.input}
                  value={senha}
                  onChangeText={setSenha}
                  placeholder="Sua senha"
                  placeholderTextColor="#999"
                  secureTextEntry
                />
              </ThemedView>
              
              {error ? (
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              ) : null}
              
              <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                <ThemedText style={styles.loginButtonText}>Iniciar o Dia</ThemedText>
                <Ionicons name="sunny-outline" size={20} color="white" />
              </TouchableOpacity>
            </>
          ) : (
            <ThemedView style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3274e9" />
              <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
            </ThemedView>
          )}
        </ThemedView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    padding: 25,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.7,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  loginButton: {
    backgroundColor: '#3274e9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    marginTop: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  errorText: {
    color: '#e53935',
    marginBottom: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  statusText: {
    marginTop: 20,
    fontSize: 14,
    textAlign: 'center',
  },
}); 