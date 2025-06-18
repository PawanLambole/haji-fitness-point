import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import { usePayments } from '@/hooks/usePayments';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { sendWhatsAppMessage, createMembershipMessage } from '@/utils/whatsapp';
import { User, Phone, Calendar, DollarSign, Camera, Save, Percent, CircleAlert as AlertCircle } from 'lucide-react-native';

export default function AddMemberScreen() {
  const { colors } = useTheme();
  const { user, session } = useAuth();
  const { addMember, generateAssignmentNumber } = useMembers();
  const { addPayment } = usePayments();
  
  const [formData, setFormData] = useState({
    assignmentNumber: '',
    fullName: '',
    phoneNumber: '',
    joiningDate: new Date().toISOString().split('T')[0],
    membershipStart: new Date().toISOString().split('T')[0],
    membershipEnd: '',
    totalAmount: '',
    discountAmount: '0',
    paymentMethod: 'cash' as 'cash' | 'upi',
    photo: null as string | null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !session) {
    return (
      <LinearGradient
        colors={[colors.background, colors.surface]}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <AlertCircle size={48} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.error }]}>
            Authentication Required
          </Text>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>
            Please log in to add members.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  const pickImage = async () => {
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
      setFormData(prev => ({ ...prev, photo: result.assets[0].uri }));
    }
  };

  const calculateEndDate = (startDate: string, months: number = 6) => {
    const start = new Date(startDate);
    start.setMonth(start.getMonth() + months);
    return start.toISOString().split('T')[0];
  };

  const validateForm = () => {
    setError(null);
    
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return false;
    }
    
    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      return false;
    }
    
    if (formData.phoneNumber.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid phone number (at least 10 digits)');
      return false;
    }

    const totalAmount = parseFloat(formData.totalAmount) || 0;
    const discountAmount = parseFloat(formData.discountAmount) || 0;

    if (discountAmount > totalAmount) {
      setError('Discount amount cannot be greater than total amount');
      return false;
    }

    if (totalAmount < 0 || discountAmount < 0) {
      setError('Amounts cannot be negative');
      return false;
    }
    
    return true;
  };

  const handleSaveMember = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      console.log('=== Starting member creation process ===');
      console.log('User ID:', user.id);
      console.log('Session active:', !!session);
      
      // Generate assignment number if not provided
      const assignmentNumber = formData.assignmentNumber.trim() || await generateAssignmentNumber();
      console.log('Assignment number:', assignmentNumber);
      
      // Calculate end date if not provided
      const membershipEnd = formData.membershipEnd || calculateEndDate(formData.membershipStart);
      console.log('Membership end date:', membershipEnd);

      const totalAmount = parseFloat(formData.totalAmount) || 0;
      const discountAmount = parseFloat(formData.discountAmount) || 0;
      const finalAmount = totalAmount - discountAmount;

      console.log('Payment amounts - Total:', totalAmount, 'Discount:', discountAmount, 'Final:', finalAmount);

      // Prepare member data
      const memberInsertData = {
        assignment_number: assignmentNumber,
        full_name: formData.fullName.trim(),
        phone_number: formData.phoneNumber.trim(),
        joining_date: formData.joiningDate,
        membership_start: formData.membershipStart,
        membership_end: membershipEnd,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        photo_url: formData.photo,
        is_active: true,
      };

      console.log('Member insert data:', memberInsertData);
      
      // Add member to database
      const newMember = await addMember(memberInsertData);

      if (!newMember) {
        throw new Error('Failed to create member - no data returned');
      }

      console.log('Member created successfully:', newMember.id);

      // Add payment record if amount > 0
      if (finalAmount > 0) {
        console.log('Adding payment record...');
        
        const paymentData = {
          member_id: newMember.id,
          amount: finalAmount,
          payment_method: formData.paymentMethod,
          payment_date: formData.membershipStart,
          notes: discountAmount > 0 ? `Discount applied: ₹${discountAmount}` : null,
        };

        console.log('Payment data:', paymentData);
        
        await addPayment(paymentData);
        console.log('Payment added successfully');
      }

      // Send WhatsApp message (non-blocking)
      try {
        const whatsappMessage = createMembershipMessage(
          formData.fullName,
          formData.membershipStart,
          membershipEnd,
          assignmentNumber
        );

        const whatsappSent = await sendWhatsAppMessage(formData.phoneNumber, whatsappMessage);
        console.log('WhatsApp message sent:', whatsappSent);

        Alert.alert(
          'Success',
          `Member added successfully! ${whatsappSent ? 'WhatsApp notification sent.' : 'WhatsApp notification failed.'}`,
          [
            {
              text: 'OK',
              onPress: resetForm,
            },
          ]
        );
      } catch (whatsappError) {
        console.error('WhatsApp error:', whatsappError);
        Alert.alert(
          'Success',
          '',
          [
            {
              text: 'OK',
              onPress: resetForm,
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('=== Error adding member ===');
      console.error('Error details:', error);
      console.error('Error message:', error.message);
      console.error('Error code:', error.code);
      
      let errorMessage = 'Failed to add member. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code === '23505') {
        errorMessage = 'Assignment number already exists. Please try again.';
      } else if (error.code === '23503') {
        errorMessage = 'Database constraint error. Please check your data.';
      } else if (error.code === '23514') {
        errorMessage = 'Invalid data: Please check all fields are filled correctly.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      assignmentNumber: '',
      fullName: '',
      phoneNumber: '',
      joiningDate: new Date().toISOString().split('T')[0],
      membershipStart: new Date().toISOString().split('T')[0],
      membershipEnd: '',
      totalAmount: '',
      discountAmount: '0',
      paymentMethod: 'cash',
      photo: null,
    });
    setError(null);
  };

  return (
    <LinearGradient
      colors={[colors.background, colors.surface]}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Add New Member</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Fill in the member details below
          </Text>
        </View>

        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
            <AlertCircle size={20} color={colors.error} />
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
              {formData.photo ? (
                <Image source={{ uri: formData.photo }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Camera size={32} color={colors.textSecondary} />
                  <Text style={[styles.photoText, { color: colors.textSecondary }]}>
                    Add Photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Assignment Number */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Assignment Number</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <User size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Auto-generated if empty"
                placeholderTextColor={colors.textSecondary}
                value={formData.assignmentNumber}
                onChangeText={(text) => setFormData(prev => ({ ...prev, assignmentNumber: text }))}
              />
            </View>
          </View>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <User size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Enter full name"
                placeholderTextColor={colors.textSecondary}
                value={formData.fullName}
                onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
              />
            </View>
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Phone Number *</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Phone size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="+91 9876543210"
                placeholderTextColor={colors.textSecondary}
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Joining Date */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Joining Date</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Calendar size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={formData.joiningDate}
                onChangeText={(text) => setFormData(prev => ({ ...prev, joiningDate: text }))}
              />
            </View>
          </View>

          {/* Membership Duration */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Start Date</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Calendar size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.membershipStart}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, membershipStart: text }))}
                />
              </View>
            </View>
            
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>End Date</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Calendar size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Auto-calculated"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.membershipEnd}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, membershipEnd: text }))}
                />
              </View>
            </View>
          </View>

          {/* Payment Details */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Total Amount</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <DollarSign size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.totalAmount}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, totalAmount: text }))}
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
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.discountAmount}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, discountAmount: text }))}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* Final Amount Display */}
          {(formData.totalAmount || formData.discountAmount !== '0') && (
            <View style={[styles.finalAmountContainer, { backgroundColor: colors.primary + '10', borderColor: colors.primary }]}>
              <Text style={[styles.finalAmountLabel, { color: colors.text }]}>Final Amount:</Text>
              <Text style={[styles.finalAmountValue, { color: colors.primary }]}>
                ₹{Math.max(0, (parseFloat(formData.totalAmount) || 0) - (parseFloat(formData.discountAmount) || 0)).toFixed(2)}
              </Text>
            </View>
          )}

          {/* Payment Method */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              <TouchableOpacity
                style={[
                  styles.paymentButton,
                  {
                    backgroundColor: formData.paymentMethod === 'cash' ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, paymentMethod: 'cash' }))}
              >
                <Text
                  style={[
                    styles.paymentButtonText,
                    {
                      color: formData.paymentMethod === 'cash' ? '#000' : colors.text,
                    },
                  ]}
                >
                  Cash
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentButton,
                  {
                    backgroundColor: formData.paymentMethod === 'upi' ? colors.primary : colors.surface,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setFormData(prev => ({ ...prev, paymentMethod: 'upi' }))}
              >
                <Text
                  style={[
                    styles.paymentButtonText,
                    {
                      color: formData.paymentMethod === 'upi' ? '#000' : colors.text,
                    },
                  ]}
                >
                  UPI
                </Text>
              </TouchableOpacity>
            </View>
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
            onPress={handleSaveMember}
            disabled={isLoading}
          >
            <Save size={20} color="#000" />
            <Text style={styles.saveButtonText}>
              {isLoading ? 'Saving...' : 'Save Member'}
            </Text>
          </TouchableOpacity>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
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
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  paymentButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#000',
  },
});