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
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import { usePayments } from '@/hooks/usePayments';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { IndianRupee } from 'lucide-react-native';
import { sendWhatsAppMessage, createMembershipMessage } from '@/utils/whatsapp';
import { 
  User, 
  Phone, 
  Calendar, 
  DollarSign, 
  Camera, 
  Save, 
  Percent, 
  CircleAlert as AlertCircle,
  Settings,
  CheckCircle
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase'; // <-- Make sure you have this import and supabase client setup

// Define membership plans
const MEMBERSHIP_PLANS = [
  {
    id: '1month',
    name: '1 Month Plan',
    duration: 1,
    price: 700,
    description: 'Perfect for beginners'
  },
  {
    id: '3months',
    name: '3 Months Plan', 
    duration: 3,
    price: 1500,
    description: 'Most popular choice'
  }
];

export default function AddMemberScreen() {
  const { colors } = useTheme();
  const { user, session } = useAuth();
  const { addMember, generateAssignmentNumber } = useMembers();
  const { addPayment } = usePayments();
  
  const [isPlanMode, setIsPlanMode] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  
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

  // Updated pickImage to allow choosing camera or gallery
  const pickImage = async () => {
    Alert.alert(
      'Add Photo',
      'Choose a method to add a photo',
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
              setFormData(prev => ({ ...prev, photo: result.assets[0].uri }));
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
              setFormData(prev => ({ ...prev, photo: result.assets[0].uri }));
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  // Update calculateEndDate to handle invalid dates gracefully
  const calculateEndDate = (startDate: string, months: number) => {
    if (!isValidDateString(startDate)) {
      setError('Please enter a valid membership start date (YYYY-MM-DD)');
      return '';
    }
    try {
      const start = new Date(startDate);
      start.setMonth(start.getMonth() + months);
      return start.toISOString().split('T')[0];
    } catch {
      setError('Date value out of bounds');
      return '';
    }
  };

  const handlePlanModeToggle = (value: boolean) => {
    setIsPlanMode(value);
    setSelectedPlan(null);
    setError(null);
    
    if (!value) {
      // Reset to manual mode
      setFormData(prev => ({
        ...prev,
        totalAmount: '',
        membershipEnd: '',
      }));
    }
  };

  const handlePlanSelect = (planId: string) => {
    const plan = MEMBERSHIP_PLANS.find(p => p.id === planId);
    if (!plan) return;

    setSelectedPlan(planId);
    const endDate = calculateEndDate(formData.membershipStart, plan.duration);
    
    setFormData(prev => ({
      ...prev,
      totalAmount: plan.price.toString(),
      membershipEnd: endDate,
    }));
  };

  const handleStartDateChange = (date: string) => {
    setFormData(prev => ({ ...prev, membershipStart: date }));

    // If in plan mode and plan is selected, recalculate end date
    if (isPlanMode && selectedPlan) {
      if (!isValidDateString(date)) {
        setError('Please enter a valid membership start date (YYYY-MM-DD)');
        setFormData(prev => ({ ...prev, membershipEnd: '' }));
        return;
      }
      const plan = MEMBERSHIP_PLANS.find(p => p.id === selectedPlan);
      if (plan) {
        const endDate = calculateEndDate(date, plan.duration);
        setFormData(prev => ({ ...prev, membershipEnd: endDate }));
      }
    }
  };

  // Add this helper function
  function isValidDateString(dateStr: string) {
    if (!dateStr) return false;
    // YYYY-MM-DD format and valid date
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    // Check for out-of-bounds years
    const year = parseInt(match[1], 10);
    if (year < 1900 || year > 2100) return false;
    // Check for month/day validity
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    return true;
  }

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

    if (isPlanMode && !selectedPlan) {
      setError('Please select a membership plan');
      return false;
    }

    if (!isPlanMode && !formData.membershipEnd.trim()) {
      setError('Membership end date is required in manual mode');
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

    // Date validation
    if (!isValidDateString(formData.joiningDate)) {
      setError('Please enter a valid joining date (YYYY-MM-DD)');
      return false;
    }
    if (!isValidDateString(formData.membershipStart)) {
      setError('Please enter a valid membership start date (YYYY-MM-DD)');
      return false;
    }
    if (!isPlanMode && !isValidDateString(formData.membershipEnd)) {
      setError('Please enter a valid membership end date (YYYY-MM-DD)');
      return false;
    }
    if (isPlanMode && formData.membershipEnd && !isValidDateString(formData.membershipEnd)) {
      setError('Calculated membership end date is invalid. Please check the plan or start date.');
      return false;
    }
    
    return true;
  };

  // Helper to upload image to Supabase Storage and return public URL
  const uploadPhotoToSupabase = async (uri: string, memberName: string) => {
    try {
      // Fetch the image as a blob
      const response = await fetch(uri);
      const blob = await response.blob();
      // Create a unique filename
      const fileExt = uri.split('.').pop();
      const fileName = `member_${memberName.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
      const filePath = `photos/${fileName}`;

      // Upload to Supabase Storage
      let { error: uploadError } = await supabase.storage
        .from('member-photos') // <-- Use your bucket name
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from('member-photos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error('Photo upload error:', err);
      throw new Error('Failed to upload photo');
    }
  };

  const handleSaveMember = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Generate assignment number if not provided
      const assignmentNumber = formData.assignmentNumber.trim() || await generateAssignmentNumber();
      // Calculate end date if not provided (for manual mode)
      const membershipEnd = formData.membershipEnd || calculateEndDate(formData.membershipStart, 6);

      const totalAmount = parseFloat(formData.totalAmount) || 0;
      const discountAmount = parseFloat(formData.discountAmount) || 0;
      const finalAmount = totalAmount - discountAmount;

      // --- Upload photo if present ---
      let photoUrl = null;
      if (formData.photo) {
        photoUrl = await uploadPhotoToSupabase(formData.photo, formData.fullName.trim());
      }

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
        photo_url: photoUrl, // <-- Use uploaded photo URL
        is_active: true,
      };
      
      // Add member to database
      const newMember = await addMember(memberInsertData);

      if (!newMember) {
        throw new Error('Failed to create member - no data returned');
      }

      // Add payment record if amount > 0
      if (finalAmount > 0) {
        const paymentData = {
          member_id: newMember.id,
          amount: finalAmount,
          payment_method: formData.paymentMethod, // payment_method belongs here
          payment_date: formData.membershipStart,
          notes: discountAmount > 0 ? `Discount applied: ₹${discountAmount}` : null,
        };
        
        await addPayment(paymentData);
      }

      // Reset loading state before showing alert
      setIsLoading(false);

      // Prepare WhatsApp message
      const whatsappMessage = createMembershipMessage(
        formData.fullName,
        formData.membershipStart,
        membershipEnd,
        assignmentNumber
      );

      Alert.alert(
        'Member Added',
        'Member was added successfully. Send welcome message via WhatsApp?',
        [
          { 
            text: 'Skip', 
            style: 'cancel',
            onPress: () => router.back()
          },
          {
            text: 'Send Message',
            style: 'default',
            onPress: async () => {
              try {
                console.log('Attempting to send WhatsApp message...');
                const success = await sendWhatsAppMessage(formData.phoneNumber, whatsappMessage);
                console.log('WhatsApp send result:', success);
                
                if (!success) {
                  Alert.alert(
                    'WhatsApp Error',
                    'Could not open WhatsApp. Make sure WhatsApp is installed on your device.',
                    [{ text: 'OK', onPress: () => router.back() }]
                  );
                } else {
                  setTimeout(() => router.back(), 500); // Give WhatsApp time to open
                }
              } catch (error) {
                console.error('Failed to send WhatsApp message:', error);
                Alert.alert(
                  'Error',
                  'Could not send WhatsApp message. Please try again.',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              }
            }
          }
        ]
      );

    } catch (err: any) {
      console.error('Error saving member:', err);
      setError(err.message || 'Failed to add member');
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
    setIsPlanMode(false);
    setSelectedPlan(null);
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
                  <Text style={[styles.photoText, { color: colors.textSecondary }]}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Remove Photo Button - visible only if photo is added */}
            {formData.photo && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14, alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.error + '10' }}
                onPress={() => setFormData(prev => ({ ...prev, photo: null }))}
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

          {/* Plan Mode Toggle */}
          <View style={styles.toggleSection}>
            <View style={styles.toggleContainer}>
              <Settings size={20} color={colors.textSecondary} />
              <Text style={[styles.toggleLabel, { color: colors.text }]}>
                Use Predefined Plans
              </Text>
              <Switch
                value={isPlanMode}
                onValueChange={handlePlanModeToggle}
                trackColor={{ false: colors.border, true: colors.primary + '40' }}
                thumbColor={isPlanMode ? colors.primary : colors.textSecondary}
              />
            </View>
           
          </View>

          {/* Membership Plans (Show only in plan mode) */}
          {isPlanMode && (
            <View style={styles.plansSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Membership Plan</Text>
              <View style={styles.plansContainer}>
                {MEMBERSHIP_PLANS.map((plan) => (
                  <TouchableOpacity
                    key={plan.id}
                    style={[
                      styles.planCard,
                      {
                        backgroundColor: selectedPlan === plan.id ? colors.primary + '20' : colors.surface,
                        borderColor: selectedPlan === plan.id ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handlePlanSelect(plan.id)}
                  >
                    <View style={styles.planHeader}>
                      <View style={styles.planInfo}>
                        <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
                        <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
                          {plan.description}
                        </Text>
                      </View>
                      {selectedPlan === plan.id && (
                        <CheckCircle size={24} color={colors.primary} />
                      )}
                    </View>
                    <View style={styles.planPricing}>
                      <Text style={[styles.planPrice, { color: colors.primary }]}>₹{plan.price}</Text>
                      <Text style={[styles.planDuration, { color: colors.textSecondary }]}>
                        {plan.duration} month{plan.duration > 1 ? 's' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Membership Start Date */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Membership Start Date</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Calendar size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={formData.membershipStart}
                onChangeText={handleStartDateChange}
              />
            </View>
          </View>

          {/* Membership End Date (Show only in manual mode or display calculated date in plan mode) */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>Membership End Date</Text>
            <View style={[
              styles.inputContainer, 
              { 
                backgroundColor: isPlanMode ? colors.border + '30' : colors.surface, 
                borderColor: colors.border 
              }
            ]}>
              <Calendar size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: isPlanMode ? colors.textSecondary : colors.text }]}
                placeholder={isPlanMode ? "Auto-calculated from plan" : "YYYY-MM-DD"}
                placeholderTextColor={colors.textSecondary}
                value={formData.membershipEnd}
                onChangeText={(text) => setFormData(prev => ({ ...prev, membershipEnd: text }))}
                editable={!isPlanMode}
              />
            </View>
          </View>

          {/* Payment Details */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.text }]}>Total Amount</Text>
              <View style={[
                styles.inputContainer, 
                { 
                  backgroundColor: isPlanMode ? colors.border + '30' : colors.surface, 
                  borderColor: colors.border 
                }
              ]}>
                <IndianRupee size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: isPlanMode ? colors.textSecondary : colors.text }]}
                  placeholder={isPlanMode ? "Auto-filled from plan" : "0"}
                  placeholderTextColor={colors.textSecondary}
                  value={formData.totalAmount}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, totalAmount: text }))}
                  keyboardType="numeric"
                  editable={!isPlanMode}
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
  toggleSection: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  toggleDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    lineHeight: 20,
  },
  plansSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  plansContainer: {
    gap: 12,
  },
  planCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  planPricing: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planPrice: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  planDuration: {
    fontSize: 14,
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