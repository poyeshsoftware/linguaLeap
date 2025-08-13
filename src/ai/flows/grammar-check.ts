// This file uses server-side code.
'use server';

/**
 * @fileOverview Grammar check AI agent.
 *
 * - grammarCheck - A function that handles the grammar check process.
 * - GrammarCheckInput - The input type for the grammarCheck function.
 * - GrammarCheckOutput - The return type for the grammarCheck function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GrammarCheckInputSchema = z.object({
  text: z.string().describe('The text to check for grammar errors.'),
  nativeLanguage: z.string().describe("The user's native language."),
});
export type GrammarCheckInput = z.infer<typeof GrammarCheckInputSchema>;

const GrammarCheckOutputSchema = z.object({
  isCorrect: z.boolean().describe('Whether the input text is grammatically correct.'),
  correctedText: z.string().describe('The corrected version of the input text, if any errors were found.'),
  explanation: z.string().describe('An explanation of the grammar errors and how they were corrected.'),
});
export type GrammarCheckOutput = z.infer<typeof GrammarCheckOutputSchema>;

export async function grammarCheck(input: GrammarCheckInput): Promise<GrammarCheckOutput> {
  return grammarCheckFlow(input);
}

const prompt = ai.definePrompt({
  name: 'grammarCheckPrompt',
  input: {schema: GrammarCheckInputSchema},
  output: {schema: GrammarCheckOutputSchema},
  prompt: `You are a grammar expert. Your response MUST be in the user's native language: {{nativeLanguage}}.

You will check the given text for grammar errors.

If the text is grammatically correct:
- Set isCorrect to true.
- Set correctedText to the original text.
- Set the explanation to a confirmation message in the user's native language (e.g., "Looks good! No errors found." translated to {{nativeLanguage}}).

If there are any errors:
- Set isCorrect to false.
- Provide the corrected text in the correctedText field.
- Provide a clear explanation of the grammar errors and corrections in the explanation field. This explanation must be in {{nativeLanguage}}.

Text to check: {{{text}}}`,
});

const grammarCheckFlow = ai.defineFlow(
  {
    name: 'grammarCheckFlow',
    inputSchema: GrammarCheckInputSchema,
    outputSchema: GrammarCheckOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    