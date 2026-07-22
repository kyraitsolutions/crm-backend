import { ENV } from "../../../constants/env.constants.js";
import twilio from "twilio"

export const twilioClient = twilio(ENV.TWILIO.TWILIO_ACCOUNT_SID, ENV.TWILIO.TWILIO_AUTH_TOKEN);

export const configureNumber = async () => {
    try {
        const phoneNumber = ENV.TWILIO.TWILIO_PHONE_NUMBER!;
        const baseUrl = ENV.URL.BACKEND_URL!;

        // find the phone number's SID (needed to update it)
        const numbers = await twilioClient.incomingPhoneNumbers.list({ phoneNumber });
        console.log(numbers)

        if (numbers.length === 0) {
            console.error('No matching number found on this Twilio account.');
            return;
        }

        const numberSid = numbers[0].sid;
        const name = numbers[0].friendlyName;
        console.log(numberSid,name)

        const updated = await twilioClient.incomingPhoneNumbers(numberSid).update({
            voiceUrl: `${baseUrl}/api/twilio/voice/incoming`,
            voiceMethod: 'POST',
            statusCallback: `${baseUrl}/api/twilio/voice/status`, // optional: call status events (ringing, completed etc.)
            statusCallbackMethod: 'POST',
        });

        console.log('Twilio number configured:');
        console.log('Voice URL:', updated.voiceUrl);
        console.log('Phone Number:', updated.phoneNumber);
    } catch (error) {
        console.error("kjh", error)
    }

}

console.log(twilioClient)