'use server';
/**
 * @fileOverview Flow to extract only the camp name from a URL.
 *
 * - extractCampNameFromUrl - A function that takes a URL and returns the extracted camp name.
 * - ExtractCampNameInput - The input type for the extractCampNameFromUrl function.
 * - ExtractCampNameOutput - The return type for the extractCampNameFromUrl function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const ExtractCampNameInputSchema = z.object({
  url: z.string().url().describe('The URL of the camp page to extract the name from.'),
});
export type ExtractCampNameInput = z.infer<typeof ExtractCampNameInputSchema>;

// Define the expected output structure: only the name
const ExtractCampNameOutputSchema = z.object({
    name: z.string().optional().describe("The name of the camp. Extract the exact name found on the page in its original language."),
    // All other fields are removed or made optional as they are no longer extracted
});
export type ExtractCampNameOutput = z.infer<typeof ExtractCampNameOutputSchema>;

// Renamed function to reflect its specific purpose
export async function extractCampNameFromUrl(input: ExtractCampNameInput): Promise<ExtractCampNameOutput> {
    return extractCampNameFlow(input);
}

const prompt = ai.definePrompt({
    name: 'extractCampNamePrompt', // Renamed prompt
    input: {
        schema: ExtractCampNameInputSchema,
    },
    output: {
        // Define the schema specifically for the LLM prompt output: only name
        schema: z.object({
            name: z.string().optional().describe("The name of the camp. Extract the exact name found on the page in its original language."),
        }),
    },
    // Refined prompt instructions to ONLY extract the name
    prompt: `You are an expert data extractor. Your task is to meticulously analyze the content of the webpage at the provided URL and extract ONLY the name of the camp.
**Crucial Instructions:**
1.  **Accuracy First:** Only extract the camp name that is **explicitly stated** on the webpage. Do **NOT** guess, infer, or make assumptions. If the name is not clearly present, **omit** the field.
2.  **Original Language:** Extract the camp name in the **exact language** used on the webpage. Do **NOT** translate to English or any other language.

Analyze the webpage at this URL: {{{url}}}

Provide ONLY the extracted camp name strictly following the output schema and the instructions above.`,
});

// Renamed flow
const extractCampNameFlow = ai.defineFlow<
    typeof ExtractCampNameInputSchema,
    typeof ExtractCampNameOutputSchema
>(
    {
        name: 'extractCampNameFlow', // Renamed flow
        inputSchema: ExtractCampNameInputSchema,
        outputSchema: ExtractCampNameOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        // Ensure output exists before returning, provide default empty object if null/undefined
        if (!output || Object.keys(output).length === 0) {
           console.warn(`AI extraction returned no name or an empty object for URL: ${input.url}`);
           return {}; // Return empty object if extraction yielded nothing or failed
        }
        // Return only the name field
        return { name: output.name } as ExtractCampNameOutput;
    }
);
