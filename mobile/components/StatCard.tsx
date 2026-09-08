import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  gradientColors: [string, string];
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({
  icon,
  value,
  label,
  gradientColors,
  trend,
  trendUp,
}: StatCardProps) {
  return (
    <Pressable
      style={({ pressed }) => ({
        flex: 1,
        opacity: pressed ? 0.95 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
      })}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          padding: 16,
          minHeight: 140,
          shadowColor: gradientColors[0],
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.25)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
          }}
        >
          <Ionicons name={icon} size={20} color="#FFFFFF" />
        </View>

        <Text
          style={{
            fontSize: 24,
            fontWeight: '800',
            color: '#FFFFFF',
            marginBottom: 4,
          }}
        >
          {value}
        </Text>

        <Text
          style={{
            fontSize: 12,
            fontWeight: '500',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: 8,
          }}
        >
          {label}
        </Text>

        {trend && (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons
              name={trendUp ? 'trending-up' : 'trending-down'}
              size={14}
              color={trendUp ? '#A7F3D0' : '#FCA5A5'}
            />
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: trendUp ? '#A7F3D0' : '#FCA5A5',
                marginLeft: 4,
              }}
            >
              {trend}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}
