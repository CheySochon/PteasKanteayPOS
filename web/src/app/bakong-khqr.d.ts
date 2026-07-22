declare module "bakong-khqr" {
  export class BakongKHQR {
    generateIndividual(info: any): {
      status: {
        code: number;
        errorCode: string | null;
        message: string | null;
      };
      data: {
        qr: string;
        md5: string;
      } | null;
    };
  }

  export class IndividualInfo {
    constructor(
      bakongAccountID: string,
      merchantName: string,
      merchantCity: string,
      accountInformation?: string,
      acquiringBank?: string
    );
    amount?: number;
    currency?: any;
    expirationTimestamp?: number;
  }

  export const khqrData: {
    currency: {
      usd: any;
      khr: any;
    };
  };
}
