// This file is a fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import React from 'react';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';

// Add your SFSymbol to MaterialIcons mappings here.
const MAPPING = {
  // See MaterialIcons here: https://icons.expo.fyi
  // See SF Symbols in the SF Symbols app on Mac.
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'cube.box.fill': 'inventory', // Alterado para "inventory"
  'people.carry.box.fill': 'local_shipping', // Usando o ícone de caminhão de entrega
  'delivery.box': 'delivery_dining', // Usando o ícone de entrega de comida (um motociclista)
  'shipping.box': 'local_shipping', // Caminhão de entrega
  'package.box': 'inventory', // Prateleira de estoque
  'list.bullet': 'list', // Para ícone de Entregas
  'map.fill': 'map', // Para ícone de Mapa
  'box': 'package', // Ícone alternativo de caixa
  'package': 'local_shipping', // Ícone de pacote/entrega
  'cube': 'cube', // Ícone de cubo
  'cube.outline': 'inventory', // Versão outline do ícone de cubo
  'question.mark': 'help', // Mapeamento para ícone de interrogação
} as Partial<
  Record<
    import('expo-symbols').SymbolViewProps['name'],
    React.ComponentProps<typeof MaterialIcons>['name']
  >
>;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and MaterialIcons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to MaterialIcons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
