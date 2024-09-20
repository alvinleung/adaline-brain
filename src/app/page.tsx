"use client";

import SyntaxHighlighter from "react-syntax-highlighter";

import EvaluationInstruction, {
  Evaluation,
} from "@/components/EvaluationInstruction/EvaluationInstruction";
import { fetchOpenAI } from "@/utils/fetchOpenAI";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import ReactTextareaAutosize from "react-textarea-autosize";

const OLD_EVAL = `
Desired output will always under 5 sentences.
Response time is always within 2 seconds
JSON needs to adhere to  {food:  string,  reason:string } format
`;

const DEFAULT_EVAL = `
Response time is always within 2 seconds
`
  .trim()
  .split("\n")
  .map((prompt) => {
    return {
      prompt: prompt,
      hasPromptChanged: false,
      code: undefined,
    };
  });

const PROMPT = `

I'm going to give you a restaurant's menu. Then I'm going to ask you to identify which menu items match a given spoken order. Here is the menu:

<menu>
  {MENU}
</menu>

First, find the quotes from the menu that are most relevant to identifying the matching menu items, and then print them in numbered order. Quotes should be relatively short.

If there are no relevant quotes, write "No relevant quotes" instead.

Then, identify the matching menu items, starting with "Matched Items:". Do not include or reference quoted content verbatim in your identification. Don't say "According to Quote [1]" when identifying items. Instead, make references to quotes relevant to each section of the identification solely by adding their bracketed numbers at the end of relevant sentences.

Thus, the format of your overall response should look like what's shown between the <example></example> tags. Make sure to follow the formatting and spacing exactly.

Here is the spoken order: 
{ORDER}

If no items can be matched from the menu, say so.

Identify the items immediately without preamble.

`.trim();

