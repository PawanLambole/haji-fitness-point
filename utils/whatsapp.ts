import { Linking, Platform } from 'react-native';

const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleanNumber = phoneNumber.replace(/\D/g, '');
  console.log('Clean number:', cleanNumber);
  
  // Remove leading zero if present
  const withoutLeadingZero = cleanNumber.startsWith('0') 
    ? cleanNumber.substring(1) 
    : cleanNumber;
  console.log('Without leading zero:', withoutLeadingZero);
  
  // Add country code if not present
  const formattedNumber = withoutLeadingZero.startsWith('91') 
    ? withoutLeadingZero 
    : `91${withoutLeadingZero}`;
  console.log('Final formatted number:', formattedNumber);
  
  return formattedNumber;
};

export const sendWhatsAppMessage = async (phoneNumber: string, message: string) => {
  try {
    console.log('Attempting to send WhatsApp message');
    console.log('Original phone:', phoneNumber);
    console.log('Message:', message);

    const formattedNumber = formatPhoneNumber(phoneNumber);
    const encodedMessage = encodeURIComponent(message);

    // For Android, try direct intent first
    if (Platform.OS === 'android') {
      const androidUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodedMessage}`;
      console.log('Trying Android URL:', androidUrl);
      
      if (await Linking.canOpenURL(androidUrl)) {
        console.log('Opening Android URL...');
        await Linking.openURL(androidUrl);
        return true;
      }
    }

    // For iOS, try direct whatsapp URL
    if (Platform.OS === 'ios') {
      const iosUrl = `whatsapp://send?phone=${formattedNumber}&text=${encodedMessage}`;
      console.log('Trying iOS URL:', iosUrl);
      
      if (await Linking.canOpenURL(iosUrl)) {
        console.log('Opening iOS URL...');
        await Linking.openURL(iosUrl);
        return true;
      }
    }

    // Fallback to universal link
    const universalUrl = `https://api.whatsapp.com/send?phone=${formattedNumber}&text=${encodedMessage}`;
    console.log('Trying universal URL:', universalUrl);
    
    if (await Linking.canOpenURL(universalUrl)) {
      console.log('Opening universal URL...');
      await Linking.openURL(universalUrl);
      return true;
    }

    console.log('No URLs could be opened');
    return false;
  } catch (error) {
    console.error('Error in sendWhatsAppMessage:', error);
    return false;
  }
};

export const createMembershipMessage = (
  memberName: string,
  startDate: string,
  endDate: string,
  assignmentNumber: string
) => {
  return `🏋️‍♂️ Welcome to HAJI FITNESS POINT! 🏋️‍♂️

Hi ${memberName},

Your gym membership has been activated!

📋 Assignment Number: ${assignmentNumber}
📅 Membership Period: ${startDate} to ${endDate}

We're excited to have you on your fitness journey with us. Our team is here to support you every step of the way.

For any queries, feel free to contact us.

Stay Strong! 💪
HAJI FITNESS POINT Team`;
};

export const createPaymentReminderMessage = (
  memberName: string,
  endDate: string,
  daysRemaining: number
) => {
  return `🏋️‍♂️ HAJI FITNESS POINT - Membership Reminder 🏋️‍♂️

Hi ${memberName},

Your gym membership expires on ${endDate} (${daysRemaining} days remaining).

To continue your fitness journey without interruption, please renew your membership soon.

Contact us for renewal options.

Stay Strong! 💪
HAJI FITNESS POINT Team`;
};
