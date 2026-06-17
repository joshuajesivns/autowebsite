import 'dotenv/config';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import readline from 'readline';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const MODES = {
    1: {
        name: "Technical Review",
        tone: "Analytical, honest, and data-heavy. Focus on 'Documenting the machine'.",
        requirements: "Include a <VehicleSpecCard /> and a 'Technical Verdict' section.",
        length: "1,500 - 2,500 words"
    },
    2: {
        name: "Culture Story",
        tone: "Passionate, evocative, and narrative-driven. Focus on heritage and soul.",
        requirements: "Focus on storytelling, historical context, and the local Philippine scene.",
        length: "1,200 - 2,000 words"
    },
    3: {
        name: "How-To Guide",
        tone: "Instructive, clear, and practical. Focus on safety and efficiency.",
        requirements: "Include a 'Tools Needed' list. Integrate placeholders for recommended products (Affiliate-ready). Use numbered steps.",
        length: "800 - 1,500 words"
    },
    4: {
        name: "Market Insight",
        tone: "Investigative, visionary, and strategic. Focus on EVs, trends, and ROI.",
        requirements: "Focus on 'Future-proofing', cost-benefit analysis, and upcoming technology.",
        length: "1,000 - 1,800 words"
    }
};

async function main() {
    console.log("\n--- 🏎️ Apex Engine Multi-Mode Generator ---");
    console.log("Select a Mode:");
    Object.entries(MODES).forEach(([key, mode]) => {
        console.log(`${key}. ${mode.name} (${mode.tone})`);
    });

    const modeChoice = await question("\nEnter number (1-4): ");
    const selectedMode = MODES[modeChoice];

    if (!selectedMode) {
        console.error("Invalid choice. Exiting.");
        rl.close();
        return;
    }

    const topic = await question(`\n[${selectedMode.name}] What is the specific topic/car? `);
    const notes = await question("What are your key 'human' insights or personal takeaways? ");

    console.log(`\nGenerating a ${selectedMode.name} draft... This may take a moment for long-form content.`);

    const prompt = `
You are the Lead Editor for Apex Engine, an authoritative automotive platform in the Philippines.
Our brand promise is: "We don't just list cars, we document machines."

MODE: ${selectedMode.name}
TONE: ${selectedMode.tone}
LENGTH GOAL: ${selectedMode.length}
REQUIREMENTS: ${selectedMode.requirements}

TOPIC: ${topic}
USER INSIGHTS: ${notes}

Instructions:
1. Return ONLY the content in MDX format.
2. Frontmatter: title (SEO-optimized), description, pubDate (current date), heroImage ("../../assets/blog-placeholder-1.jpg").
3. Use the Apex Engine "Editorial" style:
   - Use ## for main sections (they get the visual divider).
   - Use ### for sub-sections.
   - For How-To Guides: Create a "Recommended Gear" section with placeholders like [Product Name - Affiliate Link Placeholder].
4. Language: English, but localized for the Philippines (traffic, LTO, local car culture, climate).
5. No AI fluff (avoid "In the world of...", "Crucial", "Game changer"). Be technical and specific.

MDX CONTENT:
`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        const content = response.choices[0].message.content;
        const cleanedContent = content.replace(/^```mdx?\n/, '').replace(/\n```$/, '');

        const fileName = topic.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.mdx';
        const filePath = path.join(process.cwd(), 'src', 'content', 'blog', fileName);

        fs.writeFileSync(filePath, cleanedContent);

        console.log(`\n✅ Success! ${selectedMode.name} created at: src/content/blog/${fileName}`);
    } catch (error) {
        console.error("Error generating blog:", error);
    } finally {
        rl.close();
    }
}

main();
