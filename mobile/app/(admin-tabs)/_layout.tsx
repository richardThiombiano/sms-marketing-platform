import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';

export default function AdminTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#EA580C',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          height: Platform.OS === 'ios' ? 82 : 62,
          paddingBottom: Platform.OS === 'ios' ? 24 : 6,
          paddingTop: 6,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          position: 'absolute',
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          marginTop: 1,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 4 } : { padding: 4 }}>
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={18} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="tenants"
        options={{
          title: 'Entreprises',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 4 } : { padding: 4 }}>
              <Ionicons name={focused ? 'business' : 'business-outline'} size={18} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Utilisateurs',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 4 } : { padding: 4 }}>
              <Ionicons name={focused ? 'people' : 'people-outline'} size={18} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="workers"
        options={{
          title: 'Workers',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 4 } : { padding: 4 }}>
              <Ionicons name={focused ? 'hardware-chip' : 'hardware-chip-outline'} size={18} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Compte',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#FFF7ED', borderRadius: 10, padding: 4 } : { padding: 4 }}>
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={18} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
