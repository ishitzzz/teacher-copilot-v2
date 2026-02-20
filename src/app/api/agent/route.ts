import { NextRequest, NextResponse } from 'next/server';
import { listUpcomingEvents, createDocument } from '@/lib/google';
import { getAvailableClient, markSlotCooldown } from '@/lib/gemini';

// Define Tools
const tools: any = [
    {
        functionDeclarations: [
            {
                name: "check_schedule",
                description: "Check the teacher's calendar for upcoming classes or events.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        limit: { type: "NUMBER", description: "The number of events to fetch (default 5)" }
                    },
                },
            },
            {
                name: "create_assignment_doc",
                description: "Create a new homework assignment or worksheet in Google Docs.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        title: { type: "STRING", description: "The title of the document" },
                        content: { type: "STRING", description: "The full text content of the assignment" }
                    },
                    required: ["title", "content"]
                }
            }
        ]
    }
];

// Max retries across all available API key slots
const MAX_RETRIES = 6;

export async function POST(req: NextRequest) {
    const { userMessage } = await req.json();
    let lastError: any = null;

    // Try up to MAX_RETRIES times across different API key slots
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const { client, modelName, label } = getAvailableClient();

        try {
            console.log(`🔄 Agent: Trying ${label}...`);

            const model = client.getGenerativeModel({
                model: modelName,
                tools: tools
            });

            const chat = model.startChat();

            // 1. Send user message to Gemini
            const result = await chat.sendMessage(userMessage);
            const response = result.response;
            const call = response.functionCalls();

            if (call && call.length > 0) {
                const firstCall = call[0];

                // --- HANDLE FUNCTION CALLS ---

                if (firstCall.name === "check_schedule") {
                    const events = await listUpcomingEvents(5);
                    const functionResponse = {
                        functionResponse: {
                            name: "check_schedule",
                            response: { events: events }
                        }
                    };
                    const finalResult = await chat.sendMessage([functionResponse]);
                    console.log(`✅ Agent: Success on ${label}`);
                    return NextResponse.json({ reply: finalResult.response.text(), actionPerfomed: "check_schedule" });
                }

                if (firstCall.name === "create_assignment_doc") {
                    const { title, content } = firstCall.args as { title: string, content: string };
                    const docUrl = await createDocument(title, content);

                    const functionResponse = {
                        functionResponse: {
                            name: "create_assignment_doc",
                            response: { url: docUrl, status: "success" }
                        }
                    };
                    const finalResult = await chat.sendMessage([functionResponse]);
                    console.log(`✅ Agent: Success on ${label}`);
                    return NextResponse.json({ reply: finalResult.response.text(), actionPerfomed: "create_doc", docUrl });
                }
            }

            // Normal Text Response
            console.log(`✅ Agent: Success on ${label}`);
            return NextResponse.json({ reply: response.text() });

        } catch (error: any) {
            const errMsg = error?.message || String(error);
            console.warn(`❌ Agent: ${label} failed: ${errMsg.slice(0, 120)}`);
            markSlotCooldown(label);
            lastError = error;
            // Continue to next attempt with a different slot
        }
    }

    // All retries exhausted
    console.error("Agent: All model slots failed.", lastError);
    return NextResponse.json({ error: "Agent failed to process request. All API keys exhausted." }, { status: 500 });
}
