import CONFIG from '../config';

// Types
export interface DerivRequest {
  [key: string]: any;
  req_id?: number;
}

export interface DerivResponse {
  req_id?: number;
  msg_type?: string;
  error?: { code: string; message: string };
  [key: string]: any;
}

export interface ActiveSymbol {
  allow_forward_starting: number;
  display_name: string;
  display_order: number;
  exchange_is_open: number;
  is_trading_suspended: number;
  market: string;
  market_display_name: string;
  pip: number;
  subgroup: string;
  subgroup_display_name: string;
  submarket: string;
  submarket_display_name: string;
  symbol: string;
  symbol_type: string;
}

export interface Tick {
  ask: number;
  bid: number;
  epoch: number;
  id: string;
  pip_size: number;
  quote: number;
  symbol: string;
}

export interface OHLC {
  close: string;
  epoch: number;
  granularity: number;
  high: string;
  id: string;
  low: string;
  open: string;
  open_time: number;
  symbol: string;
}

export interface Contract {
  barrier_category: string;
  barriers: number;
  contract_category: string;
  contract_category_display: string;
  contract_display: string;
  contract_type: string;
  exchange_name: string;
  expiry_type: string;
  forward_starting_options?: any[];
  market: string;
  max_contract_duration: string;
  min_contract_duration: string;
  sentiment: string;
  start_type: string;
  submarket: string;
  underlying_symbol: string;
}

export interface Proposal {
  ask_price: number;
  date_expiry: number;
  date_start: number;
  display_value: string;
  id: string;
  longcode: string;
  payout: number;
  spot: number;
  spot_time: number;
}

export interface OpenContract {
  account_id: number;
  barrier: string;
  barrier_count: number;
  bid_price: number;
  buy_price: number;
  contract_id: number;
  contract_type: string;
  currency: string;
  current_spot: number;
  current_spot_display_value: string;
  current_spot_time: number;
  date_expiry: number;
  date_settlement: number;
  date_start: number;
  display_name: string;
  entry_spot: number;
  entry_spot_display_value: string;
  entry_tick: number;
  entry_tick_display_value: string;
  entry_tick_time: number;
  expiry_time: number;
  is_expired: number;
  is_forward_starting: number;
  is_intraday: number;
  is_path_dependent: number;
  is_settleable: number;
  is_sold: number;
  is_valid_to_cancel: number;
  is_valid_to_sell: number;
  longcode: string;
  payout: number;
  profit: number;
  profit_percentage: number;
  purchase_time: number;
  shortcode: string;
  status: string;
  transaction_ids: { buy: number; sell?: number };
  underlying: string;
}

interface PendingRequest {
  resolve: (value: DerivResponse) => void;
  reject: (reason: any) => void;
}

type SubscriptionCallback = (data: DerivResponse) => void;

