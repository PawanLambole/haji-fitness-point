import { useLocalSearchParams, router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  Pressable,
  Alert,
  Image,
  Switch,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { useTheme } from '../../contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { User, Phone, Calendar, DollarSign, Percent, Camera, Save, RefreshCw } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

type Member = Database['public']['Tables']['members']['Row'];

export default function EditMember() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [member, setMember] = useState<Member | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [assignmentNumber, setAssignmentNumber] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [membershipStart, setMembershipStart] = useState('');
  const [membershipEnd, setMembershipEnd] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the original photo path for deletion
  const [originalPhotoPath, setOriginalPhotoPath] = useState<string | null>(null);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [pendingPhotoPath, setPendingPhotoPath] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  // Date picker state
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [datePickerField, setDatePickerField] = useState<null | 'joiningDate' | 'membershipStart' | 'membershipEnd'>(null);
  const [tempDate, setTempDate] = useState(new Date());

  useEffect(() => {
    async function fetchMember() {
      setIsLoading(true);
      const { data, error } = await supabase.from('members').select('*').eq('id', id).single();
      setIsLoading(false);
      if (data) {
        setMember(data);
        setFullName(data.full_name);
        setPhoneNumber(data.phone_number);
        setAssignmentNumber(data.assignment_number || '');
        setTotalAmount(data.total_amount.toString());
        setJoiningDate(data.joining_date || '');
        setMembershipStart(data.membership_start || '');
        setMembershipEnd(data.membership_end || '');
        setDiscountAmount(data.discount_amount?.toString() || '0');
        setPhotoUrl(data.photo_url || null);
        setIsActive(data.is_active ?? true);
        if (data.photo_url) {
          // Always store the full storage path (e.g. 'photos/abc.jpg')
          if (data.photo_url.startsWith('http')) {
            // Extract after 'member-photos/'
            const match = data.photo_url.match(/member-photos\/(.+)$/);
            setOriginalPhotoPath(match && match[1] ? `photos/${match[1]}` : null);
          } else if (data.photo_url.startsWith('photos/')) {
            setOriginalPhotoPath(data.photo_url);
          } else {
            setOriginalPhotoPath(null);
          }
        }
      } else if (error) {
        setError(error.message);
      }
    }
    fetchMember();
  }, [id]);

  // Helper to upload image to Supabase Storage and return public URL
  const uploadPhotoToSupabase = async (uri: string, memberName: string) => {
    try {
      const fileExt = uri.split('.').pop();
      const fileName = `member_${memberName.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
      const filePath = `photos/${fileName}`;
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const fileBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
      let { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filePath, fileBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('member-photos').getPublicUrl(filePath);
      return { publicUrl: data.publicUrl, filePath };
    } catch (err) {
      console.error('Photo upload error:', err);
      throw new Error('Failed to upload photo');
    }
  };

  // Helper to delete image from Supabase Storage
  const deletePhotoFromSupabase = async (photoPath: string) => {
    if (!photoPath) return;
    let filePath = photoPath;
    // If it's a public URL, extract the path after '/object/public/member-photos/'
    if (photoPath.startsWith('http')) {
      const match = photoPath.match(/member-photos\/(.+)$/);
      if (match && match[1]) filePath = `photos/${match[1]}`;
    }
    // filePath should now be 'photos/abc.jpg'
    try {
      await supabase.storage.from('member-photos').remove([filePath]);
    } catch (err) {
      console.error('Photo delete error:', err);
    }
  };

  // Updated pickImage to allow choosing camera or gallery
  const pickImage = async () => {
    Alert.alert(
      'Edit Photo',
      'Choose a method to update the photo',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Please grant camera permissions to take a photo.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              setPendingPhoto(result.assets[0].uri);
              setRemovePhoto(false);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'Please grant camera roll permissions to add photos.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled) {
              setPendingPhoto(result.assets[0].uri);
              setRemovePhoto(false);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  async function handleSave() {
    setIsLoading(true);
    setError(null);
    let newPhotoUrl = photoUrl;
    let newPhotoPath = originalPhotoPath;
    try {
      // Debug log for date values
      console.log('Saving member with dates:', {
        joiningDate,
        membershipStart,
        membershipEnd
      });
      // If removing photo
      if (removePhoto && originalPhotoPath) {
        await deletePhotoFromSupabase(originalPhotoPath);
        newPhotoUrl = null;
        newPhotoPath = null;
      }
      // If uploading new photo
      if (pendingPhoto && fullName.trim()) {
        const uploadResult = await uploadPhotoToSupabase(pendingPhoto, fullName.trim());
        newPhotoUrl = uploadResult.publicUrl;
        newPhotoPath = uploadResult.filePath.replace('photos/', '');
        // Delete old photo if exists and not already removed
        if (originalPhotoPath && !removePhoto) {
          await deletePhotoFromSupabase(originalPhotoPath);
        }
      }
      const { error } = await supabase
        .from('members')
        .update({
          full_name: fullName,
          phone_number: phoneNumber,
          assignment_number: assignmentNumber,
          total_amount: parseFloat(totalAmount),
          joining_date: joiningDate,
          membership_start: membershipStart,
          membership_end: membershipEnd,
          discount_amount: parseFloat(discountAmount) || 0,
          photo_url: newPhotoUrl,
          is_active: isActive,
        })
        .eq('id', id);
      setIsLoading(false);
      if (!error) {
        setPhotoUrl(newPhotoUrl);
        setPendingPhoto(null);
        setRemovePhoto(false);
        setOriginalPhotoPath(newPhotoPath);
        Alert.alert('Success', 'Member updated successfully');
        router.back();
      } else {
        setError(error.message);
      }
    } catch (err) {
      setIsLoading(false);
      setError('Failed to update member');
    }
  }

  function addMonths(dateStr: string, months: number) {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  }

  async function handleRenew() {
    if (!membershipEnd) {
      Alert.alert('Error', 'Membership end date is missing');
      return;
    }
    // Show confirmation dialog before renewing
    Alert.alert(
      'Renew Membership',
      `Are you sure you want to renew the membership by 1 month?\nCurrent End: ${membershipEnd}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Renew',
          style: 'default',
          onPress: async () => {
            setIsLoading(true);
            const newEndDate = addMonths(membershipEnd, 1);
            const { error } = await supabase
              .from('members')
              .update({ membership_end: newEndDate })
              .eq('id', id);
            setIsLoading(false);
            if (!error) {
              setMembershipEnd(newEndDate);
              Alert.alert('Success', `Membership renewed until ${newEndDate}`);
            } else {
              setError(error.message);
            }
          }
        }
      ]
    );
  }

  // Helper to open date picker for a field
  const openDatePicker = (field: 'joiningDate' | 'membershipStart' | 'membershipEnd', currentValue: string) => {
    setDatePickerField(field);
    setTempDate(currentValue && currentValue.length === 10 ? new Date(currentValue) : new Date());
    setDatePickerVisible(true);
  };

  const handleDateConfirm = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    setDatePickerVisible(false);
    setDatePickerField(null);
    setTempDate(new Date());
    if (datePickerField === 'joiningDate') setJoiningDate(dateStr);
    if (datePickerField === 'membershipStart') setMembershipStart(dateStr);
    if (datePickerField === 'membershipEnd') setMembershipEnd(dateStr);
  };

  const handleDateCancel = () => {
    setDatePickerVisible(false);
    setDatePickerField(null);
    setTempDate(new Date());
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.surface]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <Stack.Screen options={{ title: 'Edit Member', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text }} />

        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Edit Member</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Update the member details below
          </Text>
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          {/* Photo Section */}
          <View style={styles.photoSection}>
            <TouchableOpacity
              style={[
                styles.photoContainer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
              onPress={pickImage}
            >
              {pendingPhoto ? (
                <Image source={{ uri: pendingPhoto }} style={styles.photo} />
              ) : photoUrl && !removePhoto ? (
                <Image source={{ uri: photoUrl }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={32} color={colors.textSecondary} />
                  <Text style={[styles.photoText, { color: colors.textSecondary }]}>
                    Add Photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Remove Photo Button - visible only if photo is added or pending */}
            {(pendingPhoto || (photoUrl && !removePhoto)) && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.error + '10' }}
                onPress={() => {
                  setPendingPhoto(null);
                  setRemovePhoto(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: colors.error, fontFamily: 'Inter-Bold', fontSize: 15, marginRight: 6 }}>
                  ×
                </Text>
                <Text style={{ color: colors.error, fontFamily: 'Inter-Bold', fontSize: 15 }}>
                  Remove Photo
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Assignment Number */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Assignment Number</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <User size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Assignment Number"
                placeholderTextColor={colors.textSecondary}
                value={assignmentNumber}
                onChangeText={setAssignmentNumber}
              />
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <User size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Full Name"
                placeholderTextColor={colors.textSecondary}
                value={fullName}
                onChangeText={setFullName}
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Phone size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Phone Number"
                placeholderTextColor={colors.textSecondary}
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Joining Date */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Joining Date</Text>
            <TouchableOpacity
              style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => openDatePicker('joiningDate', joiningDate)}
              activeOpacity={0.7}
            >
              <Calendar size={20} color={colors.textSecondary} />
              <Text style={[styles.input, { color: colors.text }]}>
                {joiningDate || 'YYYY-MM-DD'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Membership Start */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Membership Start</Text>
            <TouchableOpacity
              style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => openDatePicker('membershipStart', membershipStart)}
              activeOpacity={0.7}
            >
              <Calendar size={20} color={colors.textSecondary} />
              <Text style={[styles.input, { color: colors.text }]}>
                {membershipStart || 'YYYY-MM-DD'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Membership End */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Membership End</Text>
            <TouchableOpacity
              style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => openDatePicker('membershipEnd', membershipEnd)}
              activeOpacity={0.7}
            >
              <Calendar size={20} color={colors.textSecondary} />
              <Text style={[styles.input, { color: colors.text }]}>
                {membershipEnd || 'YYYY-MM-DD'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Payment Details */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Total Amount</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <DollarSign size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Total Amount"
                  placeholderTextColor={colors.textSecondary}
                  value={totalAmount}
                  onChangeText={setTotalAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Discount</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Percent size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Discount"
                  placeholderTextColor={colors.textSecondary}
                  value={discountAmount}
                  onChangeText={setDiscountAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Final Amount Display */}
          {(totalAmount || discountAmount !== '0') && (
            <View style={[styles.finalAmountContainer, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
              <Text style={[styles.finalAmountLabel, { color: colors.text }]}>Final Amount:</Text>
              <Text style={[styles.finalAmountValue, { color: colors.primary }]}>
                ₹{Math.max(0, (parseFloat(totalAmount) || 0) - (parseFloat(discountAmount) || 0)).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Active Status */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12, marginBottom: 24 }}>
            <Text style={[styles.label, { color: colors.text, marginBottom: 0, marginRight: 12 }]}>Active</Text>
            <Switch
              value={isActive}
              onValueChange={setIsActive}
              trackColor={{ false: colors.border, true: colors.primary + '40' }}
              thumbColor={isActive ? colors.primary : colors.textSecondary}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: isLoading ? colors.border : colors.primary,
                opacity: isLoading ? 0.6 : 1,
              }
            ]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Save size={20} color="#000" />
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>

          {/* Renew Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: colors.secondary || '#888',
                marginTop: 12,
              }
            ]}
            onPress={handleRenew}
            disabled={isLoading}
          >
            <RefreshCw size={20} color="#000" />
            <Text style={styles.saveButtonText}>Renew Membership (+1 Month)</Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker Modal */}
        <DateTimePickerModal
          isVisible={datePickerVisible}
          mode="date"
          date={tempDate}
          onConfirm={handleDateConfirm}
          onCancel={handleDateCancel}
          maximumDate={new Date(2100, 11, 31)}
          minimumDate={new Date(2000, 0, 1)}
          display="default"
        />
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  form: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  photoPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  photoText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  finalAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  finalAmountLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  finalAmountValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});
