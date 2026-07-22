
import twilio from "twilio"
import { MakeCallDto } from "../types/twilio.type.js";
import { ENV } from "../../../constants/env.constants.js";
import { twilioClient } from "../config/twilio.js";
import {Call} from "../models/calldetails.model.js"
export class TwilioService {

    private async resolveAccountId(toNumber:string):Promise<string|null>{
        // const record=await 
        return ENV.TWILIO.TWILIO_PHONE_NUMBER!
    }
    async incomingCall(payload:any): Promise<any> {

        const {
            // CallSid,From,
            To,
            // CallStatus, CallerCity, CallerState, CallerCountry
         } = payload;

        const accountId=await this.resolveAccountId(To);

        console.log(accountId);

        // const dial = response.dial();

        // // dial.number("+919876543210");
        // dial.number("+919759349941");
        // const gather = response.gather({
        //     input: ['speech'],
        //     action: '/api/twilio/voice/gather', // where the transcribed speech gets sent
        //     method: 'POST',
        //     speechTimeout: 'auto', // auto-detects when user stops speaking
        //     speechModel: 'phone_call', // optimized for phone audio
        // });

        // gather.say(
        //     { voice: 'Polly.Joanna' }, // decent quality voice, free tier
        //     'Hello! Thanks for calling. How can I help you today?'
        // );

        // // fallback if no input received
        // response.say('Sorry, I didn\'t catch that. Goodbye.');

        // const dial = response.dial({
        //     callerId: ENV.TWILIO.TWILIO_PHONE_NUMBER,
        //     answerOnBridge: true,
        // });

        // console.log("whatsapp happing")
        // console.log("dial", dial);
        // dial.number("+919759349941");
        // return response.toString();
        return "no";
    }

    async gatherCallInformation(speechResult: string): Promise<string> {
        const response = new twilio.twiml.VoiceResponse();
        response.say(`You said: ${speechResult}. Let me think about that.`);
        return response.toString();
    }

    async makeCall({accountId, customerPhone }: MakeCallDto): Promise<any> {

        // Check if exotel is connected or not- is purchased any number then intergated

        const incomingWebhook = `${ENV.URL.BACKEND_URL}/api/twilio/voice/incoming`;

        const call = await twilioClient.calls.create({
            to: customerPhone,
            from: ENV.TWILIO.TWILIO_PHONE_NUMBER!,
            url: incomingWebhook,
            record: true,
            recordingChannels: "dual",
            recordingStatusCallback: `${ENV.URL.BACKEND_URL}/api/twilio/voice/recording-status`,
            statusCallback: `${ENV.URL.BACKEND_URL}/api/twilio/voice/status`,
            statusCallbackEvent: ["initiated","ringing","answered","completed"],
            statusCallbackMethod: "POST",
            timeout: 60,
        });

        await Call.create({
            accountId,
            callSid: call.sid,
            from: call.from,
            to: call.to,
            direction: "outbound",
            status: "queued",
            initiatedAt: new Date(),
        });

        return {
            callSid: call.sid,
            status: call.status,
            to: call.to,
            from: call.from,
        };
    }

    async getAvailableNumbers(countryCode:string):Promise<any>{
        const numbers = await twilioClient.availablePhoneNumbers((countryCode||"US").toUpperCase()).local.list({
            limit: 15,
            voiceEnabled: true,
        });
        if(!numbers){
            throw new Error("No does not esixt")
        }
        return numbers;
    }
    async getMyNumbers(accountId:string):Promise<any>{
        const numbers = await twilioClient.incomingPhoneNumbers.list({
            limit: 20,
        });

        if(!numbers){
            throw new Error("No does not esixt")
        }
        return numbers;
    }
    async getNumberDetails(accountId:string,phoneNumberSID:string):Promise<any>{
        const numbers = await twilioClient.incomingPhoneNumbers(phoneNumberSID).fetch();

        if(!numbers){
            throw new Error("No does not esixt")
        }
        return numbers;
    }

    async puchaseNumber(accountId:string,phoneNumber:string,):Promise<any>{
        console.log(accountId,phoneNumber)

        // one number on trial account- upgrade for multiple numbers
        const number = await twilioClient.incomingPhoneNumbers.create({
            phoneNumber: phoneNumber,
        });
        console.log(number)
        return number;
    }
}