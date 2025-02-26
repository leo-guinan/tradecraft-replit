import OpenAI from "openai";
import type { BurnerProfile } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI();

export async function transformMessage(
  originalContent: string,
  profile: BurnerProfile
): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("OpenAI API key not found");
      return originalContent;
    }

    console.log(`Transforming message for profile ${profile.codename}`);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a message transformer that rewrites messages in the style of a specific persona.

Persona details:
- Codename: ${profile.codename}
- Personality: ${profile.personality}
- Background: ${profile.background}

Your task is to rewrite the provided message while:
1. Maintaining the core information and intent
2. Adapting the writing style to match the persona's personality
3. Incorporating relevant background knowledge
4. Keeping the spy/intelligence theme

Respond with ONLY the transformed message, no explanations or additional text.`
        },
        {
          role: "user",
          content: originalContent
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const transformedContent = response.choices[0]?.message?.content?.trim();

    if (!transformedContent) {
      console.error("No transformed content received from OpenAI");
      return originalContent;
    }

    console.log("Message transformed successfully");
    return transformedContent;
  } catch (error) {
    console.error("Failed to transform message:", error);
    return originalContent;
  }
}