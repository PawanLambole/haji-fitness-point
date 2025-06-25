import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User,
  Users,
  Moon,
  Sun,
  Shield,
  LogOut,
  Plus,
  Trash2,
  Settings as SettingsIcon,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { colors, theme, toggleTheme } = useTheme();
  const { admin, logout } = useAuth();
  const router = useRouter();
  
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              console.log('Settings: Starting logout process...');
              
              // Call logout function
              await logout();
              
              console.log('Settings: Logout completed, navigating to login...');
              
              // Small delay to ensure state is cleared
              setTimeout(() => {
                router.replace('/login');
              }, 100);
              
            } catch (error) {
              console.error('Settings: Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const handleAddAdmin = () => {
    if (admin?.role !== 'owner') {
      Alert.alert('Access Denied', 'Only owner admin can add new admins');
      return;
    }
    
    Alert.prompt(
      'Add New Admin',
      'Enter admin email address',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: async (email) => {
            if (!email) return;
            
            try {
              setIsLoading(true);
              
              // Create auth user first
              const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email,
                password: 'TempPassword123!', // Temporary password
                email_confirm: true,
              });

              if (authError) {
                throw authError;
              }

              // Add to admin_users table
              const { error: dbError } = await supabase
                .from('admin_users')
                .insert({
                  id: authData.user.id,
                  email,
                  name: email.split('@')[0], // Use email prefix as default name
                  role: 'manager',
                });

              if (dbError) {
                throw dbError;
              }

              Alert.alert('Success', 'Admin added successfully. They will need to reset their password on first login.');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to add admin');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
      'plain-text',
      'admin@example.com'
    );
  };

  const handleDeleteAdmin = (adminUser: any) => {
    if (admin?.role !== 'owner') {
      Alert.alert('Access Denied', 'Only owner admin can delete admins');
      return;
    }

    if (adminUser.role === 'owner') {
      Alert.alert('Error', 'Cannot delete owner admin');
      return;
    }

    Alert.alert(
      'Delete Admin',
      `Are you sure you want to delete ${adminUser.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              
              // Delete from admin_users table
              const { error: dbError } = await supabase
                .from('admin_users')
                .delete()
                .eq('id', adminUser.id);

              if (dbError) {
                throw dbError;
              }

              // Delete auth user
              const { error: authError } = await supabase.auth.admin.deleteUser(adminUser.id);
              
              if (authError) {
                console.warn('Failed to delete auth user:', authError);
              }

              Alert.alert('Success', 'Admin deleted successfully');
              setAdminUsers(prev => prev.filter(user => user.id !== adminUser.id));
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete admin');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.surface]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Manage your account and preferences
          </Text>
        </View>

        {/* Profile Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <User size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.text }]}>
              {admin?.name}
            </Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
              {admin?.email}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.roleText, { color: colors.primary }]}>
                {admin?.role?.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Theme Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            {theme === 'light' ? (
              <Sun size={24} color={colors.primary} />
            ) : (
              <Moon size={24} color={colors.primary} />
            )}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Appearance</Text>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: colors.text }]}>
              Dark Mode
            </Text>
            <Switch
              value={theme === 'dark'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={theme === 'dark' ? '#000' : '#fff'}
            />
          </View>
        </View>

       

        {/* App Info Section */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <SettingsIcon size={24} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>App Information</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Version</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>1.0.0</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Build</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>28.06.2025</Text>
          </View>

          {/* Developed By Section */}
          <View style={[styles.infoItem, { flexDirection: 'column', alignItems: 'flex-start', marginTop: 16 }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary, marginBottom: 2 }]}>Developed By</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>Pawan, Atharv and Vedant/ Debug Dhule</Text>
            <Text style={[styles.infoLabel, { color: colors.textSecondary, marginTop: 8 }]}>Contact</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>pavanlambole578@gmail.com</Text>
            <Text style={[styles.infoLabel, { color: colors.textSecondary, marginTop: 8 }]}>© {new Date().getFullYear()} All rights reserved.</Text>
          </View>
        </View>
        
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    flex: 1,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: -8,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 100,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#fff',
  },
});