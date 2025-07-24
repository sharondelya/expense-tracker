// Currency conversion service with exchange rates
class CurrencyService {
  constructor() {
    this.exchangeRates = {
      // Base rates relative to USD
      USD: 1.00,
      EUR: 0.85,     // 1 USD = 0.85 EUR
      GBP: 0.73,     // 1 USD = 0.73 GBP  
      PKR: 278.50,   // 1 USD = 278.50 PKR
      INR: 83.25,    // 1 USD = 83.25 INR
      JPY: 149.80    // 1 USD = 149.80 JPY
    };
    
    this.lastUpdated = new Date();
    
    // Try to fetch live rates on initialization
    this.updateExchangeRates();
  }

  // Convert amount from one currency to another
  convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return parseFloat(amount);
    }

    // Convert to USD first, then to target currency
    const usdAmount = parseFloat(amount) / this.exchangeRates[fromCurrency];
    const convertedAmount = usdAmount * this.exchangeRates[toCurrency];
    
    return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
  }

  // Get exchange rate between two currencies
  getExchangeRate(fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) return 1.0;
    
    return this.exchangeRates[toCurrency] / this.exchangeRates[fromCurrency];
  }

  // Update exchange rates from a free API (fallback to static rates if fails)
  async updateExchangeRates() {
    try {
      // Using a free exchange rate API
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      if (data && data.rates) {
        // Update rates while keeping USD as base (1.0)
        this.exchangeRates = {
          USD: 1.00,
          EUR: data.rates.EUR || 0.85,
          GBP: data.rates.GBP || 0.73,
          PKR: data.rates.PKR || 278.50,
          INR: data.rates.INR || 83.25,
          JPY: data.rates.JPY || 149.80
        };
        
        this.lastUpdated = new Date();
        console.log('Exchange rates updated successfully:', this.exchangeRates);
      }
    } catch (error) {
      console.warn('Failed to fetch live exchange rates, using fallback rates:', error.message);
      // Keep using the default static rates
    }
  }

  // Get currency info
  getCurrencyInfo(currencyCode) {
    const currencyInfo = {
      USD: { symbol: '$', name: 'US Dollar', country: 'United States' },
      EUR: { symbol: '€', name: 'Euro', country: 'European Union' },
      GBP: { symbol: '£', name: 'British Pound', country: 'United Kingdom' },
      PKR: { symbol: '₨', name: 'Pakistani Rupee', country: 'Pakistan' },
      INR: { symbol: '₹', name: 'Indian Rupee', country: 'India' },
      JPY: { symbol: '¥', name: 'Japanese Yen', country: 'Japan' }
    };
    
    return currencyInfo[currencyCode] || currencyInfo.USD;
  }

  // Format currency with appropriate symbol
  formatCurrency(amount, currencyCode) {
    const info = this.getCurrencyInfo(currencyCode);
    
    // Different formatting for different currencies
    const options = {
      minimumFractionDigits: currencyCode === 'JPY' ? 0 : 2,
      maximumFractionDigits: currencyCode === 'JPY' ? 0 : 2
    };
    
    const formattedAmount = new Intl.NumberFormat('en-US', options).format(amount);
    return `${info.symbol}${formattedAmount}`;
  }

  // Get all supported currencies
  getSupportedCurrencies() {
    return Object.keys(this.exchangeRates).map(code => ({
      code,
      ...this.getCurrencyInfo(code),
      rate: this.exchangeRates[code]
    }));
  }
}

// Create singleton instance
const currencyService = new CurrencyService();

export default currencyService;
