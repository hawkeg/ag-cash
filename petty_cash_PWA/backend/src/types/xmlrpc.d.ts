declare module 'xmlrpc' {
  interface Client {
    methodCall(method: string, params: any[], callback: (error: any, value: any) => void): void;
  }
  
  function createClient(options: { url: string }): Client;
}
