import { CalculatorScreenContent } from "./calculator-screen-content";
import { useCalculatorScreenController } from "./calculator-screen-controller";
import type { CalculatorScreenProps } from "./calculator-screen-types";

export * from "./calculator-types";
export * from "./calculator-screen-types";

// Совместимая точка входа calculator screen.
// Сам экран теперь тонкий: контракт и orchestration вынесены в отдельные модули.

export function CalculatorScreen(props: CalculatorScreenProps) {
  const state = useCalculatorScreenController(props);
  return <CalculatorScreenContent props={props} state={state} />;
}
