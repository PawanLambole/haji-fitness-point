import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, Text, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { useTheme, ThemeContextType } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

type Member = Database['public']['Tables']['members']['Row'];

export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  useEffect(() => {
    async function fetchMemberDetails() {
      try {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setMember(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load member details');
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchLatestPaymentMethod() {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('payment_method')
          .eq('member_id', id)
          .order('payment_date', { ascending: false })
          .limit(1)
          .single();
        if (!error && data) {
          setPaymentMethod(data.payment_method);
        } else {
          setPaymentMethod('Not specified');
        }
      } catch {
        setPaymentMethod('Not specified');
      }
    }

    fetchMemberDetails();
    fetchLatestPaymentMethod();
  }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ 
          title: 'Member Profile',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !member) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ 
          title: 'Member Profile',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }} />
        <Text style={{ color: colors.error }}>{error || 'Member not found'}</Text>
      </View>
    );
  }

  const isActive = new Date(member.membership_end) >= new Date();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: 'Member Profile',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }} 
      />
      
      <View style={styles.header}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.avatarText, { color: colors.text }]}>
            {member.full_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{member.full_name}</Text>
        <View style={styles.idContainer}>
          <Text style={[styles.membershipId, { color: colors.primary }]}>
            {member.assignment_number}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? colors.success : colors.error }]}>
            <Text style={styles.statusText}>{isActive ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <InfoCard
          icon="call-outline"
          label="Phone Number"
          value={member.phone_number}
          colors={colors}
        />
        <InfoCard
          icon="calendar-outline"
          label="Joining Date"
          value={format(new Date(member.joining_date), 'dd/MM/yyyy')}
          colors={colors}
        />
        <InfoCard
          icon="time-outline"
          label="Membership Period"
          value={`${format(new Date(member.membership_start), 'dd/MM/yyyy')} - ${format(new Date(member.membership_end), 'dd/MM/yyyy')}`}
          colors={colors}
        />
        <InfoCard
          icon="wallet-outline"
          label="Total Amount"
          value={`₹${member.total_amount.toFixed(2)}`}
          colors={colors}
        />
        <InfoCard
          icon="cash-outline"
          label="Payment Method"
          value={paymentMethod}
          colors={colors}
        />
      </View>

      <View style={styles.actionButtons}>
        {/* Only show Delete button */}
        <Pressable 
          style={[styles.button, { backgroundColor: colors.error }]}
          onPress={() => {/* TODO: Implement delete functionality */}}
        >
          <Ionicons name="trash-outline" size={24} color="white" />
          <Text style={styles.buttonText}>Delete Member</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

type InfoCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ThemeContextType['colors'];
}

function InfoCard({ icon, label, value, colors }: InfoCardProps) {
  return (
    <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.infoTextContainer}>
        <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  idContainer: {
    marginBottom: 8,
  },
  membershipId: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 16,
    gap: 12,
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoIconContainer: {
    marginRight: 16,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    padding: 16,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
