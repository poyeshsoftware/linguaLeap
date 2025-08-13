// Implemented conversational tutor flow.

'use server';

/**
 * @fileOverview Conversational AI tutor that adapts to the user's language level and selected topic.
 *
 * - conversationalTutor - A function that handles the conversation with the AI tutor.
 * - ConversationalTutorInput - The input type for the conversationalTutor function.
 * - ConversationalTutorOutput - The return type for the conversationalTutor function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { grammarCheck, GrammarCheckInput } from './grammar-check';
import { provideRefinementSuggestions, RefinementSuggestionsInput } from './refinement-suggestions';
import { fullCorrection, FullCorrectionInput } from './full-correction';
import { translateText } from './translate-text';

const ConversationalTutorInputSchema = z.object({
  language: z.string().describe('The target language for learning.'),
  nativeLanguage: z.string().describe("The user's native language."),
  topic: z.string().describe('The topic of the conversation.'),
  level: z.string().describe('The language proficiency level of the user (e.g., beginner, intermediate, advanced).'),
  userInput: z.string().describe('The user input to be checked and analyzed.'),
});
export type ConversationalTutorInput = z.infer<typeof ConversationalTutorInputSchema>;

const ConversationalTutorOutputSchema = z.object({
  tutorResponse: z.string().describe('The AI tutor response to continue the conversation.'),
  translation: z.string().describe("The translation of the tutor's response in the user's native language."),
  grammar: z.object({
    isCorrect: z.boolean().describe('Whether the input text is grammatically correct.'),
    correctedText: z.string().describe('The corrected version of the input text, if any errors were found.'),
    explanation: z.string().describe('An explanation of the grammar errors and how they were corrected.'),
  }),
  refinement: z.object({
      suggestions: z.array(z.string()).describe('An array of suggested alternative phrasings.'),
  }),
  correction: z.object({
      correctedSentence: z.string().describe('The fully corrected version of the input sentence.'),
  }),
});
export type ConversationalTutorOutput = z.infer<typeof ConversationalTutorOutputSchema>;

export async function conversationalTutor(input: ConversationalTutorInput): Promise<ConversationalTutorOutput> {
  return conversationalTutorFlow(input);
}

const conversationPrompt = ai.definePrompt({
  name: 'conversationPrompt',
  input: {schema: z.object({
    language: z.string(),
    nativeLanguage: z.string(),
    topic: z.string(),
    level: z.string(),
    userInput: z.string(),
  })},
  output: {schema: z.object({
    tutorResponse: z.string(),
  })},
  prompt: `You are an AI language tutor. The user's native language is {{nativeLanguage}}. They want to practice speaking {{language}} at a {{level}} level. The topic of conversation is {{topic}}. Your primary role is to engage the user in a natural, flowing conversation in {{language}}.

The user has provided the following input: {{{userInput}}}

Respond conversationally to the user's message in {{language}} to keep the dialogue going. Maintain the selected language level and topic. After your conversational response, ask a follow-up question in {{language}} to encourage the user to continue practicing.

IMPORTANT: Your conversational response ('tutorResponse') must be in {{language}}.`,
});

const conversationalTutorFlow = ai.defineFlow(
  {
    name: 'conversationalTutorFlow',
    inputSchema: ConversationalTutorInputSchema,
    outputSchema: ConversationalTutorOutputSchema,
  },
  async input => {
    // We run the conversation and the checks in parallel.
    const conversationResultPromise = conversationPrompt(input);
    const grammarResultPromise = grammarCheck({ text: input.userInput, nativeLanguage: input.nativeLanguage });
    const refinementResultPromise = provideRefinementSuggestions({ text: input.userInput, language: input.language, level: input.level, nativeLanguage: input.nativeLanguage });
    const correctionResultPromise = fullCorrection({ incorrectSentence: input.userInput, nativeLanguage: input.nativeLanguage });

    // Wait for the main conversation to finish.
    const conversationResult = await conversationResultPromise;
    const tutorResponse = conversationResult.output!.tutorResponse;

    // Once we have the tutor's response, we can start translating it.
    const translationResultPromise = translateText({ text: tutorResponse, targetLanguage: input.nativeLanguage });
    
    // Wait for all the remaining promises to resolve.
    const [grammarResult, refinementResult, correctionResult, translationResult] = await Promise.all([
      grammarResultPromise,
      refinementResultPromise,
      correctionResultPromise,
      translationResultPromise
    ]);

    return {
      tutorResponse: tutorResponse,
      translation: translationResult.translatedText,
      grammar: grammarResult,
      refinement: refinementResult,
      correction: correctionResult
    };
  }
);
