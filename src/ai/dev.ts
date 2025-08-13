import { config } from 'dotenv';
config();

import '@/ai/flows/refinement-suggestions.ts';
import '@/ai/flows/full-correction.ts';
import '@/ai/flows/grammar-check.ts';
import '@/ai/flows/conversational-tutor.ts';
import '@/ai/flows/answer-suggestions.ts';
import '@/ai/flows/translate-text.ts';
