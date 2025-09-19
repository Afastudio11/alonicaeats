declare module 'midtrans-client' {
  interface MidtransConfig {
    isProduction: boolean;
    serverKey: string;
    clientKey: string;
  }

  export class CoreApi {
    constructor(config: MidtransConfig);
    charge(transaction: any): Promise<any>;
    transaction: {
      status(transactionId: string): Promise<any>;
    };
  }

  export class Snap {
    constructor(config: MidtransConfig);
    createTransaction(transaction: any): Promise<any>;
  }
}