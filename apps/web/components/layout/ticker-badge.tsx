import { tickerHue } from "@/lib/text";

type TickerBadgeProps = {
  symbol: string;
  big?: boolean;
  small?: boolean;
};

export function TickerBadge({ symbol, big = false, small = false }: TickerBadgeProps) {
  const size = big ? " big" : small ? " sm" : "";
  return (
    <span className={`tick${size}`} style={{ ["--h" as string]: tickerHue(symbol) }}>
      {symbol}
    </span>
  );
}
