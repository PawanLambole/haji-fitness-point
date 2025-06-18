import { Linking } from 'react-native';

export const sendWhatsAppMessage = async (phoneNumber: string, message: string) => {
  try {
    // Remove any non-digit characters and ensure it starts with country code
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const formattedNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
    
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      return true;
    } else {
      console.error('WhatsApp is not installed');
      return false;
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
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