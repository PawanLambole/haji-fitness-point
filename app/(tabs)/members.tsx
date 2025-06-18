import { router } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useMembers } from '@/hooks/useMembers';
import { LinearGradient } from 'expo-linear-gradient';
import { Search, Filter, CreditCard as Edit, Trash2, Phone, Calendar, DollarSign, User } from 'lucide-react-native';
import { Database } from '@/types/database';

type Member = Database['public']['Tables']['members']['Row'];

export default function MembersScreen() {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'assignment' | 'date'>('date');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  
  // Use the optimized hook with filters
  const { 
    members, 
    isLoading, 
    error, 
    hasMore, 
    deleteMember, 
    loadMore, 
    refresh 
  } = useMembers({
    search: searchQuery,
    isActive: showActiveOnly ? true : undefined,
    limit: 20, // Load 20 members at a time
  });

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleDeleteMember = (member: Member) => {
    Alert.alert(
      'Delete Member',
      `Are you sure you want to delete ${member.full_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMember(member.id);
              Alert.alert('Success', 'Member deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete member');
            }
          },
        },
      ]
    );
  };

  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadMore();
    }
  };

  const renderFooter = () => {
    if (!hasMore) return null;
    
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Loading more members...
        </Text>
      </View>
    );
  };

  const handleMemberPress = (memberId: string) => {
    router.push({ pathname: "/member/[id]", params: { id: memberId } });
  };

  const renderItem = useCallback(({ item }: { item: Member }) => (
    <TouchableOpacity
      style={[styles.memberCard, { backgroundColor: colors.surface }]}
      onPress={() => handleMemberPress(item.id)}
    >
      <View style={styles.memberHeader}>
        <View style={styles.memberInfo}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={styles.avatarImage} />
            ) : (
              <User size={24} color="#000" />
            )}
          </View>
          <View style={styles.memberDetails}>
            <Text style={[styles.memberName, { color: colors.text }]}>
              {item.full_name}
            </Text>
            <Text style={[styles.assignmentNumber, { color: colors.primary }]}>
              {item.assignment_number}
            </Text>
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: item.is_active && !isExpired(item.membership_end)
                      ? colors.success + '20'
                      : colors.error + '20',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { 
                      color: item.is_active && !isExpired(item.membership_end) 
                        ? colors.success 
                        : colors.error 
                    },
                  ]}
                >
                  {item.is_active && !isExpired(item.membership_end) ? 'Active' : 'Expired'}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.memberActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Edit size={20} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteMember(item)}
          >
            <Trash2 size={20} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.memberStats}>
        <View style={styles.statItem}>
          <Phone size={16} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {item.phone_number}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Calendar size={16} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {new Date(item.membership_end).toLocaleDateString('en-IN')}
          </Text>
        </View>
        <View style={styles.statItem}>
          <DollarSign size={16} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            ₹{item.total_amount}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [colors, handleDeleteMember]);

  if (error) {
    return (
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={refresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.background, colors.surface]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Members</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {members.length} members loaded
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search members..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton, 
            { 
              backgroundColor: showActiveOnly ? colors.primary : colors.surface,
              borderColor: colors.border,
              borderWidth: showActiveOnly ? 0 : 1,
            }
          ]}
          onPress={() => setShowActiveOnly(!showActiveOnly)}
        >
          <Filter size={20} color={showActiveOnly ? "#000" : colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={members}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        getItemLayout={(data, index) => ({
          length: 120, // Approximate height of each item
          offset: 120 * index,
          index,
        })}
      />

      {isLoading && members.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading members...</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#000',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginTop: 12,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
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
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  memberCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  memberInfo: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  assignmentNumber: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
});