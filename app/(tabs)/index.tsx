import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import { usePayments } from '@/hooks/usePayments';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  UserPlus,
  Calendar,
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { admin } = useAuth();
  const { members, refresh } = useMembers(); // <-- add refresh here
  const { getPaymentStats } = usePayments();
  const router = useRouter();

  const [paymentStats, setPaymentStats] = useState({
    totalRevenue: 0,
    totalPayments: 0,
    cashPayments: 0,
    upiPayments: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadPaymentStats = async () => {
      const stats = await getPaymentStats();
      setPaymentStats(stats);
    };
    loadPaymentStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh(); // <-- refresh members from backend
    const stats = await getPaymentStats();
    setPaymentStats(stats);
    setRefreshing(false);
  };

  const activeMembers = members.filter((member) => {
    const isActive = member.is_active;
    const notExpired = new Date(member.membership_end) >= new Date();
    return isActive && notExpired;
  });

  const newThisMonth = members.filter((member) => {
    const memberDate = new Date(member.created_at);
    const currentDate = new Date();
    return (
      memberDate.getMonth() === currentDate.getMonth() &&
      memberDate.getFullYear() === currentDate.getFullYear()
    );
  });

  const stats = [
    {
      title: 'Total Members',
      value: members.length.toString(),
      icon: Users,
      color: colors.primary,
      change: `+${newThisMonth.length} this month`,
    },
    {
      title: 'Active Members',
      value: activeMembers.length.toString(),
      icon: TrendingUp,
      color: colors.success,
      change: `${Math.round(
        (activeMembers.length / Math.max(members.length, 1)) * 100
      )}% active`,
    },
    {
      title: 'New This Month',
      value: newThisMonth.length.toString(),
      icon: UserPlus,
      color: colors.warning,
      change: 'New registrations',
    },
    {
      title: 'Revenue',
      value: `₹${paymentStats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: colors.error,
      change: `${paymentStats.totalPayments} payments`,
    },
  ];

  const recentActivities = members
    .slice(0, 4)
    .map((member) => ({
      id: member.id,
      action: 'New member added',
      member: member.full_name,
      time: new Date(member.created_at).toLocaleDateString('en-IN'),
    }));

  return (
    <LinearGradient
      colors={[colors.background, colors.surface]}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>
            Welcome back, {admin?.name}!
          </Text>
          <Text style={[styles.date, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        <View style={styles.statsGrid}>
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            // Only make non-Revenue cards touchable
            if (stat.title !== 'Revenue') {
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => router.push('/members')}
                >
                  <View style={styles.statHeader}>
                    <Icon size={24} color={stat.color} />
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {stat.value}
                    </Text>
                  </View>
                  <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
                    {stat.title}
                  </Text>
                  <Text style={[styles.statChange, { color: stat.color }]}>
                    {stat.change}
                  </Text>
                </TouchableOpacity>
              );
            }
            // Render Revenue card as a plain View
            return (
              <View
                key={index}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.statHeader}>
                  <Icon size={24} color={stat.color} />
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {stat.value}
                  </Text>
                </View>
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
                  {stat.title}
                </Text>
                <Text style={[styles.statChange, { color: stat.color }]}>
                  {stat.change}
                </Text>
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Activities
            </Text>
            <Clock size={20} color={colors.textSecondary} />
          </View>

          {recentActivities.length > 0 ? (
            recentActivities.map((activity) => (
              <View
                key={activity.id}
                style={[
                  styles.activityItem,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.activityContent}>
                  <Text style={[styles.activityAction, { color: colors.text }]}>
                    {activity.action}
                  </Text>
                  <Text style={[styles.activityMember, { color: colors.primary }]}>
                    {activity.member}
                  </Text>
                </View>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                  {activity.time}
                </Text>
              </View>
            ))
          ) : (
            <Text style={[styles.noActivities, { color: colors.textSecondary }]}>
              No recent activities
            </Text>
          )}
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Actions
          </Text>

          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={() => router.push('/add-member')}
            >
              <UserPlus size={24} color="#000" />
              <Text style={styles.quickActionText}>Add Member</Text>
            </TouchableOpacity>

            
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
  greeting: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  statTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  activityContent: {
    flex: 1,
  },
  activityAction: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 2,
  },
  activityMember: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  activityTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  noActivities: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    paddingVertical: 20,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
  },
});
