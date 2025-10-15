import { model, Schema } from "mongoose";

const subscriptionSchema= new Schema({
    plan: {
        type: String, //free, premium
        require:true
    },
    maxChatbots: {
        type: Number,
        default: 3 //if free 3, premium -5 ,......
    },
    maxWebforms: {
        type: Number,
        default: 3 //if free 3, premium -5 ,......
    },
    planDuration:{
        type:String,
        default:'30'  //days basic - 180 days 
    },
    feature:[{
        type:String,
    }]

},{
    timestamps:true
})


export const Subscription = model(
  "Subscription",
  subscriptionSchema
);