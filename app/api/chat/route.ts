import OpenAI from 'openai';

// Create an OpenAI API client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// IMPORTANT: Set the runtime to edge
export const runtime = 'edge';

const SYSTEM_PROMPT = `You are a helpful financial assistant that helps users record their financial transactions.
You can help users record income, expenses, and transfers.

When a user wants to record a transaction:
1. Understand the type (income, expense, or transfer)
2. Extract the amount
3. Identify the category if mentioned
4. Get the account information
5. Note any description or notes provided

Then respond with a special command 'CREATE_TRANSACTION:' followed by a JSON object containing:
\`\`\`json
{
  "transaction_type": "income" | "expense" | "transfer",
  "amount": number,
  "category": string,
  "account_id": string,
  "to_account_id": string (for transfers only),
  "note": string (optional),
  "description": string (optional),
  "transaction_date": string (ISO date string, defaults to current date)
}
\`\`\`

Format your responses using markdown:
- Use **bold** for important information
- Use \`code\` for amounts and account names
- Use bullet points for lists
- Use proper headings (##) for sections
- Format JSON in code blocks with proper syntax highlighting

If you're unsure about any details, ask the user for clarification before creating the transaction.
If the user's message is not about recording a transaction, respond normally without the CREATE_TRANSACTION command.

Example responses:

For a successful transaction:
"I'll help you record that expense.

**Transaction Details:**
- Type: \`expense\`
- Amount: \`$50.00\`
- Account: \`checking\`
- Category: \`Groceries\`

CREATE_TRANSACTION: {
  \"transaction_type\": \"expense\",
  \"amount\": 50,
  \"category\": \"Groceries\",
  \"account_id\": \"checking\",
  \"note\": \"Grocery shopping\"
}"

For clarification needed:
"I need some additional information to record this transaction:

**Missing Details:**
- Which account should this be recorded in?
- What category would you like to use?

Please provide these details and I'll help you record the transaction."`;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    // Ask OpenAI for a streaming chat completion
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      stream: true,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages,
      ],
    });

    // Create a ReadableStream from the response
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              // Send raw text content
              controller.enqueue(encoder.encode(content));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    // Return the stream with appropriate headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('API error:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error.message || 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
} 