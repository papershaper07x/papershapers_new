// Configuration-only validation: never return or print secret values.
export function vercelConfigurationErrors(env) {
 const errors=[];
 if(!['preview','production','development'].includes(env.VERCEL_ENV))errors.push('VERCEL_ENV must name the intended environment.');
 if(env.VERCEL_ENV!=='production'&&env.PREVIEW_DATABASE_ISOLATED!=='true')errors.push('Preview/development requires an isolated database and PREVIEW_DATABASE_ISOLATED=true.');
 if(env.MIGRATION_DATABASE_URL)errors.push('Remove MIGRATION_DATABASE_URL from the Vercel project. Run migrations with a separate operator/CI secret before building.');
 try {const url=new URL(env.DATABASE_URL);if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error();}catch{errors.push('DATABASE_URL must be a PostgreSQL runtime connection.');}
 for(const [key,path] of [['BACKEND_ORIGIN','/'],['NEXT_PUBLIC_HOME_ORIGIN','/'],['NEXT_PUBLIC_STUDY_ORIGIN','/papershapers'],['NEXT_PUBLIC_MARKET_ORIGIN','/noticeboard']]){
  try {const url=new URL(env[key]);if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname.replace(/\/$/,'')!==path.replace(/\/$/,''))throw new Error();}
  catch{errors.push(`${key} must be an HTTPS URL with path ${path}, no credentials/query/fragment.`);}
 }
 if(!env.BACKEND_SHARED_SECRET||env.BACKEND_SHARED_SECRET.length<32)errors.push('BACKEND_SHARED_SECRET must be a matching high-entropy service secret of at least 32 characters.');
 if(env.REQUEST_LIMITS_ENABLED!=='true')errors.push('REQUEST_LIMITS_ENABLED=true is required before public traffic.');
 if(env.MARKETPLACE_ENABLED!=='true')errors.push('MARKETPLACE_ENABLED=true is required for this two-portal release.');
 for(const key of Object.keys(env))if(/^NEXT_PUBLIC_.*(SECRET|PASSWORD|DATABASE_URL|API_KEY|ACCESS_TOKEN|PRIVATE_KEY)/i.test(key))errors.push(`Remove public secret variable ${key}.`);
 return errors;
}

export const webTables=['users','sessions','auth_identities','user_roles','user_preferences','saved_items','study_requests','community_posts','contact_submissions','test_rooms','test_attendees','request_limits'];
export const marketTables=['marketplace_notices','marketplace_media','marketplace_reviews','marketplace_reports','marketplace_poster_blocks','marketplace_engagement','marketplace_reservations'];
export async function verifyVercelSchema(sql,env) {
 const tables=[...webTables,...(env.MARKETPLACE_ENABLED==='true'?marketTables:[]),...(env.BILLING_ENABLED==='true'?['billing_orders']:[])];
 for(const table of tables){const [row]=await sql`SELECT to_regclass(${'public.'+table}) AS relation`;if(!row?.relation)throw new Error(`Missing ${table}. Run the migration/grant release step before deploying.`);}
 const [ledger]=await sql`SELECT to_regclass('public.schema_migrations') AS relation`;
 if(!ledger?.relation)throw new Error('Schema migration ledger is missing.');
 if(env.MARKETPLACE_ENABLED==='true'){
  const [row]=await sql`SELECT version FROM schema_migrations WHERE version='0013_marketplace_discovery'`;
  if(!row)throw new Error('Marketplace migration 0013 is required before deploying.');
 }
 // Read-only probes also verify that a restricted role can access critical columns.
 await sql`SELECT id FROM users LIMIT 0`;
 if(env.MARKETPLACE_ENABLED==='true')await sql`SELECT state,city,categories,reservations_enabled FROM marketplace_notices LIMIT 0`;
}