class DerivWebSocket {
  private ws: WebSocket | null = null;
  private requestId: number = 0;
  private pendingRequests: Map<number, PendingRequest> = new Map();
  private subscriptions: Map<string, SubscriptionCallback> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private isConnecting: boolean = false;
  private isAuthorized: boolean = false; // Track authorization state

  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    
    if (this.isConnecting) {
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection);
            resolve();
          }
        }, 100);
      });
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${CONFIG.WS_URL}?app_id=${CONFIG.APP_ID}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        reject(error);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        const data: DerivResponse = JSON.parse(event.data);
        
        // Handle subscription messages
        if (data.subscription?.id) {
          const callback = this.subscriptions.get(data.subscription.id);
          if (callback) {
            callback(data);
          }
        }

        // Handle request-response messages
        if (data.req_id && this.pendingRequests.has(data.req_id)) {
          const handlers = this.pendingRequests.get(data.req_id);
          if (handlers) {
            this.pendingRequests.delete(data.req_id);
            if (data.error) {
              handlers.reject(data.error);
            } else {
              handlers.resolve(data);
            }
          }
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.isConnecting = false;
        this.handleReconnect();
      };
    });
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
      setTimeout(() => this.connect(), 2000 * this.reconnectAttempts);
    }
  }

  send(request: DerivRequest): Promise<DerivResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      this.requestId++;
      const reqId = this.requestId;
      const message: DerivRequest = { ...request, req_id: reqId };

      this.pendingRequests.set(reqId, { resolve, reject });
      this.ws.send(JSON.stringify(message));

      setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  subscribe(request: DerivRequest, callback: SubscriptionCallback): Promise<string> {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await this.send({ ...request, subscribe: 1 });
        if (response.subscription?.id) {
          this.subscriptions.set(response.subscription.id, callback);
          resolve(response.subscription.id);
        }
        callback(response);
      } catch (error) {
        reject(error);
      }
    });
  }

  unsubscribe(subscriptionId: string): Promise<DerivResponse> {
    this.subscriptions.delete(subscriptionId);
    return this.send({ forget: subscriptionId });
  }

  unsubscribeAll(): Promise<DerivResponse> {
    this.subscriptions.clear();
    return this.send({ forget_all: ['ticks', 'candles', 'proposal', 'proposal_open_contract', 'balance'] });
  }

  forgetAllTicks(): Promise<DerivResponse> {
    return this.send({ forget_all: 'ticks' });
  }

  forgetAllCandles(): Promise<DerivResponse> {
    return this.send({ forget_all: 'candles' });
  }

  // === Authentication ===
  async authorize(token: string): Promise<DerivResponse> {
    // Prevent multiple authorize calls (rate limit protection)
    if (this.isAuthorized) {
      console.log('Already authorized, skipping');
      return { msg_type: 'authorize', authorize: { cached: true } };
    }
    
    const response = await this.send({ authorize: token });
    if (!response.error) {
      this.isAuthorized = true;
    }
    return response;
  }
  
  // Reset authorization state (call on disconnect/logout)
  resetAuth(): void {
    this.isAuthorized = false;
  }

  // === Account ===
  async getBalance(subscribe: boolean = false): Promise<DerivResponse> {
    return await this.send({ balance: 1, subscribe: subscribe ? 1 : 0 });
  }

  subscribeBalance(callback: SubscriptionCallback): Promise<string> {
    return this.subscribe({ balance: 1 }, callback);
  }

  async getAccountList(): Promise<DerivResponse> {
    return await this.send({ account_list: 1 });
  }

  async getAccountStatus(): Promise<DerivResponse> {
    return await this.send({ get_account_status: 1 });
  }

  async getSettings(): Promise<DerivResponse> {
    return await this.send({ get_settings: 1 });
  }

  async getWalletList(): Promise<DerivResponse> {
    return await this.send({ wallet_list: 1 });
  }

  async getLandingCompanyDetails(landingCompany: string): Promise<DerivResponse> {
    return await this.send({ landing_company_details: landingCompany });
  }

  async getStatement(options: { limit?: number; offset?: number; date_from?: number; date_to?: number } = {}): Promise<DerivResponse> {
    return await this.send({ statement: 1, ...options });
  }

  async getProfitTable(options: { limit?: number; offset?: number; date_from?: number; date_to?: number } = {}): Promise<DerivResponse> {
    return await this.send({ profit_table: 1, ...options });
  }

  // === Markets ===
  async getActiveSymbols(productType: string = 'basic'): Promise<DerivResponse> {
    return await this.send({ active_symbols: productType });
  }

  async getAssetIndex(): Promise<DerivResponse> {
    return await this.send({ asset_index: 1 });
  }

  async getTradingTimes(date: string): Promise<DerivResponse> {
    return await this.send({ trading_times: date });
  }

  // === Ticks & History ===
  async getTick(symbol: string): Promise<DerivResponse> {
    return await this.send({ ticks: symbol });
  }

  subscribeTicks(symbol: string, callback: SubscriptionCallback): Promise<string> {
    return this.subscribe({ ticks: symbol }, callback);
  }

  async getTicksHistory(symbol: string, options: {
    end?: string;
    start?: number;
    count?: number;
    granularity?: number;
    style?: 'ticks' | 'candles';
  } = {}): Promise<DerivResponse> {
    return await this.send({
      ticks_history: symbol,
      end: options.end || 'latest',
      start: options.start || 1,
      count: options.count || 100,
      granularity: options.granularity,
      style: options.style || 'ticks',
      adjust_start_time: 1,
    });
  }

  subscribeCandles(symbol: string, granularity: number, callback: SubscriptionCallback): Promise<string> {
    return this.subscribe({
      ticks_history: symbol,
      end: 'latest',
      count: 100,
      granularity,
      style: 'candles',
    }, callback);
  }

  // === Contracts ===
  async getContractsFor(symbol: string): Promise<DerivResponse> {
    return await this.send({ contracts_for: symbol, currency: 'USD' });
  }

  async getProposal(options: {
    contract_type: string;
    symbol: string;
    duration: number;
    duration_unit: string;
    currency: string;
    amount: number;
    basis: 'stake' | 'payout';
    barrier?: string;
    barrier2?: string;
  }): Promise<DerivResponse> {
    return await this.send({ proposal: 1, ...options });
  }

  subscribeProposal(options: {
    contract_type: string;
    symbol: string;
    duration: number;
    duration_unit: string;
    currency: string;
    amount: number;
    basis: 'stake' | 'payout';
    barrier?: string;
    barrier2?: string;
  }, callback: SubscriptionCallback): Promise<string> {
    return this.subscribe({ proposal: 1, ...options }, callback);
  }

  // === Trading ===
  async buy(proposalId: string, price: number): Promise<DerivResponse> {
    return await this.send({ buy: proposalId, price });
  }

  async buyContract(options: {
    contract_type: string;
    symbol: string;
    duration: number;
    duration_unit: string;
    currency: string;
    amount: number;
    basis: 'stake' | 'payout';
    barrier?: string;
  }): Promise<DerivResponse> {
    return await this.send({ buy: 1, price: options.amount, parameters: options });
  }

  async sell(contractId: number, price: number): Promise<DerivResponse> {
    return await this.send({ sell: contractId, price });
  }

  // === Open Positions ===
  async getOpenContracts(): Promise<DerivResponse> {
    return await this.send({ portfolio: 1 });
  }

  async getPortfolio(): Promise<DerivResponse> {
    return await this.send({ portfolio: 1 });
  }

  async getContractInfo(contractId: number): Promise<DerivResponse> {
    return await this.send({ proposal_open_contract: 1, contract_id: contractId });
  }

  subscribeOpenContract(contractId: number, callback: SubscriptionCallback): Promise<string> {
    return this.subscribe({ proposal_open_contract: 1, contract_id: contractId }, callback);
  }

  subscribeAllOpenContracts(callback: SubscriptionCallback): Promise<string> {
    return this.subscribe({ proposal_open_contract: 1 }, callback);
  }

  // === Utility ===
  async ping(): Promise<DerivResponse> {
    return await this.send({ ping: 1 });
  }

  async getServerTime(): Promise<DerivResponse> {
    return await this.send({ time: 1 });
  }

  async getWebsiteStatus(): Promise<DerivResponse> {
    return await this.send({ website_status: 1 });
  }

  disconnect(): void {
    this.unsubscribeAll().catch(() => {});
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
    this.subscriptions.clear();
    this.isAuthorized = false; // Reset auth on disconnect
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

const websocketService = new DerivWebSocket();
export default websocketService;
