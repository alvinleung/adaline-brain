export async function fetchOpenAI(
  prompt: string,
  model = "gpt-4o-mini",
  temperature = 0
) {
  const result = await fetch("/api/openai", {
    // Updated to call the API route
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt, // Pass prompt directl        prompt,y
      model, // Pass model directly
      temperature,
      // max_tokens: 100, // Uncomment if needed
    }),
  });
  return result.json();
}
