import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export function useAdalinePrompt(projectId: string) {
  const {
    data: promptProject,
    isLoading: isPromptLoading,
    error,
  } = useQuery({
    queryKey: [`${projectId}`],
    queryFn: async () => {
      const response = await fetch(`/api/adaline?projectId=${projectId}`); // Updated to call the API route
      if (!response.ok) {
        throw new Error("network response was not ok");
      }
      return response.json();
    },
  });

  const prompt = useMemo(
    () => promptProject && promptProject.prompt, // Updated to access prompt directly
    [promptProject]
  );

  return {
    isPromptLoading,
    prompt,
    error,
  };
}
