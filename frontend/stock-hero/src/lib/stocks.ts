export interface StockInfo {
  symbol: string;
  name: string;
}

// Top stocks shown in the picker, most popular first.
export const STOCKS: StockInfo[] = [
  { symbol: "AAPL", name: "Apple" },
  { symbol: "MSFT", name: "Microsoft" },
  { symbol: "GOOGL", name: "Alphabet" },
  { symbol: "AMZN", name: "Amazon" },
  { symbol: "NVDA", name: "NVIDIA" },
  { symbol: "META", name: "Meta Platforms" },
  { symbol: "TSLA", name: "Tesla" },
  { symbol: "AVGO", name: "Broadcom" },
  { symbol: "BRK-B", name: "Berkshire Hathaway" },
  { symbol: "JPM", name: "JPMorgan Chase" },
  { symbol: "V", name: "Visa" },
  { symbol: "WMT", name: "Walmart" },
  { symbol: "LLY", name: "Eli Lilly" },
  { symbol: "UNH", name: "UnitedHealth" },
  { symbol: "XOM", name: "Exxon Mobil" },
  { symbol: "MA", name: "Mastercard" },
  { symbol: "JNJ", name: "Johnson & Johnson" },
  { symbol: "PG", name: "Procter & Gamble" },
  { symbol: "HD", name: "Home Depot" },
  { symbol: "COST", name: "Costco" },
  { symbol: "NFLX", name: "Netflix" },
  { symbol: "AMD", name: "AMD" },
  { symbol: "ORCL", name: "Oracle" },
  { symbol: "CRM", name: "Salesforce" },
  { symbol: "KO", name: "Coca-Cola" },
  { symbol: "PEP", name: "PepsiCo" },
  { symbol: "DIS", name: "Disney" },
  { symbol: "INTC", name: "Intel" },
  { symbol: "NKE", name: "Nike" },
  { symbol: "UBER", name: "Uber" },
];

// Quick-pick buttons next to the dropdown
export const POPULAR = STOCKS.slice(0, 6);

export const stockName = (symbol: string) => STOCKS.find((s) => s.symbol === symbol)?.name ?? symbol;
