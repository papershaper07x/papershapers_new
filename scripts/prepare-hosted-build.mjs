import postgres from "postgres";
import { validateAndroidRelease } from "./validate-android-release.mjs";
import {vercelConfigurationErrors,verifyVercelSchema} from './vercel-readiness.mjs';

await validateAndroidRelease();

// Vercel project variables can reach both build and runtime. Never give the web
// deployment an owner credential or run schema mutations while building it.
if(process.env.VERCEL==='1'){
 const errors=vercelConfigurationErrors(process.env);
 if(errors.length)throw new Error(errors.join('\n'));
 const sql=postgres(process.env.DATABASE_URL,{max:1,connect_timeout:15,connection:{statement_timeout:10000}});
 try {await verifyVercelSchema(sql,process.env);console.log('Verified Vercel runtime configuration and existing schema (read only).');}
 finally {await sql.end();}
 process.exit(0);
}
