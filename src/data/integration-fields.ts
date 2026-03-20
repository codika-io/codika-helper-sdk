/**
 * Integration Field Registry
 *
 * Static registry of all platform integrations with their required fields.
 * Used by the CLI to validate secrets, generate help text, and enable agents.
 */

export interface IntegrationFieldDef {
  id: string;
  name: string;
  contextType: 'organization' | 'member' | 'process_instance';
  authMethod: 'api_key' | 'oauth' | 'credentials';
  secretFields: { key: string; description: string; required: boolean }[];
  metadataFields?: { key: string; description: string; required: boolean }[];
}

export const INTEGRATION_FIELDS: Record<string, IntegrationFieldDef> = {
  // ───────────────────────────────────────────────
  // Organization-level API key integrations
  // ───────────────────────────────────────────────

  openai: {
    id: 'openai',
    name: 'OpenAI',
    contextType: 'organization',
    authMethod: 'api_key',
    secretFields: [
      { key: 'OPENAI_API_KEY', description: 'OpenAI API key', required: true },
    ],
  },

  anthropic: {
    id: 'anthropic',
    name: 'Anthropic',
    contextType: 'organization',
    authMethod: 'api_key',
    secretFields: [
      { key: 'ANTHROPIC_API_KEY', description: 'Anthropic API key', required: true },
    ],
  },

  google_gemini: {
    id: 'google_gemini',
    name: 'Google Gemini',
    contextType: 'organization',
    authMethod: 'api_key',
    secretFields: [
      { key: 'GOOGLE_GEMINI_API_KEY', description: 'Google Gemini API key', required: true },
    ],
  },

  mistral: {
    id: 'mistral',
    name: 'Mistral',
    contextType: 'organization',
    authMethod: 'api_key',
    secretFields: [
      { key: 'MISTRAL_API_KEY', description: 'Mistral API key', required: true },
    ],
  },

  deep_seek: {
    id: 'deep_seek',
    name: 'DeepSeek',
    contextType: 'organization',
    authMethod: 'api_key',
    secretFields: [
      { key: 'DEEP_SEEK_API_KEY', description: 'DeepSeek API key', required: true },
    ],
  },

  cohere: {
    id: 'cohere',
    name: 'Cohere',
    contextType: 'organization',
    authMethod: 'api_key',
    secretFields: [
      { key: 'COHERE_API_KEY', description: 'Cohere API key', required: true },
    ],
  },

  x_ai: {
    id: 'x_ai',
    name: 'xAI',
    contextType: 'organization',
    authMethod: 'api_key',
    secretFields: [
      { key: 'X_AI_API_KEY', description: 'xAI API key', required: true },
    ],
  },

  open_router: {
    id: 'open_router',
    name: 'OpenRouter',
    contextType: 'organization',
    authMethod: 'api_key',
    secretFields: [
      { key: 'OPEN_ROUTER_API_KEY', description: 'OpenRouter API key', required: true },
    ],
  },

  tavily: {
    id: 'tavily',
    name: 'Tavily',
    contextType: 'organization',
    authMethod: 'api_key',
    secretFields: [
      { key: 'TAVILY_API_KEY', description: 'Tavily search API key', required: true },
    ],
  },

  pinecone: {
    id: 'pinecone',
    name: 'Pinecone',
    contextType: 'organization',
    authMethod: 'api_key',
    secretFields: [
      { key: 'PINECONE_API_KEY', description: 'Pinecone vector database API key', required: true },
    ],
  },

  folk: {
    id: 'folk',
    name: 'Folk',
    contextType: 'organization',
    authMethod: 'api_key',
    secretFields: [
      { key: 'FOLK_API_KEY', description: 'Folk CRM API key', required: true },
    ],
  },

  // ───────────────────────────────────────────────
  // Organization-level OAuth integrations
  // ───────────────────────────────────────────────

  slack: {
    id: 'slack',
    name: 'Slack',
    contextType: 'organization',
    authMethod: 'oauth',
    secretFields: [],
  },

  shopify: {
    id: 'shopify',
    name: 'Shopify',
    contextType: 'organization',
    authMethod: 'oauth',
    secretFields: [],
    metadataFields: [
      { key: 'shopSubdomain', description: 'Shopify store subdomain (e.g. my-store)', required: true },
    ],
  },

  // ───────────────────────────────────────────────
  // Organization-level multi-field credentials
  // ───────────────────────────────────────────────

  pipedrive: {
    id: 'pipedrive',
    name: 'Pipedrive',
    contextType: 'organization',
    authMethod: 'credentials',
    secretFields: [
      { key: 'PIPEDRIVE_API_TOKEN', description: 'Pipedrive API token', required: true },
    ],
  },

  odoo: {
    id: 'odoo',
    name: 'Odoo',
    contextType: 'organization',
    authMethod: 'credentials',
    secretFields: [
      { key: 'ODOO_URL', description: 'Odoo instance URL', required: true },
      { key: 'ODOO_DATABASE', description: 'Odoo database name', required: true },
      { key: 'ODOO_USERNAME', description: 'Odoo username', required: true },
      { key: 'ODOO_PASSWORD', description: 'Odoo password', required: true },
    ],
  },

  twilio: {
    id: 'twilio',
    name: 'Twilio',
    contextType: 'organization',
    authMethod: 'credentials',
    secretFields: [
      { key: 'TWILIO_ACCOUNT_SID', description: 'Twilio account SID', required: true },
      { key: 'TWILIO_AUTH_TOKEN', description: 'Twilio auth token', required: true },
    ],
  },

  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    contextType: 'organization',
    authMethod: 'credentials',
    secretFields: [
      { key: 'WHATSAPP_ACCESS_TOKEN', description: 'WhatsApp Cloud API access token', required: true },
      { key: 'WHATSAPP_BUSINESS_ACCOUNT_ID', description: 'WhatsApp Business account ID', required: true },
    ],
  },

  whatsapp_trigger: {
    id: 'whatsapp_trigger',
    name: 'WhatsApp Trigger',
    contextType: 'organization',
    authMethod: 'credentials',
    secretFields: [
      { key: 'WHATSAPP_CLIENT_ID', description: 'WhatsApp app client ID', required: true },
      { key: 'WHATSAPP_CLIENT_SECRET', description: 'WhatsApp app client secret', required: true },
    ],
  },

  // ───────────────────────────────────────────────
  // Member-level OAuth integrations (Google)
  // ───────────────────────────────────────────────

  google_gmail: {
    id: 'google_gmail',
    name: 'Google Gmail',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  google_calendar: {
    id: 'google_calendar',
    name: 'Google Calendar',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  google_drive: {
    id: 'google_drive',
    name: 'Google Drive',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  google_sheets: {
    id: 'google_sheets',
    name: 'Google Sheets',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  google_docs: {
    id: 'google_docs',
    name: 'Google Docs',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  google_slides: {
    id: 'google_slides',
    name: 'Google Slides',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  google_tasks: {
    id: 'google_tasks',
    name: 'Google Tasks',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  google_contacts: {
    id: 'google_contacts',
    name: 'Google Contacts',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  // ───────────────────────────────────────────────
  // Member-level OAuth integrations (Microsoft)
  // ───────────────────────────────────────────────

  microsoft_teams: {
    id: 'microsoft_teams',
    name: 'Microsoft Teams',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  microsoft_teams_advanced: {
    id: 'microsoft_teams_advanced',
    name: 'Microsoft Teams Advanced',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  microsoft_sharepoint: {
    id: 'microsoft_sharepoint',
    name: 'Microsoft SharePoint',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  microsoft_outlook: {
    id: 'microsoft_outlook',
    name: 'Microsoft Outlook',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  microsoft_to_do: {
    id: 'microsoft_to_do',
    name: 'Microsoft To Do',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  microsoft_excel: {
    id: 'microsoft_excel',
    name: 'Microsoft Excel',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  microsoft_onedrive: {
    id: 'microsoft_onedrive',
    name: 'Microsoft OneDrive',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  // ───────────────────────────────────────────────
  // Member-level OAuth integrations (Other)
  // ───────────────────────────────────────────────

  notion: {
    id: 'notion',
    name: 'Notion',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  calendly: {
    id: 'calendly',
    name: 'Calendly',
    contextType: 'member',
    authMethod: 'oauth',
    secretFields: [],
  },

  // ───────────────────────────────────────────────
  // Process instance-level integrations
  // ───────────────────────────────────────────────

  supabase: {
    id: 'supabase',
    name: 'Supabase',
    contextType: 'process_instance',
    authMethod: 'credentials',
    secretFields: [
      { key: 'SUPABASE_HOST', description: 'Supabase project URL', required: true },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', description: 'Supabase service role key', required: true },
    ],
  },

  postgres: {
    id: 'postgres',
    name: 'PostgreSQL',
    contextType: 'process_instance',
    authMethod: 'credentials',
    secretFields: [
      { key: 'POSTGRES_HOST', description: 'PostgreSQL host', required: true },
      { key: 'POSTGRES_PORT', description: 'PostgreSQL port', required: true },
      { key: 'POSTGRES_DATABASE', description: 'PostgreSQL database name', required: true },
      { key: 'POSTGRES_USER', description: 'PostgreSQL username', required: true },
      { key: 'POSTGRES_PASSWORD', description: 'PostgreSQL password', required: true },
      { key: 'POSTGRES_SSL', description: 'Enable SSL connection', required: false },
    ],
  },

  telegram: {
    id: 'telegram',
    name: 'Telegram',
    contextType: 'process_instance',
    authMethod: 'credentials',
    secretFields: [
      { key: 'TELEGRAM_ACCESS_TOKEN', description: 'Telegram bot access token', required: true },
    ],
  },
};

// ─────────────────────────────────────────────────
// Derived sets and helpers
// ─────────────────────────────────────────────────

export const OAUTH_INTEGRATIONS = new Set(
  Object.values(INTEGRATION_FIELDS)
    .filter((f) => f.authMethod === 'oauth')
    .map((f) => f.id),
);

export function getIntegrationDef(id: string): IntegrationFieldDef | undefined {
  return INTEGRATION_FIELDS[id];
}

export function isOAuthIntegration(id: string): boolean {
  return OAUTH_INTEGRATIONS.has(id);
}
