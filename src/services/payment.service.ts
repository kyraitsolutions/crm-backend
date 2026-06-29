export class PaymentService {
  async createOrder(): Promise<any> {
    const data = {
      name: "abhijeet",
      email: "abhijeet@gmail.com",
      orderId: "order_id23242435",
    };
    return data;
  }
}
