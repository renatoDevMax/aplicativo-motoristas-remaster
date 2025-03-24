import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';

// Defina a URL do seu servidor Nest.js aqui
const SOCKET_SERVER_URL = Constants.expoConfig?.extra?.socketUrl || 'http://seu-servidor.com';

class SocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  // Inicializa a conexão com o servidor
  connect() {
    if (this.socket) return;

    this.socket = io(SOCKET_SERVER_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.setupEventListeners();
  }

  // Retorna a instância do socket
  getSocket(): Socket | null {
    return this.socket;
  }

  // Configura listeners de eventos do socket
  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Conectado ao servidor socket');
      this.isConnected = true;
    });

    this.socket.on('disconnect', () => {
      console.log('Desconectado do servidor socket');
      this.isConnected = false;
    });

    this.socket.on('error', (error) => {
      console.error('Erro na conexão socket:', error);
    });
  }

  // Verifica se o socket está conectado
  isSocketConnected(): boolean {
    return this.isConnected;
  }

  // Método para emitir eventos
  emit(event: string, data: any, callback?: Function): void {
    if (!this.socket || !this.isConnected) {
      console.log('Socket não conectado. Tentando reconectar...');
      this.connect();
      return;
    }

    if (callback) {
      this.socket.emit(event, data, callback);
    } else {
      this.socket.emit(event, data);
    }
  }

  // Método para ouvir eventos uma única vez
  once(event: string, callback: (data: any) => void): void {
    if (!this.socket) {
      console.log('Socket não disponível');
      return;
    }

    this.socket.once(event, callback);
  }

  // Método para registrar listeners de eventos
  on(event: string, callback: (data: any) => void): void {
    if (!this.socket) {
      console.log('Socket não disponível');
      return;
    }

    this.socket.on(event, callback);
  }

  // Método para remover listeners de eventos
  off(event: string, callback?: (data: any) => void): void {
    if (!this.socket) return;

    if (callback) {
      this.socket.off(event, callback);
    } else {
      this.socket.off(event);
    }
  }

  // Envia a localização para o servidor
  enviarLocalizacao(usuario: any) {
    if (!this.socket || !this.isConnected) {
      console.log('Socket não conectado. Tentando reconectar...');
      this.connect();
      return;
    }

    this.socket.emit('Localizar Entregador', usuario);
  }

  // Desconecta do servidor
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

// Exporta uma instância única do serviço
export default new SocketService(); 