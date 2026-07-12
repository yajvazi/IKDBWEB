import Decimal from "decimal.js";

export function grossProfitMinorUnits(totalMinor: number, resellerCostMinor: number, stripeFeeMinor = 0): number {
  return new Decimal(totalMinor).minus(resellerCostMinor).minus(stripeFeeMinor).toDecimalPlaces(0).toNumber();
}

export function marginPercent(totalMinor: number, grossProfitMinor: number): string {
  if (totalMinor <= 0) return "0.00";
  return new Decimal(grossProfitMinor).div(totalMinor).mul(100).toFixed(2);
}
