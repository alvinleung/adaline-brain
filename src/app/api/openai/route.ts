import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt, model, temperature } = await req.json();

  console.log(`key open ai`, process.env.OPENAI_API_KEY);
  console.log(model);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: prompt }],
        temperature: temperature,
        // max_tokens: 100,
        top_p: 1,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      }),
    });

    const data = await response.json(); // Parse the response
    return NextResponse.json(data, { status: response.ok ? 200 : 500 }); // Handle response status
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Error fetching data from OpenAI" },
      { status: 500 }
    );
  }
}
