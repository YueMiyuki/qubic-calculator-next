export class CoinGeckoClient {
  private baseUrl = "https://api.coingecko.com/api/v3";

  async getPrice(id: string, vsCurrency: string): Promise<number> {
    const response = await fetch(
      `${this.baseUrl}/simple/price?ids=${id}&vs_currencies=${vsCurrency}`,
    );
    const data = await response.json();
    return data[id][vsCurrency];
  }
}
