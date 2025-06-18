import { useEffect, useState } from 'react';
import { View, ScrollView, Image, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { format } from 'date-fns';

type Member = Database['public']['Tables']['members']['Row'];

export default function MemberProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [member, setMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    fetchMemberDetails();
  }, [id]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Member Profile' }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !member) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Member Profile' }} />
        <Text style={{ color: colors.error }}>{error || 'Member not found'}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: member.full_name }} />
      
      <View style={styles.header}>
        {member.photo_url ? (
          <Image
            source={{ uri: member.photo_url }}
            style={styles.profilePhoto}
          />
        ) : (
          <View style={[styles.profilePhotoPlaceholder, { backgroundColor: colors.border }]}>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              {member.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.name, { color: colors.text }]}>{member.full_name}</Text>
        <Text style={[styles.membershipId, { color: colors.textSecondary }]}>
          #{member.assignment_number}
        </Text>
      </View>

      <View style={styles.infoSection}>
        <InfoItem
          label="Phone Number"
          value={member.phone_number}
          colors={colors}
        />
        <InfoItem
          label="Joining Date"
          value={format(new Date(member.joining_date), 'PPP')}
          colors={colors}
        />
        <InfoItem
          label="Membership Period"
          value={`${format(new Date(member.membership_start), 'PPP')} - ${format(new Date(member.membership_end), 'PPP')}`}
          colors={colors}
        />
        <InfoItem
          label="Total Amount"
          value={`₹${member.total_amount.toFixed(2)}`}
          colors={colors}
        />
        {member.discount_amount > 0 && (
          <InfoItem
            label="Discount"
            value={`₹${member.discount_amount.toFixed(2)}`}
            colors={colors}
          />
        )}
        <InfoItem
          label="Status"
          value={member.is_active ? 'Active' : 'Inactive'}
          colors={colors}
          valueStyle={member.is_active ? { color: colors.success } : { color: colors.error }}
        />
      </View>
    </ScrollView>
  );
}

function InfoItem({ label, value, colors, valueStyle }: {
  label: string;
  value: string;
  colors: any;
  valueStyle?: any;
}) {
  return (
    <View style={styles.infoItem}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.text }, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    padding: 20,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  profilePhotoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 48,
    fontFamily: 'Inter-SemiBold',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  membershipId: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  infoSection: {
    padding: 20,
  },
  infoItem: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});
