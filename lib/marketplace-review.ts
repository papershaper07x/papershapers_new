import {noticeCategories} from './marketplace';
import { backendFetch } from './backend';
export const MARKETPLACE_POLICY = 'marketplace-2026-10-13-v1';
export type ReviewVerdict = { decision: 'approve' | 'reject' | 'review'; confidence: number; flags: string[]; provider: string; policy_version: string; categories?:string[] };
export async function reviewSubmission(notice: Record<string,string>, image?: Buffer): Promise<ReviewVerdict> {
  if (process.env.MARKETPLACE_AI_REVIEW_ENABLED === 'false') throw new Error('AI review disabled');
  const { title, description, place, area, category } = notice;
  const verdict = await backendFetch<ReviewVerdict>('/v1/marketplace/review',{
    method:'POST', body:JSON.stringify({title,description,place,area,category,...(image ? {image_base64:image.toString('base64')} : {})}),
    signal:AbortSignal.timeout(20000),
  });
  if (!['approve','reject','review'].includes(verdict.decision) || typeof verdict.confidence !== 'number' || !Number.isFinite(verdict.confidence) || verdict.confidence < 0 || verdict.confidence > 1 || !Array.isArray(verdict.flags) || verdict.flags.some(flag => typeof flag !== 'string' || flag.length > 40) || verdict.flags.length > 12 || !['gemini','groq','nvidia','rules'].includes(verdict.provider) || verdict.policy_version !== MARKETPLACE_POLICY) throw new Error('Invalid review result');
  if(verdict.categories!==undefined && (!Array.isArray(verdict.categories)||verdict.categories.length>3||new Set(verdict.categories).size!==verdict.categories.length||verdict.categories.some(category=>!noticeCategories.includes(category as typeof noticeCategories[number]))))throw new Error('Invalid review categories');
  if (verdict.decision === 'approve' && (verdict.confidence < 0.98 || verdict.flags.length || verdict.provider === 'rules')) verdict.decision = 'review';
  return verdict;
}
