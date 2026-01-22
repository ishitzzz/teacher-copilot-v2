import { GoogleGenerativeAI } from "@google/generative-ai";
import { SCHOOL_DATA, TEACHERS, Student } from "@/app/data"; 
import { NextResponse } from "next/server";

// --- CONFIGURATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; 

// --- SAFETY NET IMAGES (Guaranteed to work for Demo) ---
const TOPIC_IMAGES: { [key: string]: string } = {
  "plant": "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Plant_cell_structure-en.svg/1200px-Plant_cell_structure-en.svg.png",
  "leaf": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Leaf_anatomy.svg/1200px-Leaf_anatomy.svg.png",
  "photosynthesis": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/db/Photosynthesis_en.svg/1200px-Photosynthesis_en.svg.png",
  "heart": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Diagram_of_the_human_heart_%28cropped%29.svg/1200px-Diagram_of_the_human_heart_%28cropped%29.svg.png",
  "digestive": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Digestive_system_diagram_en.svg/1000px-Digestive_system_diagram_en.svg.png",
  "fraction": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Fraction_1_over_4_pie.svg/1024px-Fraction_1_over_4_pie.svg.png",
  "magnet": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/MagnetEZ.svg/1200px-MagnetEZ.svg.png",
  "circuit": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Simple_circuit.svg/1200px-Simple_circuit.svg.png",
  "gravity": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Newton_Cannon.svg/1200px-Newton_Cannon.svg.png",
  "light": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Pencil_in_a_bowl_of_water.svg/1200px-Pencil_in_a_bowl_of_water.svg.png",
  "geometry": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Triangle.Geomery.svg/1200px-Triangle.Geomery.svg.png"
};

// --- HELPER: GENERATE IMAGE WITH DALL-E 3 ---
async function generateDalleImage(prompt: string) {
  if (!OPENAI_API_KEY) return null;
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Scientific diagram, educational textbook style, white background, high resolution, clear labels: ${prompt}`,
        n: 1,
        size: "1024x1024",
      }),
    });
    const data = await response.json();
    return data.data?.[0]?.url || null;
  } catch (error) {
    console.error("OpenAI Image Error:", error);
    return null;
  }
}

const cleanJSON = (text: string) => {
  const cleanMarkdown = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleanMarkdown.indexOf("{");
  const lastBrace = cleanMarkdown.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace >= 0) return cleanMarkdown.substring(firstBrace, lastBrace + 1);
  return cleanMarkdown;
};

const cleanHTML = (text: string) => {
  return text.replace(/```html/g, "").replace(/```/g, "").trim();
};

const cleanText = (text: string) => {
  return text.replace(/\*\*/g, "").replace(/##/g, "").replace(/\$\$/g, "").replace(/\$/g, "").trim();
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body; 
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    if (action === "chat") {
      const { currentPlan, userQuestion } = body;
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `
          Role: 'Gemini Nano Banana Pro'. Tone: Calm, simple, empathetic.
          Rule: If input is Hindi, reply in Hinglish.
          Context: "${currentPlan?.title}". Question: "${userQuestion}".
        ` }] }]
      });
      return NextResponse.json({ reply: cleanText(result.response.text()) });
    }

    if (action === "plan") {
      const { query, className, subject, teacherId } = body;
      
      const isHeartTopic = query.toLowerCase().includes("heart") || query.toLowerCase().includes("dil");
      
      let visualType = "image"; 
      if (subject === "Math" || subject === "Physics" || query.toLowerCase().includes("motion") || query.toLowerCase().includes("force")) {
        visualType = "simulation";
      }

      const classContext = SCHOOL_DATA[className] || SCHOOL_DATA["Class 6A"];
      const teacher = Object.values(TEACHERS).find(t => t.id === teacherId) || TEACHERS["Sunita"];
      const strugglers = classContext.students.filter((s: Student) => s.category === "Struggler").slice(0, 3).map((s: Student) => s.name);
      const toppers = classContext.students.filter((s: Student) => s.category === "High Performer").slice(0, 3).map((s: Student) => s.name);

      const systemPrompt = `
        ACT AS: Gemini Nano Banana Pro.
        TARGET: Rural Teacher (${teacher.name}).
        TOPIC: "${query}" in ${subject}.

        TASK: Generate a lesson plan.
        
        **VISUAL STRATEGY:**
        - Visual Type: "${visualType}"
        - IF 'simulation': Describe a modern HTML5/Tailwind widget.
        - IF 'image': Describe a detailed scientific diagram prompt AND extract a SINGLE LOWERCASE KEYWORD from this list if possible: [plant, leaf, heart, digestive, fraction, magnet, circuit, gravity, light, geometry].
        
        **JSON OUTPUT:**
        { 
          "title": "Topic Name", 
          "subtitle": "Conceptual Summary", 
          "strategy": "Teacher Strategy", 
          "hook": "Desi Analogy", 
          "groups": [
            {"name": "Team A", "task": "Simple", "students": "${strugglers.join(", ")}"},
            {"name": "Team B", "task": "Hard", "students": "${toppers.join(", ")}"},
            {"name": "Team C", "task": "Medium", "students": "Others"}
          ], 
          "script": "Script for ${teacher.name}.", 
          "visual_type": "${visualType}",
          "visual_prompt": "The prompt description",
          "visual_keyword": "plant", 
          "isVR": ${isHeartTopic} 
        }
      `;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });
      
      const jsonStr = cleanJSON(result.response.text());
      const planData = JSON.parse(jsonStr);

      // *** THE CRITICAL FIX ***
      if (planData.visual_type === "image") {
        // 1. Try Safety Net First (Fastest & Guaranteed)
        if (planData.visual_keyword) {
           const key = planData.visual_keyword.toLowerCase();
           if (TOPIC_IMAGES[key]) planData.visual_url = TOPIC_IMAGES[key];
        }

        // 2. If no Safety Net, try DALL-E (Real AI)
        if (!planData.visual_url && OPENAI_API_KEY) {
           const dalleUrl = await generateDalleImage(planData.visual_prompt);
           if (dalleUrl) planData.visual_url = dalleUrl;
        }

        // 3. Last Resort: Reliable Placeholder
        if (!planData.visual_url) {
           planData.visual_url = "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Science_icon.svg/1024px-Science_icon.svg.png";
        }
      }

      return NextResponse.json(planData);
    }

    if (action === "simulation") {
      const { simulation_prompt } = body;
      const codePrompt = `
        YOU ARE A SENIOR FRONTEND ENGINEER.
        TASK: Build a Single-File HTML5 Interactive Widget for: "${simulation_prompt}".
        RULES: Plain HTML + Vanilla JS + Tailwind CSS (CDN). Dark Mode ('bg-slate-900').
        OUTPUT: Only raw HTML string starting with <!DOCTYPE html>.
      `;
      const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: codePrompt }] }] });
      return NextResponse.json({ code: cleanHTML(result.response.text()) });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("SERVER ERROR:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}