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

async function main() {
    console.log("--- Apex Engine Blog Generator ---");
    
    const topic = await question("What car or topic is this blog about? ");
    const keyTakeaway = await question("What is your main 'human' takeaway or verdict? ");
    const specs = await question("Any specific specs or technical details to include? (optional) ");

    console.log("\nGenerating your blog draft... Please wait.");

    const prompt = `
You are the Lead Editor for Apex Engine, an authoritative automotive blog in the Philippines.
Our brand promise is: "We don't just list cars, we document machines."
Our tone is: Technical, honest, transparent, and expert-level. No marketing fluff.

Task: Write a blog post in MDX format for an Astro website.

Topic: ${topic}
Human Takeaway/Verdict: ${keyTakeaway}
Technical Details: ${specs}

Requirements:
1. Use MDX format.
2. Include Frontmatter:
   - title: A punchy, SEO-optimized title.
   - description: A brief summary for search results.
   - pubDate: "${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}"
   - heroImage: "../../assets/blog-placeholder-1.jpg"
3. Structure:
   - Start with a strong introduction.
   - Use the <VehicleSpecCard /> component if the topic is a specific car.
   - Use Markdown headers (##, ###) for sections.
   - Include a "Technical Verdict" section.
4. Style:
   - Write for a Filipino audience (reference local conditions, LTO, or market trends).
   - Avoid generic AI phrases like "In the world of...", "Crucial role", "Game changer".
   - Be specific and evidence-based.
5. Component Usage:
   If it's a car review, include this component:
   <VehicleSpecCard 
     data={{
       make: "Make",
       model: "Model",
       engine: "Engine",
       transmission: "Trans",
       fuel: "Fuel",
       seats: 5,
       year: 2024
     }} 
   />
   (Try to fill in as many specs as possible from the provided details or general knowledge).

Return ONLY the MDX content.
`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o", // Using 4o for better technical writing
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });

        const content = response.choices[0].message.content;
        
        // Clean up the output in case AI adds markdown code blocks
        const cleanedContent = content.replace(/^```mdx?\n/, '').replace(/\n```$/, '');

        const fileName = topic.toLowerCase().replace(/[^a-z0-9]/g, '-') + '.mdx';
        const filePath = path.join(process.cwd(), 'src', 'content', 'blog', fileName);

        fs.writeFileSync(filePath, cleanedContent);

        console.log(`\n✅ Success! Blog post created at: src/content/blog/${fileName}`);
    } catch (error) {
        console.error("Error generating blog:", error);
    } finally {
        rl.close();
    }
}

main();
