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

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
1. Return ONLY the content in MDX format. Do NOT wrap it in markdown code fences.
2. Frontmatter (YAML): title (SEO-optimized), description, pubDate ("${today}"), heroImage ("../../assets/blog-placeholder-1.jpg"), and tags (an array of strings matching the car makes or models discussed, e.g., ["Toyota", "Toyota Vios"]).
3. Immediately after the frontmatter, add these import lines exactly:
   import { Figure, Split, Gallery, Pullquote } from '../../components/editorial';
   import img1 from '../../assets/blog-placeholder-2.jpg';
   import img2 from '../../assets/blog-placeholder-3.jpg';
   import img3 from '../../assets/blog-placeholder-4.jpg';
4. Use the Apex Engine "Editorial" style and the component kit to control image placement and visual rhythm:
   - Use ## for main sections (they get the visual divider) and ### for sub-sections.
   - Place a <Figure src={img1} width="full" caption="..." credit="Apex Engine" /> near the top of the article.
   - Use at least one <Split image={img2} side="right">...explanatory text...</Split> to pair an image with analysis (text goes between the tags as normal markdown; alternate side="left"/"right").
   - Use <Gallery images={[img1, img2, img3]} captions={["...", "...", "..."]} /> once, where showing multiple angles or examples helps.
   - Use one <Pullquote cite="...">memorable line</Pullquote>.
   - IMPORTANT: after EVERY image component, add this MDX comment on its own line: {/* TODO: replace placeholder with a real photo in src/assets/blog/ */}
   - For How-To Guides: also create a "Recommended Gear" section with placeholders like [Product Name - Affiliate Link Placeholder].
   - For Technical Reviews: also add 'import VehicleSpecCard from "../../components/VehicleSpecCard.astro";' and include one <VehicleSpecCard data={{ ... }} /> plus a "Technical Verdict" section.
5. Language: English, but localized for the Philippines (traffic, LTO, local car culture, climate).
6. No AI fluff (avoid "In the world of...", "Crucial", "Game changer"). Be technical and specific.

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
