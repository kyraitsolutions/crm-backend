




// See for references



// async function routeInboundEvent(event: WhatsAppWebhookEvent) {
//   if (event.context?.campaign_id) {
//     return marketingWebhookHandler.handle(event); // delivery/read status for a broadcast
//   }

//   // inbound message from a contact
//   const conversation = await conversationService.findOrCreateThread(event.from, event.numberId);

//   if (conversation.activeFlowId) {
//     return flowExecutionService.advance(conversation, event); // mid-flow, e.g. booking form step 2
//   }

//   if (conversation.assignedAgentId && !conversation.botEnabled) {
//     return conversationService.appendInboundMessage(conversation, event); // human is handling it, just log
//   }

//   const botResult = await chatbotEngineService.handle(conversation, event);
//   if (botResult.handoff) {
//     await handoffService.assignToAgent(conversation);
//   }
// }