import socketService from './socketService';
import { entregasTipo } from '../types/entregaType';

class EntregasService {
  private entregas: entregasTipo[] = [];

  // Método para solicitar as entregas do dia
  async solicitarEntregasDoDia(): Promise<entregasTipo[]> {
    return new Promise((resolve, reject) => {
      try {
        // Verifica se a conexão socket está estabelecida
        if (!socketService.isSocketConnected()) {
          reject(new Error('Socket não conectado ao solicitar entregas'));
          return;
        }

        // Envia solicitação para obter entregas do dia
        socketService.emit('Entregas do Dia', {});

        // Aguarda resposta do servidor com a lista de entregas
        socketService.once('Entregas do Dia', (entregas: entregasTipo[]) => {
          if (Array.isArray(entregas)) {
            this.entregas = entregas;
            resolve(entregas);
          } else {
            reject(new Error('Formato de resposta inválido para entregas'));
          }
        });

        // Define um timeout para a solicitação
        setTimeout(() => {
          reject(new Error('Tempo de solicitação de entregas expirado. Tente novamente.'));
        }, 10000); // 10 segundos
      } catch (error) {
        reject(error);
      }
    });
  }

  // Método para obter as entregas armazenadas
  getEntregas(): entregasTipo[] {
    return this.entregas;
  }

  // Método para atualizar a lista de entregas
  setEntregas(novasEntregas: entregasTipo[]): void {
    this.entregas = novasEntregas;
  }

  // Método para atualizar o status de uma entrega
  atualizarStatusEntrega(entregaId: string, novoStatus: string): void {
    const entrega = this.entregas.find(e => e.id === entregaId);
    if (entrega) {
      entrega.status = novoStatus;
      // Aqui poderia ter um código para enviar a atualização para o servidor
    }
  }
}

// Exporta uma instância única do serviço
export default new EntregasService(); 