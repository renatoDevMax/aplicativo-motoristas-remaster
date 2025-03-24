import { Text, type TextProps, StyleSheet } from 'react-native';
import React, { forwardRef } from 'react';

import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export const ThemedText = forwardRef<Text, ThemedTextProps>(
  ({ style, lightColor, darkColor, type = 'default', ...otherProps }, ref) => {
    const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

    return (
      <Text
        ref={ref}
        style={[
          { color },
          type === 'default' ? styles.default : undefined,
          type === 'title' ? styles.title : undefined,
          type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
          type === 'subtitle' ? styles.subtitle : undefined,
          type === 'link' ? styles.link : undefined,
          style,
        ]}
        {...otherProps}
      />
    );
  }
);

// Nome para depuração
ThemedText.displayName = 'ThemedText';

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  title: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '700',
  },
  defaultSemiBold: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  link: {
    fontSize: 16,
    color: '#0a7ea4',
  },
});
