import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useColorScheme } from '~/hooks/useColorScheme';
import { getColors } from '~/constants/Colors';
import { ThemedView } from './ThemedView';
import { ThemedText } from './ThemedText';
import { Code, ExternalLink, Copy, Check, FileJson } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';

export function DeliveryApiDocs() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  
  const apiUrl = process.env.EXPO_PUBLIC_SUPABASE_URL 
    ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/delivery-api` 
    : 'https://your-project.supabase.co/functions/v1/delivery-api';
  
  const endpoints = [
    {
      method: 'GET',
      path: '/deliveries/pending',
      description: 'Get all pending deliveries that need to be assigned to a rider',
      auth: true,
      response: {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "status": "pickup_scheduled",
        "buyer": {
          "id": "user-123",
          "nickname": "john_doe",
          "phone": "+1234567890"
        },
        "seller": {
          "id": "user-456",
          "nickname": "sarah_style",
          "phone": "+0987654321"
        },
        "item": {
          "id": "item-789",
          "title": "Vintage Denim Jacket",
          "images": ["https://example.com/image1.jpg"]
        },
        "delivery": {
          "status": "pending",
          "pickup_address": "123 Seller St, New York, NY",
          "pickup_time_slot": "2025-06-15T14:00:00Z",
          "pickup_instructions": "Ring doorbell #2"
        }
      }
    },
    {
      method: 'GET',
      path: '/deliveries/assigned',
      description: 'Get all deliveries assigned to the authenticated rider',
      auth: true,
      response: [
        {
          "id": "123e4567-e89b-12d3-a456-426614174000",
          "status": "pickup_scheduled",
          "buyer": {
            "id": "user-123",
            "nickname": "john_doe"
          },
          "seller": {
            "id": "user-456",
            "nickname": "sarah_style"
          },
          "item": {
            "id": "item-789",
            "title": "Vintage Denim Jacket"
          },
          "delivery": {
            "status": "assigned"
          }
        }
      ]
    },
    {
      method: 'GET',
      path: '/deliveries/:id',
      description: 'Get detailed information about a specific delivery',
      auth: true,
      response: {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "status": "pickup_scheduled",
        "buyer": {
          "id": "user-123",
          "nickname": "john_doe",
          "phone": "+1234567890",
          "profile_picture": "https://example.com/profile1.jpg"
        },
        "seller": {
          "id": "user-456",
          "nickname": "sarah_style",
          "phone": "+0987654321",
          "profile_picture": "https://example.com/profile2.jpg"
        },
        "item": {
          "id": "item-789",
          "title": "Vintage Denim Jacket",
          "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"]
        },
        "delivery": {
          "id": "delivery-123",
          "status": "assigned",
          "pickup_address": "123 Seller St, New York, NY",
          "delivery_address": "456 Buyer Ave, New York, NY",
          "pickup_time_slot": "2025-06-15T14:00:00Z",
          "delivery_time_slot": "2025-06-16T14:00:00Z",
          "pickup_instructions": "Ring doorbell #2",
          "delivery_instructions": "Leave with doorman"
        }
      }
    },
    {
      method: 'POST',
      path: '/deliveries/:id/assign',
      description: 'Assign a delivery to the authenticated rider',
      auth: true,
      response: {
        "success": true,
        "message": "Delivery assigned successfully"
      }
    },
    {
      method: 'PUT',
      path: '/deliveries/:id/status',
      description: 'Update the status of a delivery',
      auth: true,
      body: {
        status: 'en_route_to_pickup | at_pickup | picked_up | en_route_to_delivery | at_delivery | delivered | failed',
        notes: 'Optional notes about the status update',
        verification_code: 'Required for picked_up and delivered statuses',
        location: {
          latitude: 37.7749,
          longitude: -122.4194
        }
      },
      response: {
        "success": true,
        "message": "Delivery status updated successfully"
      }
    },
    {
      method: 'GET',
      path: '/deliveries/:id/history',
      description: 'Get the status history for a delivery',
      auth: true,
      response: [
        {
          "id": "history-123",
          "status": "assigned",
          "notes": "Assigned to rider",
          "location": null,
          "created_at": "2025-06-15T10:00:00Z",
          "created_by": "rider-123"
        },
        {
          "id": "history-124",
          "status": "en_route_to_pickup",
          "notes": "On the way to pickup",
          "location": "POINT(-122.4194 37.7749)",
          "created_at": "2025-06-15T10:15:00Z",
          "created_by": "rider-123"
        }
      ]
    },
  ];
  
  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedEndpoint(text);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };
  
  const openSwaggerDocs = () => {
    Alert.alert("Swagger UI", "In a production environment, this would open the Swagger UI documentation for your API.");
  };
  
  const toggleEndpoint = (path: string) => {
    if (expandedEndpoint === path) {
      setExpandedEndpoint(null);
    } else {
      setExpandedEndpoint(path);
    }
  };
  
  const styles = createStyles(colors);
  
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Code size={24} color={colors.primary} />
          <ThemedText style={styles.title}>Delivery API Documentation</ThemedText>
        </View>
        <TouchableOpacity 
          style={[styles.swaggerButton, { backgroundColor: colors.primary }]}
          onPress={openSwaggerDocs}
        >
          <FileJson size={16} color="#FFFFFF" />
          <Text style={styles.swaggerButtonText}>Swagger UI</Text>
        </TouchableOpacity>
      </View>
      
      <ThemedText style={styles.description}>
        This API allows external rider applications to interact with the Remore delivery system.
        All endpoints require authentication using a Bearer token.
      </ThemedText>
      
      <View style={[styles.baseUrlContainer, { backgroundColor: colors.surface }]}>
        <ThemedText style={styles.baseUrlLabel}>Base URL:</ThemedText>
        <ThemedText style={styles.baseUrl}>{apiUrl}</ThemedText>
        <TouchableOpacity 
          style={styles.copyButton}
          onPress={() => copyToClipboard(apiUrl)}
        >
          {copiedEndpoint === apiUrl ? (
            <Check size={16} color={colors.success} />
          ) : (
            <Copy size={16} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.endpointsContainer} showsVerticalScrollIndicator={false}>
        {endpoints.map((endpoint, index) => (
          <View 
            key={`${endpoint.method}-${endpoint.path}`} 
            style={[styles.endpointCard, { backgroundColor: colors.surface }]}
          >
            <TouchableOpacity 
              style={styles.endpointHeader}
              onPress={() => toggleEndpoint(endpoint.path)}
            >
              <View style={styles.methodContainer}>
                <View style={[
                  styles.methodBadge, 
                  { 
                    backgroundColor: 
                      endpoint.method === 'GET' ? colors.info + '20' :
                      endpoint.method === 'POST' ? colors.success + '20' :
                      endpoint.method === 'PUT' ? colors.warning + '20' :
                      colors.error + '20'
                  }
                ]}>
                  <ThemedText style={[
                    styles.methodText,
                    { 
                      color: 
                        endpoint.method === 'GET' ? colors.info :
                        endpoint.method === 'POST' ? colors.success :
                        endpoint.method === 'PUT' ? colors.warning :
                        colors.error
                    }
                  ]}>
                    {endpoint.method}
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.pathContainer}>
                <ThemedText style={styles.pathText}>{endpoint.path}</ThemedText>
                <TouchableOpacity 
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(`${apiUrl}${endpoint.path.replace(':id', '{id}')}`)}
                >
                  {copiedEndpoint === `${apiUrl}${endpoint.path.replace(':id', '{id}')}` ? (
                    <Check size={16} color={colors.success} />
                  ) : (
                    <Copy size={16} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
            
            <ThemedText style={[styles.endpointDescription, { color: colors.textSecondary }]}>
              {endpoint.description}
            </ThemedText>
            
            {endpoint.auth && (
              <View style={styles.authContainer}>
                <ThemedText style={[styles.authLabel, { color: colors.textSecondary }]}>
                  Authentication:
                </ThemedText>
                <ThemedText style={styles.authText}>
                  Bearer Token
                </ThemedText>
              </View>
            )}
            
            {expandedEndpoint === endpoint.path && (
              <>
                {endpoint.body && (
                  <View style={styles.bodyContainer}>
                    <ThemedText style={[styles.bodyLabel, { color: colors.textSecondary }]}>
                      Request Body:
                    </ThemedText>
                    <View style={[styles.codeBlock, { backgroundColor: colors.background }]}>
                      <ThemedText style={[styles.codeText, { color: colors.text }]}>
                        {JSON.stringify(endpoint.body, null, 2)}
                      </ThemedText>
                      <TouchableOpacity 
                        style={[styles.copyCodeButton, { backgroundColor: colors.surface }]}
                        onPress={() => copyToClipboard(JSON.stringify(endpoint.body, null, 2))}
                      >
                        {copiedEndpoint === JSON.stringify(endpoint.body, null, 2) ? (
                          <Check size={14} color={colors.success} />
                        ) : (
                          <Copy size={14} color={colors.textSecondary} />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                
                <View style={styles.responseContainer}>
                  <ThemedText style={[styles.responseLabel, { color: colors.textSecondary }]}>
                    Response:
                  </ThemedText>
                  <View style={[styles.codeBlock, { backgroundColor: colors.background }]}>
                    <ThemedText style={[styles.codeText, { color: colors.text }]}>
                      {JSON.stringify(endpoint.response, null, 2)}
                    </ThemedText>
                    <TouchableOpacity 
                      style={[styles.copyCodeButton, { backgroundColor: colors.surface }]}
                      onPress={() => copyToClipboard(JSON.stringify(endpoint.response, null, 2))}
                    >
                      {copiedEndpoint === JSON.stringify(endpoint.response, null, 2) ? (
                        <Check size={14} color={colors.success} />
                      ) : (
                        <Copy size={14} color={colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
            
            {expandedEndpoint !== endpoint.path && (
              <TouchableOpacity 
                style={[styles.expandButton, { borderColor: colors.border }]}
                onPress={() => toggleEndpoint(endpoint.path)}
              >
                <ThemedText style={[styles.expandButtonText, { color: colors.textSecondary }]}>
                  Show Details
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  swaggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  swaggerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  description: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    lineHeight: 22,
  },
  baseUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  baseUrlLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginRight: 8,
  },
  baseUrl: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  copyButton: {
    padding: 4,
  },
  endpointsContainer: {
    flex: 1,
  },
  endpointCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  endpointHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  methodContainer: {
    marginRight: 12,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  methodText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  pathContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pathText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },
  endpointDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 12,
    lineHeight: 20,
  },
  authContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  authLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginRight: 8,
  },
  authText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  bodyContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  bodyLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  codeBlock: {
    padding: 12,
    borderRadius: 8,
    position: 'relative',
  },
  codeText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  copyCodeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    borderRadius: 4,
  },
  responseContainer: {
    marginTop: 8,
  },
  responseLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  expandButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  expandButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
});