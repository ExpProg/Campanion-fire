
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
    name: z.string().optional().describe("The name of the camp."),
    description: z.string().optional().describe("A short description of the camp."),
    location: z.string().optional().describe("The location of the camp (e.g., City, State or Region)."),
    startDateString: z.string().optional().describe("The start date of the camp as a string (e.g., 'July 10, 2024', '2024-07-10', '10/07/2024')."),
    endDateString: z.string().optional().describe("The end date of the camp as a string (e.g., 'July 20, 2024', '2024-07-20', '20/07/2024')."),
    price: z.number().optional().describe("The price of the camp as a number."),
    imageUrl: z.string().url().optional().describe("A direct URL to a representative image for the camp."),
    activities: z.array(z.string()).optional().describe("A list of main activities offered at the camp."),
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
    prompt: `You are an expert data extractor. Analyze the content of the webpage at the following URL and extract the requested camp information.
If a piece of information is not clearly available, omit the corresponding field.

URL: {{{url}}}

Extract the following details:
- Camp Name (name)
- Short Description (description)
- Location (location)
- Start Date as a string (startDateString) - try to use a common format like 'MM/DD/YYYY' or 'YYYY-MM-DD' or 'Month Day, Year'
- End Date as a string (endDateString) - try to use a common format like 'MM/DD/YYYY' or 'YYYY-MM-DD' or 'Month Day, Year'
- Price as a number (price) - extract only the numerical value, remove currency symbols.
- Image URL (imageUrl) - find a relevant image representing the camp.
- List of main Activities (activities)
`,
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
        return output ?? {};
    }
);
