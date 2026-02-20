import { createDocument, listUpcomingEvents } from './src/lib/google';

async function testIntegration() {
    console.log("--- Testing Google Integration ---");

    try {
        console.log("1. Testing Calendar List...");
        const events = await listUpcomingEvents(3);
        console.log("✅ Success! Found events:", events?.length || 0);
        if (events && events.length > 0) {
            events.forEach((e: any) => console.log(`   - ${e.summary} (${e.start?.dateTime || 'No start time'})`));
        } else {
            console.log("   (No upcoming events found or calendar empty)");
        }

        console.log("\n2. Testing Doc Creation...");
        const docUrl = await createDocument("Test Doc from Teacher Copilot", "This is a test document created by the Agent.");
        console.log("✅ Success! Created Doc:", docUrl);

    } catch (error: any) {
        console.error("❌ Test Failed!");
        if (error.response) {
            console.error("   Status:", error.response.status);
            console.error("   Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("   Error:", error.message);
        }
    }
}

testIntegration();
