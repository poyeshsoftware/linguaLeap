'use server';

/**
 * @fileOverview AI flow that suggests possible user responses based on the conversation history.
 *
 * - suggestAnswers - A function that takes the conversation context and suggests replies.
 * - AnswerSuggestionsInput - The input type for the suggestAnswers function.
 * - AnswerSuggestionsOutput - The return type for the suggestAnswers function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnswerSuggestionsInputSchema = z.object({
  tutorResponse: z.string().describe('The last response from the AI tutor.'),
  language: z.string().describe('The language the user is practicing.'),
  level: z.string().describe('The language proficiency level of the user.'),
  topic: z.string().describe('The topic of the conversation.'),
});
export type AnswerSuggestionsInput = z.infer<typeof AnswerSuggestionsInputSchema>;

const AnswerSuggestionsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of suggested replies for the user.'),
});
export type AnswerSuggestionsOutput = z.infer<typeof AnswerSuggestionsOutputSchema>;

export async function suggestAnswers(input: AnswerSuggestionsInput): Promise<AnswerSuggestionsOutput> {
  return answerSuggestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'answerSuggestionsPrompt',
  input: {schema: AnswerSuggestionsInputSchema},
  output: {schema: AnswerSuggestionsOutputSchema},
  prompt: `You are an AI language tutor assistant. The user is practicing {{language}} at a {{level}} level, discussing the topic: "{{topic}}".

The tutor just said: "{{tutorResponse}}"

Provide three short, distinct, and natural-sounding replies that the user could say next. The suggestions should be appropriate for the user's {{level}} level and should be in {{language}}.

Return only the suggestions in an array.`,
});

const answerSuggestionsFlow = ai.defineFlow(
  {
    name: 'answerSuggestionsFlow',
    inputSchema: AnswerSuggestionsInputSchema,
    outputSchema: AnswerSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
