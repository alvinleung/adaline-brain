import { NextResponse } from "next/server"; // Import NextResponse

export async function GET(req: Request) {
  // Change to GET function
  const { searchParams } = new URL(req.url); // Get query parameters
  const projectId = searchParams.get("projectId"); // Extract projectId

  try {
    const response = await fetch(
      `https://api.adaline.ai/v1/deployments/${projectId}/current`,
      {
        headers: {
          Authorization: `Bearer ${process.env.ADALINE_TOKEN}`, // Use environment variable
        },
      }
    );

    if (!response.ok) {
      throw new Error("network response was not ok");
    }

    const promptProject = await response.json(); // Parse the response
    const prompt = promptProject.messages[0].content[0].value; // Extract prompt

    return NextResponse.json({ prompt }); // Return the prompt in the response
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { error: "Error fetching data from Adaline" },
      { status: 500 }
    );
  }
}
