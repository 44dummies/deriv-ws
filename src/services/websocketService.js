import CONFIG from '../config';

class DerivWebSocket {
  constructor() {
    this.ws = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
  }

  connect() {
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

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('WebSocket message:', data);

        if (data.req_id && this.pendingRequests.has(data.req_id)) {
          const { resolve, reject } = this.pendingRequests.get(data.req_id);
          this.pendingRequests.delete(data.req_id);

          if (data.error) {
            reject(data.error);
          } else {
            resolve(data);
          }
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
    });
  }

  send(request) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      this.requestId++;
      const reqId = this.requestId;
      const message = { ...request, req_id: reqId };

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

  async authorize(token) {
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

  async getAccountStatus() {
    return await this.send({
      get_account_status: 1,
    });
  }

  async getBalance() {
    return await this.send({
      balance: 1,
      subscribe: 0,
    });
  }

  async getAccountList() {
    return await this.send({
      account_list: 1,
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
  }
}

const websocketService = new DerivWebSocket();
export default websocketService;
