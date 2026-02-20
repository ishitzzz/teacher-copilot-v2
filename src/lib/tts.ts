/**
 * Utility to generate speech via our Next.js API route that hooks into Sarvam AI.
 * 
 * @param text The text to be synthesized into speech
 * @param description Originally used for Maya, kept for component compatibility
 */
export async function generateSpeech(text: string, description?: string): Promise<void> {
    try {
        // Calling our internal Next.js route instead of the python server
        const response = await fetch('/api/tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to generate speech: ${response.statusText}`);
        }

        // Convert the returned audio buffer to a binary blob
        const audioBlob = await response.blob();

        // Create an object URL for the blob to be playable
        const audioUrl = URL.createObjectURL(audioBlob);

        // Initialize the browser's Audio object
        const audio = new Audio(audioUrl);

        // Play the generated audio
        await audio.play();

        // Clean up the URL object once audio has finished playing to free up memory
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
        };
    } catch (error) {
        console.error('Error in generateSpeech:', error);
    }
}
