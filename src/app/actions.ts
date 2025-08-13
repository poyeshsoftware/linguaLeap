
'use server';

import { conversationalTutor, ConversationalTutorInput } from '@/ai/flows/conversational-tutor';
import { suggestAnswers, AnswerSuggestionsInput } from '@/ai/flows/answer-suggestions';


interface TutorResponsePayload {
  userInput: string;
  language: string;
  nativeLanguage: string;
  level: string;
  topic: string;
}

export async function getAiTutorResponse(payload: TutorResponsePayload) {
  const { userInput, language, nativeLanguage, level, topic } = payload;
  
  const conversationalInput: ConversationalTutorInput = {
    userInput,
    language,
    nativeLanguage,
    level,
    topic
  };

  try {
    const tutorResponse = await conversationalTutor(conversationalInput);
    
    return {
      success: true,
      data: {
        grammar: tutorResponse.grammar,
        refinement: tutorResponse.refinement,
        correction: tutorResponse.correction,
        tutorResponse: tutorResponse.tutorResponse,
        translation: tutorResponse.translation,
      },
    };
  } catch (error) {
    console.error("Error getting AI tutor response:", error);
    return {
      success: false,
      error: "Failed to get response from AI. Please try again.",
    };
  }
}

interface SuggestionRequestPayload {
    tutorResponse: string;
    language: string;
    level: string;
    topic: string;
}

export async function getAnswerSuggestions(payload: SuggestionRequestPayload) {
    const { tutorResponse, language, level, topic } = payload;

    const suggestionInput: AnswerSuggestionsInput = {
        tutorResponse,
        language,
        level,
        topic,
    };

    try {
        const suggestions = await suggestAnswers(suggestionInput);
        return {
            success: true,
            data: suggestions,
        };
    } catch (error) {
        console.error("Error getting answer suggestions:", error);
        return {
            success: false,
            error: "Failed to get suggestions. Please try again.",
        };
    }
}
