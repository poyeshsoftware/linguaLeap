// src/ai/flows/refinement-suggestions.ts
'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing refinement suggestions to user input.
 *
 * - provideRefinementSuggestions -  A function that takes user input and returns suggestions for better phrasing.
 * - RefinementSuggestionsInput - The input type for the provideRefinementSuggestions function.
 * - RefinementSuggestionsOutput - The output type for the provideRefinementSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefinementSuggestionsInputSchema = z.object({
  text: z.string().describe('The user input text to be refined.'),
  language: z.string().describe('The target language for refinement.'),
  level: z.string().describe('The language proficiency level of the user.'),
  nativeLanguage: z.string().describe("The user's native language."),
});
export type RefinementSuggestionsInput = z.infer<typeof RefinementSuggestionsInputSchema>;

const RefinementSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of suggested alternative phrasings.'),
});
export type RefinementSuggestionsOutput = z.infer<typeof RefinementSuggestionsOutputSchema>;

export async function provideRefinementSuggestions(input: RefinementSuggestionsInput): Promise<RefinementSuggestionsOutput> {
  return refinementSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'refinementSuggestionsPrompt',
  input: {schema: RefinementSuggestionsInputSchema},
  output: {schema: RefinementSuggestionsOutputSchema},
  prompt: `You are an AI language tutor. The user is learning {{language}} at a {{level}} level.

  Provide at least three alternative phrasings for the following sentence to improve its fluency and naturalness. Ensure suggestions are appropriate for the user's proficiency level. Return only the suggestions in an array. The suggestions should be in {{language}}.

  Sentence: {{{text}}}`,
});

const refinementSuggestionsFlow = ai.defineFlow(
  {
    name: 'refinementSuggestionsFlow',
    inputSchema: RefinementSuggestionsInputSchema,
    outputSchema: RefinementSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
