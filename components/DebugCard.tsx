import React, { useState, useEffect } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, View, Text } from 'react-native';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';

interface Log {
  message: string;
  type: 'log' | 'error' | 'warn';
  timestamp: string;
}

const DebugCard: React.FC = () => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Interceptar console.log
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      originalLog.apply(console, args);
      addLog(args.join(' '), 'log');
    };

    console.error = (...args) => {
      originalError.apply(console, args);
      addLog(args.join(' '), 'error');
    };

    console.warn = (...args) => {
      originalWarn.apply(console, args);
      addLog(args.join(' '), 'warn');
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  const addLog = (message: string, type: 'log' | 'error' | 'warn') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => [...prevLogs, { message, type, timestamp }]);
  };

  const getLogColor = (type: 'log' | 'error' | 'warn') => {
    switch (type) {
      case 'error':
        return '#ff4444';
      case 'warn':
        return '#ffbb33';
      default:
        return '#00C851';
    }
  };

  if (!isVisible) return null;

  return (
    <ThemedView style={[styles.container, isExpanded ? styles.expanded : styles.collapsed]}>
      <TouchableOpacity 
        style={styles.header}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <ThemedText style={styles.headerText}>Debug Console</ThemedText>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setLogs([])}
          >
            <Ionicons name="trash-outline" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setIsVisible(false)}
          >
            <Ionicons name="close-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView 
          style={styles.logsContainer}
          contentContainerStyle={styles.logsContent}
        >
          {logs.map((log, index) => (
            <View key={index} style={styles.logEntry}>
              <ThemedText style={[styles.timestamp, { color: '#666' }]}>
                [{log.timestamp}]
              </ThemedText>
              <ThemedText style={[styles.logMessage, { color: getLogColor(log.type) }]}>
                {log.message}
              </ThemedText>
            </View>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
  },
  collapsed: {
    width: 150,
    height: 40,
  },
  expanded: {
    width: 300,
    height: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  headerButton: {
    padding: 5,
  },
  logsContainer: {
    flex: 1,
  },
  logsContent: {
    padding: 10,
  },
  logEntry: {
    flexDirection: 'row',
    marginBottom: 5,
    flexWrap: 'wrap',
  },
  timestamp: {
    fontSize: 12,
    marginRight: 5,
  },
  logMessage: {
    fontSize: 12,
    flex: 1,
  },
});

export default DebugCard; 