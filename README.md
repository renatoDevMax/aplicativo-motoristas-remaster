# Rastreador GPS para Motoristas de Entrega

Este aplicativo é uma solução de rastreamento GPS para motoristas de entrega, desenvolvido com React Native e Expo. O aplicativo permite autenticação do motorista e rastreamento de sua localização, mesmo quando está em segundo plano, enviando dados para um servidor Nest.js via Socket.IO.

## Funcionalidades Principais

- **Autenticação de Usuário:** Formulário de login para iniciar o dia de trabalho
- **Rastreamento de Localização:** Envio das coordenadas geográficas para um servidor a cada 15 segundos
- **Rastreamento em Segundo Plano:** Continua rastreando mesmo quando o aplicativo está em segundo plano ou com a tela bloqueada
- **Comunicação em Tempo Real:** Utiliza Socket.IO para enviar dados de localização em tempo real
- **Interface Elegante:** Design moderno e responsivo para uma experiência de usuário otimizada

## Fluxo de Funcionamento

1. **Tela de Login**
   - O usuário preenche seu nome de usuário e senha
   - Ao clicar em "Iniciar o Dia", o aplicativo:
     - Estabelece uma conexão Socket.IO com o servidor
     - Envia as credenciais para autenticação
     - Exibe mensagens de status em tempo real do processo
     - Recebe os dados do usuário autenticado
     - Inicia o rastreamento de localização

2. **Tela Principal**
   - Exibe as informações do motorista (nome, status)
   - Mostra a localização atual sendo rastreada
   - Exibe status do monitoramento
   - Permite finalizar o dia de trabalho

3. **Rastreamento em Segundo Plano**
   - A cada 15 segundos o aplicativo obtém a localização do dispositivo
   - Atualiza o objeto do usuário com as novas coordenadas
   - Envia o objeto atualizado para o servidor
   - Garante a reconexão caso a conexão socket tenha sido perdida

## Pré-requisitos

- Node.js (versão 16 ou superior)
- Expo CLI
- Android Studio (para testes em dispositivos Android)
- Xcode (para testes em dispositivos iOS)

## Instalação

1. Clone o repositório:
```bash
git clone [URL_DO_REPOSITÓRIO]
cd RastreadorGPS
```

2. Instale as dependências:
```bash
npm install
```

3. Configure a URL do servidor Socket.IO:
Edite o arquivo `app.json` e atualize o valor de `socketUrl` no objeto `extra`.

## Executando o Aplicativo

```bash
# Iniciar o aplicativo no modo de desenvolvimento
npm start

# Executar no Android
npm run android

# Executar no iOS
npm run ios
```

## Estrutura do Projeto

- `/app` - Telas e navegação do aplicativo
  - `/(auth)` - Telas de autenticação
  - `/(tabs)` - Telas principais após autenticação
- `/components` - Componentes reutilizáveis
- `/services` - Serviços para autenticação, localização e Socket.IO
- `/hooks` - Hooks personalizados
- `/types` - Definições de tipos TypeScript

## Comunicação com o Servidor

### Eventos Socket.IO:

1. **Autenticação:**
   - Cliente envia: `Autenticar Usuario` com `{ userName, senha }`
   - Servidor responde: `Usuário Autenticado` com objeto contendo dados do usuário

2. **Rastreamento:**
   - Cliente envia: `Localizar Entregador` com o objeto do usuário atualizado

## Permissões Necessárias

O aplicativo requer as seguintes permissões:

- **Android:**
  - ACCESS_FINE_LOCATION
  - ACCESS_COARSE_LOCATION
  - ACCESS_BACKGROUND_LOCATION
  - FOREGROUND_SERVICE
  - WAKE_LOCK

- **iOS:**
  - Localização em primeiro plano
  - Localização em segundo plano

## Licença

[Sua licença aqui]
