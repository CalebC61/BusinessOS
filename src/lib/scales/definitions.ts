import who5 from "@content/scales/who5.json";
import ngse from "@content/scales/ngse.json";
import ips from "@content/scales/ips.json";
import valuesDeck from "@content/scales/values-deck.json";

export type Instrument = "who5" | "ngse" | "ips";

export type ResponseOption = { value: number; label: string };

export type ScaleDefinition = {
  instrument: Instrument;
  name: string;
  citation: string;
  instructions: string;
  response_scale: ResponseOption[];
  items: string[];
  reverse_scored_indices: number[];
};

export type ValueCard = { id: string; label: string; description: string };

export type ValuesDeck = {
  instructions: string;
  pick_count: number;
  cards: ValueCard[];
};

const SCALES: Record<Instrument, ScaleDefinition> = {
  who5: who5 as ScaleDefinition,
  ngse: ngse as ScaleDefinition,
  ips: ips as ScaleDefinition,
};

export const SCALE_ORDER: Instrument[] = ["who5", "ngse", "ips"];

export function getScaleDefinition(instrument: Instrument): ScaleDefinition {
  return SCALES[instrument];
}

export function getAllScaleDefinitions(): ScaleDefinition[] {
  return SCALE_ORDER.map(getScaleDefinition);
}

export function getValuesDeck(): ValuesDeck {
  return valuesDeck as ValuesDeck;
}
