import { useAdalinePrompt } from "@/hooks/useAdalinePrompt";
import { fetchOpenAI } from "@/utils/fetchOpenAI";
import { useQuery } from "@tanstack/react-query";
import React, { MutableRefObject, useEffect, useRef, useState } from "react";
import { SyncLoader } from "react-spinners";
import TextareaAutosize from "react-textarea-autosize";
import Tooltip from "./Tooltip";

export type Evaluation = {
  prompt: string;
  hasPromptChanged: boolean;
  code?: string;
};

export type EvaluationResult = {
  result: "pass" | "fail";
  reason: string;
};

type Props = Evaluation & {
  onPromptChange: (prompt: string) => void;
  onCodeChange: (code: string) => void;
  onViewCode: () => void;
  onCreateLine: () => void;
  onDeleteLine: () => void;
  shouldFocus: boolean;
  evaluationPrompt: string;
  evaluationPromptWithVar: string;
};

type RubricType =
  | "Hate"
  | "Sex Crime"
  | "Child Exploitation"
  | "Violent Crimes"
  | "Self Harm"
  | "Illegal Drugs"
  | "Harassment & Bullying"
  | "Radicalization"
  | "Sexual Content"
  | "Hijacking"
  | "Generic";

const EvaluationInstruction = ({
  prompt,
  code,
  onPromptChange,
  onCodeChange,
  onViewCode,
  onCreateLine,
  onDeleteLine,
  shouldFocus,
  evaluationPrompt,
  evaluationPromptWithVar,
}: Props) => {
  const {
    prompt: codeGenerationPrompt,
    isPromptLoading,
    // error,
  } = useAdalinePrompt(`1d76e2e7-f6e6-4d15-b8eb-3a43d09fc8e2`);

  const {
    prompt: evaluationPromptFromAdaline,
    isPromptLoading: isEvaluationPromptLoading,
  } = useAdalinePrompt(`b86ce033-f116-4e0a-bf31-bbd8a4ef6157`);

  const { data: completion } = useQuery({
    queryKey: [evaluationPromptWithVar],
    queryFn: async () => {
      const result = await fetchOpenAI(evaluationPromptWithVar, "gpt-4o");
      // console.log(result.choices[0].message.content);
      return result.choices[0].message.content;
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function evaluateByLLM(
    prompt: string,
    completion: string,
    instruction: string,
    rubric: RubricType
  ) {
    if (isEvaluationPromptLoading)
      throw "cannot evaulate: prompt still loading";
    const combinedPrompt = evaluationPromptFromAdaline
      .replace("{prompt}", prompt)
      .replace("{completion}", completion)
      .replace("{instruction}", instruction);

    // use more capable model
    const result = await fetchOpenAI(combinedPrompt, "gpt-4o");

    const jsonResult = JSON.parse(result.choices[0].message.content);
    return jsonResult;
  }

  const [isDirty, setIsDirty] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const textareaRef = useRef() as MutableRefObject<HTMLTextAreaElement>;

  useEffect(() => {
    if (!shouldFocus || !textareaRef.current) return;
    textareaRef.current.focus();
  }, [shouldFocus]);
  const [isGenerating, setIsGenerating] = useState(false);

  const [result, setResult] = useState<EvaluationResult | undefined>();

  // make a debouced request to openai
  const handleBlur = async () => {
    if (!isDirty) return;
    if (prompt === "") return;
    setIsGenerating(true);
    // handle the blur
    const result = await fetchOpenAI(
      codeGenerationPrompt
        .replace("{instruction}", prompt)
        .replace("{prompt}", evaluationPrompt)
    );
    onCodeChange(result.choices[0].message.content);
    setIsGenerating(false);
    setIsDirty(false);
  };

  const onRunEvalCode = async () => {
    if (!code) return;
    setIsEvaluating(true);
    // create code completion
    const regex = /<code>([\s\S]*?)<\/code>/; // Updated regex to capture multiline content
    const match = code.match(regex);
    const javascriptContent = match ? match[1].trim() : ""; // Trim whitespace

    if (!javascriptContent) return;

    // Execute the evaluate function defined in the javascriptContent string
    const evaluate = eval(`(${javascriptContent})`);
    const responseTime = 100; // Replace with actual response time
    // console.log(evaluationPromptWithVar);
    try {
      const result = await evaluate(
        evaluationPromptWithVar,
        completion,
        responseTime
      );
      console.log(completion);
      setResult(result);
      setIsEvaluating(false);
    } catch (e) {
      setResult({ result: "fail", reason: `Evaluation script error: ${e}` });
      setIsEvaluating(false);
    }
  };

  useEffect(() => {
    if (!isDirty) return;
    setResult(undefined);
  }, [isDirty]);

  const handleEnterKeyDown = () => {
    // if (!result) {
    //  onRunEvalCode();
    //   return;
    // }
    onCreateLine(); // Trigger onCreateLine only on Enter key
  };
  if (isPromptLoading) return <div>...</div>;

  return (
    <div
      className={`relative flex flex-row my-0 focus-within:bg-gray-100 text-[14px] px-2 rounded-md`}
    >
      <div className="opacity-30 mr-2">-</div>
      <TextareaAutosize
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        ref={textareaRef}
        onBlur={handleBlur}
        className="w-[56ch] resize-none p-1 outline-none bg-transparent"
        onFocus={() => onViewCode()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // Prevent default behavior
            handleEnterKeyDown();
          }

          if (e.key === "Backspace" && prompt === "") {
            e.preventDefault(); // Prevent default behavior
            onDeleteLine(); // Trigger onDeleteLine when backspace is pressed and line is empty
          }
        }}
        onChange={(e) => {
          setIsDirty(true);
          onPromptChange(e.target.value);
        }}
        value={prompt}
      />
      {(isGenerating || isEvaluating) && (
        <div className="absolute right-0 top-0 bottom-0 h-full flex flex-row items-center justify-center opacity-30">
          <SyncLoader color="#999" style={{ transform: "scale(.4)" }} />
        </div>
      )}
      {
        <button
          className={`opacity-30 ${
            !isEvaluating && !result && !isGenerating && !isDirty && code
              ? ""
              : "invisible"
          }`}
          onClick={onRunEvalCode}
        >
          Run
        </button>
      }
      {result && (
        <div className="flex flex-row items-center justify-center">
          <span
            className={`${
              result.result === "pass"
                ? "border border-green-600 text-green-600 px-1 py-0 rounded-md"
                : "hidden"
            } `}
          >
            <Tooltip text={result.reason}>Pass</Tooltip>
          </span>
          <span
            className={`${
              result.result === "fail"
                ? "border border-red-400 text-red-600 px-1 py-0 rounded-md"
                : "hidden"
            } `}
          >
            <Tooltip text={result.reason}>Fail</Tooltip>
          </span>
        </div>
      )}
    </div>
  );
};

export default EvaluationInstruction;
