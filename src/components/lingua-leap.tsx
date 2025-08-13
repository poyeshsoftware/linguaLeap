
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getAiTutorResponse, getAnswerSuggestions } from '@/app/actions';
import type { FullCorrectionOutput } from '@/ai/flows/full-correction';
import type { GrammarCheckOutput } from '@/ai/flows/grammar-check';
import type { RefinementSuggestionsOutput } from '@/ai/flows/refinement-suggestions';
import {
  ArrowLeft,
  Bot,
  CheckCircle2,
  ClipboardCopy,
  Languages,
  LoaderCircle,
  Mic,
  MicOff,
  PenSquare,
  Send,
  Sparkles,
  User,
  Volume2,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Lightbulb,
  PlayCircle,
  Globe,
  Music4,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { translations, TranslationKey } from '@/lib/translations';

const LANGUAGES = [
    { value: 'en-US', label: 'English' },
    { value: 'es-ES', label: 'Spanish' },
    { value: 'fr-FR', label: 'French' },
    { value: 'de-DE', label: 'German' },
    { value: 'it-IT', label: 'Italian' },
    { value: 'ja-JP', label: 'Japanese' },
    { value: 'ko-KR', label: 'Korean' },
    { value: 'pt-BR', label: 'Portuguese' },
    { value: 'fa-IR', label: 'Persian' },
];

const NATIVE_LANGUAGES = [
    { value: 'English', label: 'English' },
    { value: 'Persian', label: 'Persian' },
];

const TOPIC_KEYS: TranslationKey[] = [
  'topicOrderingFood',
  'topicAskingForDirections',
  'topicTalkingAboutHobbies',
  'topicMakingTravelPlans',
  'topicDiscussingWork',
  'topicJobInterview',
  'topicNurseryDay',
  'topicArtAndMuseums',
  'topicDailyRoutines',
  'topicGroceryShopping',
  'topicDoctorsAppointment',
];

const LEVEL_KEYS: TranslationKey[] = ['levelBeginner', 'levelIntermediate', 'levelAdvanced'];

interface Config {
  language: string;
  nativeLanguage: 'English' | 'Persian';
  topic: string;
  level: string;
  customTopic: string;
  autoPlayAudio: boolean;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  translation?: string;
  analysis?: {
    grammar: GrammarCheckOutput;
    refinement: RefinementSuggestionsOutput;
    correction: FullCorrectionOutput;
  };
  audioUrl?: string;
  isPlaying?: boolean;
}

// SpeechRecognition type definition for browsers that have it prefixed
declare global {
    interface Window {
      SpeechRecognition: typeof SpeechRecognition;
      webkitSpeechRecognition: typeof SpeechRecognition;
      }
}

export function LinguaLeap() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Config>({
    language: 'de-DE',
    nativeLanguage: 'Persian',
    topic: '',
    level: 'levelIntermediate',
    customTopic: '',
    autoPlayAudio: true,
  });
  const [isConfigured, setIsConfigured] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isSpeechRecognitionSupported, setIsSpeechRecognitionSupported] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const t = (key: TranslationKey, vars: Record<string, string> = {}) => {
    let text = translations[config.nativeLanguage][key] || translations['English'][key];
    Object.keys(vars).forEach(varKey => {
      text = text.replace(`{{${varKey}}}`, vars[varKey]);
    });
    return text;
  };

  const isRtl = config.nativeLanguage === 'Persian';

  useEffect(() => {
    if (config.topic === '') {
      setConfig(c => ({...c, topic: TOPIC_KEYS[0]}));
    }
  }, [config.nativeLanguage, config.topic, t]);
  
  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  }, [isRtl]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages, suggestions]);

  // State to track if the component is mounted on the client
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const playAudio = useCallback((messageId: string, audioUrl?: string) => {
    if (!audioUrl || !audioRef.current) {
        console.warn("playAudio called without audioUrl or audioRef.current");
        return;
    }

    if (audioRef.current.src === audioUrl && !audioRef.current.paused) {
      audioRef.current.pause();
    } else {
      audioRef.current.src = audioUrl;
      audioRef.current.play().catch(e => {
          console.error("Error playing audio:", e);
          toast({
              variant: 'destructive',
              title: t('playbackErrorTitle'),
              description: t('playbackErrorDescription'),
          });
      });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? { ...msg, isPlaying: true }
            : { ...msg, isPlaying: false }
        )
      );
    }
  }, [toast, t]);


  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    setSuggestions([]);
    const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue('');
    setIsLoading(true);

    const finalTopic = config.topic === 'custom' ? config.customTopic : t(config.topic as TranslationKey);
    const languageLabel = LANGUAGES.find(l => l.value === config.language)?.label;
    const levelLabel = t(config.level as TranslationKey);

    const response = await getAiTutorResponse({
      userInput: text,
      language: languageLabel!,
      nativeLanguage: config.nativeLanguage,
      level: levelLabel,
      topic: finalTopic,
    });

    setIsLoading(false);

    if (response.success && response.data) {
        const newAssistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: response.data.tutorResponse,
            translation: response.data.translation,
            analysis: {
              grammar: response.data.grammar,
              refinement: response.data.refinement,
              correction: response.data.correction,
            },
        };

        setMessages((prev) => [...prev, newAssistantMessage]);
        
        try {
            const ttsResponse = await fetch('/api/tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: response.data.tutorResponse, lang: config.language }),
            });

            if (!ttsResponse.ok) {
                const errorBody = await ttsResponse.text();
                console.error("TTS synthesis failed. Status:", ttsResponse.status, "Error:", errorBody);
                throw new Error(`TTS synthesis failed: ${errorBody || ttsResponse.statusText}`);
            }

            const audioBlob = await ttsResponse.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === newAssistantMessage.id ? { ...msg, audioUrl: audioUrl } : msg
              )
            );
            
            if (config.autoPlayAudio) {
                playAudio(newAssistantMessage.id, audioUrl);
            }

        } catch (error) {
            console.error("Error fetching or processing TTS audio:", error);
            toast({
                variant: 'destructive',
                title: t('audioErrorTitle'),
                description: t('audioErrorDescription'),
            });
        }
    } else {
      toast({
        variant: 'destructive',
        title: t('errorTitle'),
        description: response.error,
      });
      // remove the user message if AI fails
      setMessages((prev) => prev.slice(0, prev.length - 1));
    }
  };

  const handleStartChat = () => {
      const finalTopic = config.topic === 'custom' ? config.customTopic : t(config.topic as TranslationKey);
      if (!finalTopic) {
        toast({
          variant: 'destructive',
          title: t('topicRequiredTitle'),
          description: t('topicRequiredDescription'),
        });
        return;
      }
      setIsConfigured(true);
      const initialMessageContent = t('initialMessage', { topic: finalTopic });
      setMessages([
        {
          id: 'initial',
          role: 'assistant',
          content: initialMessageContent,
        },
      ]);
  }

  const handleSuggestionRequest = async () => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') return;

    setIsSuggesting(true);
    setSuggestions([]);

    const finalTopic = config.topic === 'custom' ? config.customTopic : t(config.topic as TranslationKey);
    const languageLabel = LANGUAGES.find(l => l.value === config.language)?.label;
    const levelLabel = t(config.level as TranslationKey);

    const response = await getAnswerSuggestions({
        tutorResponse: lastMessage.content,
        language: languageLabel!,
        level: levelLabel,
        topic: finalTopic,
    });

    setIsSuggesting(false);

    if (response.success && response.data) {
        setSuggestions(response.data.suggestions);
    } else {
        toast({
            variant: 'destructive',
            title: t('suggestionErrorTitle'),
            description: response.error,
        });
    }
  }

  const handleBackToSettings = () => {
    setIsConfigured(false);
    setMessages([]);
    setSuggestions([]);
  };

  useEffect(() => {
    const audioElement = new Audio();
    audioElement.onpause = () => {
        setMessages((prev) =>
            prev.map((msg) => (msg.isPlaying ? { ...msg, isPlaying: false } : msg))
        );
    };
     audioElement.onended = () => {
        setMessages((prev) =>
            prev.map((msg) => (msg.isPlaying ? { ...msg, isPlaying: false } : msg))
        );
    };
    audioRef.current = audioElement;

    return () => {
        audioRef.current?.pause();
        audioRef.current = null;
    }
  }, []);
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: t('copiedToClipboard') });
  };
  
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
    }
  };

  useEffect(() => {
    // Check for Speech Recognition API support only on the client side
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSpeechRecognitionSupported(!!SpeechRecognition);

    if (!SpeechRecognition) {
 console.warn("Speech Recognition API not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = config.language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      toast({
        variant: 'destructive',
        title: t('speechRecognitionErrorTitle'),
        description: event.error === 'not-allowed' ? t('microphoneAccessDenied') : t('speechRecognitionErrorDescription')
      })
      setIsRecording(false);
    };
    
    recognition.onresult = (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript.trim();
      setInputValue(transcript);
    };
    
    recognitionRef.current = recognition;

    return () => {
      // Clean up recognition on component unmount
      recognition.stop();
    };
  }, [config.language, toast, t, mounted]); // Add mounted as a dependency

  if (!isConfigured) {
    return (
      <Card className="w-full max-w-lg mx-auto animate-in fade-in-50 duration-500">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-2">
            <Bot size={32} className="text-primary"/>
            <CardTitle className="text-3xl font-bold font-headline">LinguaLeap</CardTitle>
          </div>
          <CardDescription>{t('appDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
           <div className="space-y-2">
            <Label htmlFor="native-language" className="flex items-center gap-2"><MessageSquare size={16}/>{t('yourLanguageLabel')}</Label>
            <Select value={config.nativeLanguage} onValueChange={(value: 'English' | 'Persian') => setConfig((c) => ({ ...c, nativeLanguage: value }))}>
              <SelectTrigger
                id="native-language"
                // Add key to force re-render on hydration if necessary, though 'value' should be sufficient
                key={config.nativeLanguage}
              >
                <SelectValue placeholder={t('selectYourLanguagePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {NATIVE_LANGUAGES.map((lang) => (<SelectItem key={lang.value} value={lang.value}>{t(lang.label as TranslationKey)}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language" className="flex items-center gap-2"><Languages size={16}/>{t('languageToPracticeLabel')}</Label>
            <Select value={config.language} onValueChange={(value) => setConfig((c) => ({ ...c, language: value }))}>
              <SelectTrigger
                id="language"
                 key={config.language}
              >
                <SelectValue placeholder={t('selectLanguagePlaceholder')} /></SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (<SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="topic" className="flex items-center gap-2"><BookOpen size={16}/>{t('topicLabel')}</Label>
            <Select value={config.topic} onValueChange={(value) => setConfig((c) => ({ ...c, topic: value }))}>
              <SelectTrigger
                id="topic"
                key={config.topic}
              >
                <SelectValue placeholder={t('selectTopicPlaceholder')} /></SelectTrigger>
              <SelectContent>
                {TOPIC_KEYS.map((topicKey) => (<SelectItem key={topicKey} value={topicKey}>{t(topicKey)}</SelectItem>))}
                <SelectItem value="custom">{t('customTopic')}</SelectItem>
              </SelectContent>
            </Select>
            {config.topic === 'custom' && (
              <Input
                placeholder={t('customTopicPlaceholder')}
                value={config.customTopic}
                onChange={(e) => setConfig((c) => ({ ...c, customTopic: e.target.value }))}
                className="mt-2 animate-in fade-in-25"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="level" className="flex items-center gap-2"><GraduationCap size={16}/>{t('proficiencyLevelLabel')}</Label>
            <Select value={config.level} onValueChange={(value) => setConfig((c) => ({ ...c, level: value }))}>
              <SelectTrigger id="level"><SelectValue placeholder={t('selectLevelPlaceholder')} /></SelectTrigger>
              <SelectContent>
                {LEVEL_KEYS.map((levelKey) => (<SelectItem key={levelKey} value={levelKey}>{t(levelKey)}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Checkbox
                id="autoplay-checkbox"
                checked={config.autoPlayAudio}
                onCheckedChange={(checked) => setConfig((c) => ({ ...c, autoPlayAudio: !!checked }))}
              />
              <Label htmlFor="autoplay-checkbox" className="flex items-center gap-2 cursor-pointer">
                <Music4 size={16}/>{t('autoPlayAudioLabel')}
              </Label>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleStartChat}>{t('startChattingButton')} <Send size={16}/></Button>
        </CardFooter>
      </Card>
    );
  }

  const lastMessageIsAssistant = messages.length > 0 && messages[messages.length-1].role === 'assistant';

  return (
    <Card className="w-full max-w-4xl h-[95vh] flex flex-col shadow-2xl animate-in fade-in-50 duration-500">
      <CardHeader className="flex flex-row items-center justify-between border-b p-4">
        <Button variant="ghost" size="icon" onClick={handleBackToSettings}><ArrowLeft /></Button>
        <div className="text-center">
            <CardTitle className="font-headline">
              {config.topic === 'custom' ? config.customTopic : t(config.topic as TranslationKey)}
            </CardTitle>
            <CardDescription>{LANGUAGES.find(l=> l.value === config.language)?.label} - {t(config.level as TranslationKey)}</CardDescription>
        </div>
        <div className="w-10"></div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-6 space-y-6">
            {messages.map((message) => (
              <div key={message.id} className={cn('flex items-start gap-4', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                {message.role === 'assistant' && (
                  <Avatar className="w-10 h-10 border">
                    <AvatarFallback><Bot /></AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-md lg:max-w-lg rounded-lg p-4", message.role === 'user' ? 'bg-primary/90 text-primary-foreground rounded-br-none' : 'bg-card border rounded-bl-none')}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                   {message.role === 'assistant' && message.audioUrl && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-2 -ml-2"
                            onClick={() => playAudio(message.id, message.audioUrl)}
                        >
                           {message.isPlaying ? (
                               <LoaderCircle size={16} className="mr-2 animate-spin"/>
                           ) : (
                               <PlayCircle size={16} className="mr-2" />
                           )}
                            {t('listenButton')}
                        </Button>
                    )}
                  {(message.analysis || message.translation) && (
                     <div className="mt-2">
                        <Accordion type="single" collapsible className="w-full">
                            {message.translation && (
                                <AccordionItem value="translation">
                                    <AccordionTrigger><Globe size={16} className="mr-2 text-accent-foreground/50"/>{t('translationLabel')}</AccordionTrigger>
                                    <AccordionContent className="p-2 bg-background rounded-md">
                                        <div className="flex items-center justify-between p-2 border bg-muted rounded-md text-sm">
                                           <span className="flex-1 pr-2">{message.translation}</span>
                                            <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => copyToClipboard(message.translation!)}>
                                                <ClipboardCopy size={14}/>
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                            {message.analysis?.grammar && (
                                <AccordionItem value="grammar">
                                    <AccordionTrigger><CheckCircle2 size={16} className="mr-2 text-accent-foreground/50"/>{t('grammarCheckLabel')}</AccordionTrigger>
                                    <AccordionContent className="space-y-2 p-2 bg-background rounded-md">
                                        <p className={cn(message.analysis.grammar.isCorrect ? "text-accent-foreground/80" : "text-destructive")}>
                                          {message.analysis.grammar.explanation}
                                        </p>
                                        {!message.analysis.grammar.isCorrect && (
                                            <div className="p-2 border bg-muted rounded-md text-sm text-foreground">
                                                {message.analysis.grammar.correctedText}
                                            </div>
                                        )}
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                            {message.analysis?.refinement && message.analysis.refinement.suggestions.length > 0 && (
                                <AccordionItem value="refinement">
                                    <AccordionTrigger><Sparkles size={16} className="mr-2 text-accent-foreground/50"/>{t('refinementSuggestionsLabel')}</AccordionTrigger>
                                    <AccordionContent className="space-y-2 p-2 bg-background rounded-md">
                                        {message.analysis.refinement.suggestions.map((s, i) => (
                                            <div key={i} className="flex items-center justify-between p-2 border bg-muted rounded-md text-sm">
                                                <span className="flex-1 pr-2">{s}</span>
                                                <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => copyToClipboard(s)}>
                                                  <ClipboardCopy size={14}/>
                                                </Button>
                                            </div>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                            {message.analysis?.correction && (
                                <AccordionItem value="correction">
                                    <AccordionTrigger><PenSquare size={16} className="mr-2 text-accent-foreground/50"/>{t('fullCorrectionLabel')}</AccordionTrigger>
                                    <AccordionContent className="p-2 bg-background rounded-md">
                                        <div className="flex items-center justify-between p-2 border bg-muted rounded-md text-sm">
                                           <span className="flex-1 pr-2">{message.analysis.correction.correctedSentence}</span>
                                            <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0" onClick={() => copyToClipboard(message.analysis.correction.correctedSentence)}>
                                                <ClipboardCopy size={14}/>
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            )}
                        </Accordion>
                     </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <Avatar className="w-10 h-10 border">
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
             {isLoading && (
                <div className="flex items-start gap-4 justify-start">
                    <Avatar className="w-10 h-10 border">
                        <AvatarFallback><Bot /></AvatarFallback>
                    </Avatar>
                    <div className="max-w-md lg:max-w-lg rounded-lg p-4 bg-card border rounded-bl-none flex items-center gap-2">
                        <LoaderCircle className="animate-spin" size={20} />
                        <span className="text-muted-foreground">{t('thinking')}...</span>
                    </div>
                </div>
            )}
             { (lastMessageIsAssistant && !isLoading) && (
                <div className="flex justify-center">
                    {suggestions.length > 0 ? (
                        <div className="flex flex-col gap-2 items-center animate-in fade-in-50">
                            {suggestions.map((suggestion, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSendMessage(suggestion)}
                                    className="bg-background hover:bg-muted"
                                >
                                    {suggestion}
                                </Button>
                            ))}
                        </div>
                    ) : (
                         <Button
                            variant="ghost"
                            onClick={handleSuggestionRequest}
                            disabled={isSuggesting}
                            className="text-muted-foreground"
                         >
                            {isSuggesting ? (
                                <LoaderCircle className="animate-spin mr-2"/>
                            ) : (
                                <Lightbulb size={16} className="mr-2"/>
                            )}
                            {t('suggestReplyButton')}
                        </Button>
                    )}
                </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="flex items-center w-full gap-2">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('textareaPlaceholder')}
            className="flex-1 resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(inputValue);
              }
            }}
            disabled={isLoading}
          />
          <Button type="button" size="icon" variant={isRecording ? 'destructive' : 'outline'} onClick={toggleRecording} disabled={isLoading || !recognitionRef.current}>
            {isRecording ? <MicOff /> : <Mic />}
          </Button>
          <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()}>
            {isLoading ? <LoaderCircle className="animate-spin" /> : <Send />}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
