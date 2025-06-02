export interface ChartSeries {
  label: string;
  data: number[] | number[][];
  color: string;
  min?: number;
  max?: number;
}