const ORDER = `I’d like to start with the Bruschetta and the Caprese Salad. For the main course, I'll have the Grilled Chicken Alfredo and a side of Garlic Green Beans. Could you bring me a Fresh Lemonade to drink? And for dessert, I'd love to try the Cheesecake`;
const MENU = `Appetizers:

Garlic Bread - Toasted French bread with a garlic butter spread.
Bruschetta - Grilled bread topped with diced tomatoes, garlic, basil, and olive oil.
Caprese Salad - Slices of fresh mozzarella, tomatoes, and basil drizzled with balsamic reduction.
Stuffed Mushrooms - Mushrooms filled with a mixture of cream cheese, garlic, and herbs, baked to perfection.
Buffalo Wings - Spicy chicken wings served with blue cheese dressing and celery sticks.
Spinach Artichoke Dip - Creamy spinach and artichoke dip served with tortilla chips.
Calamari - Lightly breaded and fried calamari served with marinara sauce.
Soups: 8. Tomato Basil Soup - Rich tomato soup with a hint of basil, served with a garlic breadstick. 9. Chicken Tortilla Soup - Spicy chicken broth with shredded chicken, avocado, and tortilla strips. 10. French Onion Soup - Classic onion soup topped with a slice of French bread and melted Gruyère cheese.

Salads: 11. Caesar Salad - Crisp romaine lettuce, croutons, and Parmesan cheese with Caesar dressing. 12. Greek Salad - Mixed greens, tomatoes, cucumbers, olives, and feta cheese with a lemon-oregano vinaigrette. 13. Cobb Salad - Mixed greens with grilled chicken, bacon, avocado, hard-boiled egg, and blue cheese dressing. 14. Arugula Salad - Fresh arugula, pear slices, walnuts, and goat cheese with a honey-balsamic vinaigrette. 15. Quinoa Salad - Quinoa, black beans, corn, and avocado, tossed in a cilantro-lime dressing.

Main Courses: 16. Margherita Pizza - Thin-crust pizza topped with fresh tomatoes, mozzarella, and basil. 17. Pepperoni Pizza - Classic pizza topped with pepperoni slices and mozzarella cheese. 18. Four Cheese Pizza - A blend of mozzarella, Parmesan, Gorgonzola, and ricotta cheeses on a crispy crust. 19. Grilled Chicken Alfredo - Fettuccine pasta tossed in a creamy Alfredo sauce, served with grilled chicken. 20. Spaghetti Bolognese - Traditional Italian pasta with a rich beef and tomato sauce. 21. Lasagna - Layers of pasta, ricotta cheese, ground beef, and marinara sauce baked until bubbly. 22. Ribeye Steak - 12 oz. grilled ribeye steak served with mashed potatoes and steamed vegetables. 23. Salmon Fillet - Grilled salmon served with quinoa and a side of sautéed spinach. 24. Chicken Parmesan - Breaded chicken breast topped with marinara sauce and mozzarella, served over spaghetti. 25. Vegetable Stir-Fry - A mix of seasonal vegetables stir-fried with tofu in a savory soy sauce, served over rice. 26. Shrimp Scampi - Sautéed shrimp in a garlic butter sauce, served over angel hair pasta. 27. BBQ Ribs - Slow-cooked pork ribs glazed with barbecue sauce, served with coleslaw and fries. 28. Lamb Chops - Grilled lamb chops served with roasted potatoes and mint sauce.

Side Dishes: 29. French Fries - Classic golden fries served with ketchup. 30. Mashed Potatoes - Creamy mashed potatoes with butter and herbs. 31. Steamed Vegetables - A mix of broccoli, carrots, and zucchini, lightly steamed. 32. Garlic Green Beans - Green beans sautéed with garlic and olive oil. 33. Coleslaw - Creamy coleslaw with shredded cabbage and carrots. 34. Side Salad - Mixed greens with your choice of dressing.

Desserts: 35. Tiramisu - A classic Italian dessert with layers of coffee-soaked ladyfingers and mascarpone cheese. 36. Chocolate Lava Cake - Warm chocolate cake with a gooey molten center, served with vanilla ice cream. 37. Cheesecake - Rich and creamy New York-style cheesecake with a graham cracker crust. 38. Apple Pie - Warm apple pie served with a scoop of vanilla ice cream. 39. Crème Brûlée - Silky vanilla custard topped with a layer of caramelized sugar. 40. Panna Cotta - Italian cream dessert served with a berry coulis. 41. Fruit Salad - A mix of fresh seasonal fruits served with a dollop of whipped cream.

Beverages: 42. Fresh Lemonade - Hand-squeezed lemonade served over ice. 43. Iced Tea - Classic black tea served chilled with a lemon wedge. 44. Cappuccino - Espresso with steamed milk and a frothy top, dusted with cocoa powder. 45. Latte - Creamy espresso with steamed milk. 46. Orange Juice - Freshly squeezed orange juice. 47. Sparkling Water - Chilled sparkling mineral water with a slice of lemon. 48. House Red Wine - A smooth red wine with notes of cherry and oak. 49. House White Wine - A crisp white wine with hints of citrus and apple. 50. Craft Beer - A selection of local craft beers on tap.`;

