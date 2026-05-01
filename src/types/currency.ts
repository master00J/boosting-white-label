export interface GameCurrencyConfig {
  gold_currency_label: string;
  gold_per_usd: number;
  gold_payment_instructions: string;
  gold_enabled: boolean;
}

export interface CurrencyRates {
  usd_eur_rate: number;
  games: Record<string, GameCurrencyConfig>;
}
