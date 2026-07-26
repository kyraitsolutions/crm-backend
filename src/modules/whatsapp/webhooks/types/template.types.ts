export interface TemplateWebhookPayload {
  event: string;
  message_template_id: string;
  message_template_name: string;
  message_template_category: string;
  reason?: string | null;
}