export default function Home() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>(DEFAULT_EVAL);
  const [currentEvaluationIndex, setCurrentEvaluationIndex] = useState(0);

  const handlePromptChange = (index: number, value: string) => {
    setEvaluations((prev) => {
      prev[index].prompt = value;
      prev[index].hasPromptChanged = true;
      return [...prev];
    });
  };
  const handleCodeChange = (index: number, value: string) => {
    setEvaluations((prev) => {
      prev[index].code = value;
      return [...prev];
    });
  };

  const handleCreateLine = (index: number) => {
    setEvaluations((prev) => {
      const newEvaluation = {
        prompt: "",
        hasPromptChanged: false,
        code: undefined,
      };
      return [
        ...prev.slice(0, index + 1),
        newEvaluation,
        ...prev.slice(index + 1),
      ];
    });
    setCurrentEvaluationIndex(index + 1);
  };
  const handleDeleteLine = (index: number) => {
    setEvaluations((prev) => {
      return prev.filter((_, i) => i !== index); // Remove the evaluation at the specified index
    });
    // Adjust currentEvaluationIndex if necessary
    if (currentEvaluationIndex >= index && currentEvaluationIndex > 0) {
      setCurrentEvaluationIndex((prev) => prev - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        setCurrentEvaluationIndex((prev) => Math.max(prev - 1, 0));
      } else if (event.key === "ArrowDown") {
        setCurrentEvaluationIndex((prev) =>
          Math.min(prev + 1, evaluations.length - 1)
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [evaluations.length]);

  const [prompt, setPrompt] = useState(PROMPT);
  const [evaluationPrompt, setEvaluationPrompt] = useState(prompt);
  const variables = useMemo(
    () => extractTextBetweenCurlyBraces(prompt),
    [prompt]
  );
  const [variableValue, setVariableValue] = useState<string[]>([MENU, ORDER]);
  const evaluationPromptWithVar = useMemo(() => {
    let updatedPrompt = evaluationPrompt;
    variables.forEach((variable, index) => {
      updatedPrompt = updatedPrompt.replace(
        `{${variable}}`,
        variableValue[index] || ""
      );
    });
    return updatedPrompt;
  }, [evaluationPrompt, variables, variableValue]);

  const currentCode = useMemo(() => {
    if (
      !evaluations[currentEvaluationIndex] ||
      !evaluations[currentEvaluationIndex].code
    )
      return;
    const regex = /<code>([\s\S]*?)<\/code>/; // Updated regex to capture multiline content
    const match = evaluations[currentEvaluationIndex].code.match(regex);
    const javascriptContent = match ? match[1].trim() : ""; // Trim whitespace
    // console.log(evaluations[currentEvaluationIndex].code);
    return javascriptContent;
  }, [evaluations, currentEvaluationIndex]);

  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShouldShowPrompt((prev) => !prev); // Toggle the state on Escape key press
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      <div className="flex flex-row m-auto w-[140ch] gap-4 text-[14px]">
        <div
          style={{
            display: shouldShowPrompt ? "block" : "none",
          }}
        >
          {variables.map((variable, index) => (
            <div key={index}>
              <div className="opacity-60 text-[12px] mt-4">{variable}</div>
              <input
                type={"input"}
                onChange={(e) =>
                  setVariableValue((prev) => {
                    prev[index] = e.target.value;
                    return [...prev];
                  })
                }
                value={variableValue[index]}
              />
            </div>
          ))}
        </div>
        <ReactTextareaAutosize
          onChange={(e) => setPrompt(e.target.value)}
          className="p-2 outline-none px-8 border-r border-r-opacity-20 w-full opacity-80"
          style={{
            display: shouldShowPrompt ? "block" : "none",
          }}
          value={prompt}
          onBlur={() => setEvaluationPrompt(prompt)}
        />
        <div className="mt-4 m-auto w-[56ch]">
          <div className="mb-2 pl-5 font-semibold">Evaluations</div>
          <div>
            {evaluations.map((evaluation, index) => (
              <EvaluationInstruction
                evaluationPromptWithVar={evaluationPromptWithVar}
                evaluationPrompt={evaluationPrompt}
                onDeleteLine={() => handleDeleteLine(index)}
                shouldFocus={index === currentEvaluationIndex}
                onPromptChange={(value) => handlePromptChange(index, value)}
                onCodeChange={(value) => handleCodeChange(index, value)}
                onViewCode={() => setCurrentEvaluationIndex(index)}
                onCreateLine={() => handleCreateLine(index)}
                {...evaluation}
                key={index}
              />
            ))}
          </div>
          {currentCode && (
            <div className="font-mono text-[12px] mt-8">
              <SyntaxHighlighter language="javascript">
                {currentCode}
              </SyntaxHighlighter>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function extractTextBetweenCurlyBraces(input: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const matches = input.match(regex);

  if (matches) {
    return matches.map((match) => match.slice(1, match.length - 1));
  } else {
    return [];
  }
}
