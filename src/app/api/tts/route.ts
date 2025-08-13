
// src/app/api/tts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

// Helper function to synthesize speech and return a buffer or throw an error
function synthesizeSpeech(speechConfig: sdk.SpeechConfig, ssml: string): Promise<Buffer> {
    // No output device specified -> audio is returned in memory
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, undefined);

    return new Promise((resolve, reject) => {
        synthesizer.speakSsmlAsync(
            ssml,
            (result) => {
                synthesizer.close();
                if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
                    // Get the audio data as a Buffer
                    const audioBuffer = Buffer.from(result.audioData);
                    resolve(audioBuffer);
                } else {
                    const errorDetails = `Speech synthesis canceled, reason: ${sdk.ResultReason[result.reason]}. Error details: ${result.errorDetails}`;
                    console.error(errorDetails);
                    reject(new Error(errorDetails));
                }
            },
            (err) => {
                console.error('Error during speech synthesis:', err);
                synthesizer.close();
                reject(err);
            }
        );
    });
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Error parsing JSON from request:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    text,
    lang,
    rate = 1.2,
    voice,
  } = body;

  if (!text || !lang) {
    console.error('Missing text or lang in request body');
    return NextResponse.json({ error: 'Missing text or lang' }, { status: 400 });
  }

  if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
    console.error('Azure Speech key or region not configured in .env file.');
    return NextResponse.json({ error: 'Server configuration error for TTS.' }, { status: 500 });
  }

  try {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_SPEECH_KEY!,
      process.env.AZURE_SPEECH_REGION!
    );

    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

    const voiceMap: Record<string, string> = {
      'en-US': 'en-US-AvaMultilingualNeural',
      'es-ES': 'es-ES-ElviraNeural',
      'fr-FR': 'fr-FR-DeniseNeural',
      'de-DE': 'de-DE-KatjaNeural',
      'it-IT': 'it-IT-ElsaNeural',
      'ja-JP': 'ja-JP-NanamiNeural',
      'ko-KR': 'ko-KR-SunHiNeural',
      'pt-BR': 'pt-BR-FranciscaNeural',
      'fa-IR': 'fa-IR-DilaraNeural',
    };

    const voiceName = voice ?? voiceMap[lang] ?? 'en-US-AvaMultilingualNeural';
    speechConfig.speechSynthesisVoiceName = voiceName;
    speechConfig.speechSynthesisLanguage = lang;

    const ssml = `
<speak version="1.0" xml:lang="${lang}">
  <voice name="${voiceName}">
    <prosody rate="${rate}">
      ${escapeXml(String(text))}
    </prosody>
  </voice>
</speak>`.trim();

    console.log(`Synthesizing speech with SSML: ${ssml}`);
    const audioBuffer = await synthesizeSpeech(speechConfig, ssml);
    console.log(`Successfully synthesized ${audioBuffer.byteLength} bytes of audio.`);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('[TTS API] Top-level error caught:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to synthesize audio: ${errorMessage}` }, { status: 500 });
  }
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' } as any)[c]
  );
}
