import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const sarvamApiKey = process.env.SARVAM_API_KEY;

        if (!sarvamApiKey) {
            return NextResponse.json({ error: 'SARVAM_API_KEY is not configured in .env.local' }, { status: 500 });
        }

        // Call Sarvam TTS API
        const response = await fetch('https://api.sarvam.ai/text-to-speech', {
            method: 'POST',
            headers: {
                'api-subscription-key': sarvamApiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: [text],
                target_language_code: "hi-IN", // Hindi for Indian context/desi hooks (Sarvam specializes here), can also use en-IN
                speaker: "meera",
                pitch: 0,
                pace: 1.0,
                loudness: 1.5,
                speech_sample_rate: 8000,
                enable_preprocessing: true,
                model: "bulbul:v3"
            }),
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error("Sarvam API Error:", errorData);
            return NextResponse.json({ error: `Sarvam API error: ${response.statusText}` }, { status: response.status });
        }

        const data = await response.json();

        // Sarvam API returns a base64 encoded audio string in the 'audios' array
        const base64Audio = data.audios[0];

        // Decode base64 to buffer to send a valid audio binary directly to the browser
        const audioBuffer = Buffer.from(base64Audio, 'base64');

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/wav',
            },
        });

    } catch (error: any) {
        console.error("TTS API Route Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
