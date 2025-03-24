import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import authService from '@/services/authService';
import entregasService from '@/services/entregasService';
import socketService from '@/services/socketService';
import { entregasTipo } from '@/types/entregaType';

type TabBarIconProps = {
  color: string;
  focused: boolean;
};

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [entregasDisponiveis, setEntregasDisponiveis] = useState<number>(0);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const usuarioAutenticado = authService.getUsuario();
    
    if (!usuarioAutenticado) {
      // Redirecionar para a tela de login se não estiver autenticado
      router.replace('/(auth)/login');
    }
  }, []);

  useEffect(() => {
    const usuario = authService.getUsuario();
    if (!usuario) return;

    // Função para atualizar o número de entregas disponíveis
    const atualizarEntregasDisponiveis = () => {
      const entregas = entregasService.getEntregas();
      const disponiveis = entregas.filter(
        entrega => entrega.status === 'Disponível'
      ).length;
      setEntregasDisponiveis(disponiveis);
    };

    // Atualizar inicialmente
    atualizarEntregasDisponiveis();

    // Configurar listener para atualizações
    const handleEntregasAtualizadas = (entregas: entregasTipo[]) => {
      const disponiveis = entregas.filter(
        entrega => entrega.status === 'Disponível'
      ).length;
      setEntregasDisponiveis(disponiveis);
    };

    // Registrar o listener
    const socket = socketService.getSocket();
    if (socket) {
      socket.on('Entregas do Dia', handleEntregasAtualizadas);
    }

    return () => {
      if (socket) {
        socket.off('Entregas do Dia', handleEntregasAtualizadas);
      }
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, focused }: TabBarIconProps) => (
            <Ionicons 
              name={focused ? 'home' : 'home-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
      <Tabs.Screen
        name="entregas"
        options={{
          title: 'Entregas',
          tabBarIcon: ({ color, focused }: TabBarIconProps) => (
            <Ionicons 
              name={focused ? 'list' : 'list-outline'} 
              size={24} 
              color={color} 
            />
          ),
          tabBarBadge: entregasDisponiveis > 0 ? entregasDisponiveis : undefined,
          tabBarBadgeStyle: {
            backgroundColor: '#3274e9',
            color: '#fff',
            fontSize: 12,
            fontWeight: 'bold',
            minWidth: 20,
            height: 20,
            borderRadius: 10,
            paddingHorizontal: 6,
            paddingTop: 2,
          },
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: 'Mapa',
          tabBarIcon: ({ color, focused }: TabBarIconProps) => (
            <Ionicons 
              name={focused ? 'map' : 'map-outline'} 
              size={24} 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}
