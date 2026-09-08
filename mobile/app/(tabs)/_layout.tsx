import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4F46E5',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          height: Platform.OS === 'ios' ? 96 : 72,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 12,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          position: 'absolute',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 6 } : { padding: 6 }}>
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={16} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="campaigns"
        options={{
          title: 'Campagnes',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 6 } : { padding: 6 }}>
              <Ionicons name={focused ? 'paper-plane' : 'paper-plane-outline'} size={18} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 6 } : { padding: 6 }}>
              <Ionicons name={focused ? 'chatbubbles' : 'chatbubbles-outline'} size={18} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          title: 'Contacts',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 6 } : { padding: 6 }}>
              <Ionicons name={focused ? 'people' : 'people-outline'} size={18} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Plus',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? { backgroundColor: '#EEF2FF', borderRadius: 12, padding: 6 } : { padding: 6 }}>
              <Ionicons name={focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'} size={18} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
