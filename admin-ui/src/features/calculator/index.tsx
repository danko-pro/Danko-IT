import { CalculatorScreenContent } from "./screen/view";
import { useCalculatorScreenController } from "./screen/use";
import type { CalculatorScreenProps } from "./screen/types";

export * from "./model/types";
export * from "./screen/types";

// Совместимая точка входа calculator screen.
// Сам экран теперь тонкий: контракт и orchestration вынесены в отдельные модули.

export function CalculatorScreen(props: CalculatorScreenProps) {
  const state = useCalculatorScreenController(props);
  return <CalculatorScreenContent props={props} state={state} />;
}
