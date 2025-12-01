import CONFIG from '../config';

interface DerivRequest {
  [key: string]: any;
  req_id?: number;
}

interface DerivResponse {
  req_id?: number;
  error?: {
    code: string;
    message: string;
  };
  authorize?: {
    account_list: Array<{
      account_type: string;
      created_at: number;
      currency: string;
      is_disabled: number;
      is_virtual: number;
      landing_company_name: string;
      loginid: string;
    }>;
    balance: number;
    country: string;
    currency: string;
    email: string;
    fullname: string;
    is_virtual: number;
    landing_company_fullname: string;
    landing_company_name: string;
    local_currencies: { [key: string]: { fractional_digits: number } };
    loginid: string;
    preferred_language: string;
    scopes: string[];
    upgradeable_landing_companies: string[];
    user_id: number;
  };
  balance?: {
    balance: number;
    currency: string;
    loginid: string;
  };
  get_account_status?: {
    authentication: any;
    currency_config: any;
    p2p_status: string;
    prompt_client_to_authenticate: number;
    risk_classification: string;
    status: string[];
  };
  [key: string]: any;
}

interface PendingRequest {
  resolve: (value: DerivResponse) => void;
  reject: (reason: any) => void;
}

class DerivWebSocket {
  private ws: WebSocket | null = null;
  private requestId: number = 0;
  private pendingRequests: Map<number, PendingRequest> = new Map();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${CONFIG.WS_URL}?app_id=${CONFIG.APP_ID}`);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onmessage = (event: MessageEvent) => {
        const data: DerivResponse = JSON.parse(event.data);
        console.log('WebSocket message:', data);

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
      };
    });
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

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  async authorize(token: string): Promise<DerivResponse> {
    try {
      const response = await this.send({
        authorize: token,
      });
      return response;
    } catch (error) {
      console.error('Authorization error:', error);
      throw error;
    }
  }

  async getAccountStatus(): Promise<DerivResponse> {
    return await this.send({
      get_account_status: 1,
    });
  }

  async getBalance(): Promise<DerivResponse> {
    return await this.send({
      balance: 1,
      subscribe: 0,
    });
  }

  async getAccountList(): Promise<DerivResponse> {
    return await this.send({
      account_list: 1,
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const websocketService = new DerivWebSocket();
export default websocketService;
