'use server';

/**
 * @fileOverview AI flow that generates a fully corrected version of a sentence.
 *
 * - fullCorrection - A function that takes an incorrect sentence and returns a fully corrected version.
 * - FullCorrectionInput - The input type for the fullCorrection function.
 * - FullCorrectionOutput - The return type for the fullCorrection function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FullCorrectionInputSchema = z.object({
  incorrectSentence: z
    .string()
    .describe('The sentence to be corrected.'),
  nativeLanguage: z.string().describe("The user's native language."),
});
export type FullCorrectionInput = z.infer<typeof FullCorrectionInputSchema>;

const FullCorrectionOutputSchema = z.object({
  correctedSentence: z.string().describe('The fully corrected version of the input sentence.'),
});
export type FullCorrectionOutput = z.infer<typeof FullCorrectionOutputSchema>;

export async function fullCorrection(input: FullCorrectionInput): Promise<FullCorrectionOutput> {
  return fullCorrectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fullCorrectionPrompt',
  input: {schema: FullCorrectionInputSchema},
  output: {schema: FullCorrectionOutputSchema},
  prompt: `You are an AI that corrects sentences.

  Correct the following sentence:

  {{incorrectSentence}}

  Return only the corrected sentence, without any additional explanation or conversation. The correction should be in the original language of the sentence, not in the user's native language.`,
});

const fullCorrectionFlow = ai.defineFlow(
  {
    name: 'fullCorrectionFlow',
    inputSchema: FullCorrectionInputSchema,
    outputSchema: FullCorrectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
