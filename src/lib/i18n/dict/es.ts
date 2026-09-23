import { PART1 } from "./part1";
import { PART2 } from "./part2";
import { PART3 } from "./part3";
import { PART4 } from "./part4";

const ALL = [...PART1, ...PART2, ...PART3, ...PART4];

export const es: Record<string, string> = Object.fromEntries(ALL.map(([da, es]) => [da, es]));
