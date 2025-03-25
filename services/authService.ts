import socketService from './socketService';

export interface Usuario {
  userName: string;
  senha: string;
  status: string;
  localizacao: {
    latitude: number;
    longitude: number;
  };
}

class AuthService {
  private usuario: Usuario | null = null;

  // Método para autenticar o usuário
  async autenticarUsuario(userName: string, senha: string): Promise<Usuario> {
    return new Promise((resolve, reject) => {
      try {
        console.log('Iniciando processo de autenticação...');
        
        // Verifica se a conexão socket está estabelecida
        if (!socketService.isSocketConnected()) {
          console.log('Socket não conectado. Tentando conectar...');
          socketService.connect();
        }

        // Envia credenciais para autenticação
        console.log('Enviando credenciais para autenticação...');
        socketService.emit('Autenticar Usuario', { userName, senha });

        // Aguarda resposta do servidor no mesmo evento 'Autenticar Usuario'
        socketService.once('Autenticar Usuario', (resposta: any) => {
          console.log('Resposta recebida do servidor:', resposta);
          if (resposta.mensagemServer) {
            // Resposta com erro
            console.error('Erro na autenticação:', resposta.mensagemServer);
            reject(new Error(resposta.mensagemServer));
          } else {
            // Resposta com sucesso - é o objeto usuário
            console.log('Autenticação bem sucedida');
            this.usuario = resposta;
            resolve(resposta);
          }
        });

        // Define um timeout para a autenticação
        setTimeout(() => {
          console.error('Timeout na autenticação');
          reject(new Error('Tempo de autenticação expirado. Verifique sua conexão e tente novamente.'));
        }, 30000); // 30 segundos
      } catch (error) {
        console.error('Erro durante a autenticação:', error);
        reject(error);
      }
    });
  }

  // Método para obter o usuário autenticado
  getUsuario(): Usuario | null {
    return this.usuario;
  }

  // Método para atualizar localização do usuário
  atualizarLocalizacao(latitude: number, longitude: number): void {
    if (this.usuario) {
      this.usuario.localizacao = {
        latitude,
        longitude
      };
    }
  }

  // Método para obter o objeto completo atualizado
  getUsuarioAtualizado(): Usuario | null {
    return this.usuario;
  }

  // Método para limpar os dados do usuário (logout)
  limparUsuario(): void {
    this.usuario = null;
  }
}

export default new AuthService(); 