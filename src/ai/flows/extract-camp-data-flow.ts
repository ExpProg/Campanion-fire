'use server';
/**
 * @fileOverview Flow to extract camp data from a URL.
 *
 * - extractCampDataFromUrl - A function that takes a URL and returns extracted camp data.
 * - ExtractCampDataInput - The input type for the extractCampDataFromUrl function.
 * - ExtractCampDataOutput - The return type for the extractCampDataFromUrl function.
 */

import { ai } from '@/ai/ai-instance';
import { z } from 'genkit';

const ExtractCampDataInputSchema = z.object({
  url: z.string().url().describe('The URL of the camp page to extract data from.'),
});
export type ExtractCampDataInput = z.infer<typeof ExtractCampDataInputSchema>;

// Define the expected output structure from the LLM
const ExtractCampDataOutputSchema = z.object({
    name: z.string().optional().describe("The name of the camp. Extract the exact name found on the page in its original language."),
    // Updated description instruction
    description: z.string().optional().describe("A very short (1-2 sentences max) summary highlighting the key purpose or theme of the camp, generated based *only* on the main content of the page. Write this summary in the *original language* of the webpage. Avoid generic phrases."),
    location: z.string().optional().describe("The location of the camp (e.g., City, State or Region). Extract only if clearly stated, in the original language."),
    startDateString: z.string().optional().describe("The start date of the camp as a string (e.g., 'July 10, 2024', '2024-07-10', '10/07/2024'). Extract only if a specific start date is clearly stated. Omit if only a month or season is mentioned."),
    endDateString: z.string().optional().describe("The end date of the camp as a string (e.g., 'July 20, 2024', '2024-07-20', '20/07/2024'). Extract only if a specific end date is clearly stated. Omit if only a month or season is mentioned."),
    price: z.number().optional().describe("The price of the camp as a number. Extract only the numerical value, remove currency symbols ($, €, ₽, etc.). Omit if no price is clearly stated."),
    imageUrl: z.string().url().optional().describe("A direct URL to a representative image for the camp (e.g., banner, logo, activities). Omit if no suitable image URL is found."),
    activities: z.array(z.string()).optional().describe("A list of main activities offered at the camp. Extract only if explicitly listed or described as core parts of the program, in the original language."),
});
export type ExtractCampDataOutput = z.infer<typeof ExtractCampDataOutputSchema>;

export async function extractCampDataFromUrl(input: ExtractCampDataInput): Promise<ExtractCampDataOutput> {
    return extractCampDataFlow(input);
}

const prompt = ai.definePrompt({
    name: 'extractCampDataPrompt',
    input: {
        schema: ExtractCampDataInputSchema,
    },
    output: {
        schema: ExtractCampDataOutputSchema,
    },
    // Refined prompt instructions for better accuracy and specific field handling
    prompt: `You are an expert data extractor. Your task is to meticulously analyze the content of the webpage at the provided URL and extract specific information about a camp.
**Crucial Instructions:**
1.  **Accuracy First:** Only extract information that is **explicitly stated** on the webpage. Do **NOT** guess, infer, or make assumptions. If a piece of information (like price, specific dates, activities, location, or image URL) is not clearly present, **omit** the corresponding field in your output.
2.  **Original Language:** Extract all textual information (name, location, activities) in the **exact language** used on the webpage. Do **NOT** translate to English or any other language.
3.  **Description Summary:** For the 'description' field, **generate** a **very short (1-2 sentences maximum)** summary highlighting the **key purpose or theme** of the camp, based **only** on the main content of the page. Write this summary in the **original language** of the webpage. Avoid generic phrases.
4.  **Field Specifics:**
    *   **name:** Extract the exact camp name as it appears on the page.
    *   **Dates (startDateString, endDateString):** Extract only if **specific** start and end dates are clearly mentioned. Use common formats like 'MM/DD/YYYY', 'YYYY-MM-DD', 'Month Day, Year', 'Day Month Year'. If only a month, season, or general timeframe is mentioned, **do not extract** the date fields.
    *   **Price:** Extract only the **numerical value** if a price is clearly stated. Remove currency symbols ($, €, ₽, etc.). If no price is found, omit the field.
    *   **imageUrl:** Find a **direct URL** to a relevant image representing the camp (e.g., a banner, logo, or photo of camp activities). If no suitable image URL is found, omit the field. Ensure it's a valid URL.
    *   **activities:** List the main activities **only if** they are explicitly listed or described as core parts of the camp program. Use the original language.

Analyze the webpage at this URL: {{{url}}}

Provide the extracted information strictly following the output schema and the instructions above.`,
});

const extractCampDataFlow = ai.defineFlow<
    typeof ExtractCampDataInputSchema,
    typeof ExtractCampDataOutputSchema
>(
    {
        name: 'extractCampDataFlow',
        inputSchema: ExtractCampDataInputSchema,
        outputSchema: ExtractCampDataOutputSchema,
    },
    async (input) => {
        const { output } = await prompt(input);
        // Ensure output exists before returning, provide default empty object if null/undefined
        // Also, explicitly check if the output might be an empty object from the LLM if nothing was found.
        if (!output || Object.keys(output).length === 0) {
           console.warn(`AI extraction returned no data or an empty object for URL: ${input.url}`);
           return {}; // Return empty object if extraction yielded nothing or failed
        }
        return output;
    }
);
