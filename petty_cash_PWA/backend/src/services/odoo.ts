import * as xmlrpc from 'xmlrpc';
import { logger } from '../utils/logger';

// Odoo configuration from environment variables
const ODOO_URL = process.env.ODOO_URL || 'http://localhost:8069';
const ODOO_DB = process.env.ODOO_DB || '';
const ODOO_USER = process.env.ODOO_USER || '';
const ODOO_API_KEY = process.env.ODOO_API_KEY || '';

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // milliseconds

// Custom error class for Odoo operations
export class OdooError extends Error {
  constructor(
    message: string,
    public code?: string,
    public odooFaultCode?: string
  ) {
    super(message);
    this.name = 'OdooError';
  }
}

// Authentication response interface
export interface AuthResponse {
  uid: number;
  password: string;
  context: Record<string, any>;
}

// Search read parameters interface
export interface SearchReadParams {
  model: string;
  domain?: any[];
  fields?: string[];
  offset?: number;
  limit?: number;
  order?: string;
}

// Create/write parameters interface
export interface CreateParams {
  model: string;
  data: Record<string, any>;
}

// Write parameters interface
export interface WriteParams {
  model: string;
  ids: number[];
  data: Record<string, any>;
}

// Unlink parameters interface
export interface UnlinkParams {
  model: string;
  ids: number[];
}

// Execute kwargs interface
export interface ExecuteKwargs {
  context?: Record<string, any>;
  fields?: string[];
  offset?: number;
  limit?: number;
  order?: string;
}

/**
 * Delay function for retry logic
 */
const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Extract URL components (protocol, host, port)
 */
const parseOdooUrl = (url: string): { protocol: string; host: string; port: number } => {
  const urlObj = new URL(url);
  const protocol = urlObj.protocol.replace(':', '');
  const host = urlObj.hostname;
  const port = urlObj.port ? parseInt(urlObj.port, 10) : (protocol === 'https' ? 443 : 8069);
  
  return { protocol, host, port };
};



/**
 * Authenticate with Odoo
 */
export const authenticate = async (): Promise<AuthResponse> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.info(`Odoo authentication attempt ${attempt}/${MAX_RETRIES}`);
      
      const { protocol, host, port } = parseOdooUrl(ODOO_URL);
      const clientType = protocol === 'https' ? 'https' : 'http';
      
      const client = xmlrpc.createClient({
        url: `${clientType}://${host}:${port}/xmlrpc/2/common`,
      });
      
      return new Promise((resolve, reject) => {
        client.methodCall('authenticate', [ODOO_DB, ODOO_USER, ODOO_API_KEY, {}], (error: any, value: any) => {
          if (error) {
            logger.error('Odoo authentication error:', error);
            reject(new OdooError('Authentication failed', 'AUTH_ERROR', error.faultCode));
          } else if (value === false || value === null) {
            reject(new OdooError('Invalid API key', 'INVALID_API_KEY'));
          } else {
            logger.info('Odoo authentication successful');
            resolve({
              uid: value as number,
              password: ODOO_API_KEY,
              context: {},
            });
          }
        });
      });
    } catch (error) {
      logger.error(`Authentication attempt ${attempt} failed:`, error);
      
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY * attempt);
      }
    }
  }
  
  throw new OdooError(
    `Authentication failed after ${MAX_RETRIES} attempts`,
    'MAX_RETRIES_EXCEEDED'
  );
};

/**
 * Execute any Odoo method using execute_kw
 */
export const execute_kw = async (
  auth: AuthResponse,
  model: string,
  method: string,
  args: any[] = [],
  kwargs: ExecuteKwargs = {}
): Promise<any> => {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.debug(`Executing ${model}.${method} (attempt ${attempt}/${MAX_RETRIES})`);
      
      const { protocol, host, port } = parseOdooUrl(ODOO_URL);
      const clientType = protocol === 'https' ? 'https' : 'http';
      
      const client = xmlrpc.createClient({
        url: `${clientType}://${host}:${port}/xmlrpc/2/object`,
      });
      
      const params = [
        ODOO_DB,
        auth.uid,
        auth.password,
        model,
        method,
        args,
        { ...kwargs, context: kwargs.context || {} }
      ];
      
      return new Promise((resolve, reject) => {
        client.methodCall('execute_kw', params, (error: any, value: any) => {
          if (error) {
            logger.error(`Odoo execute_kw error for ${model}.${method}:`, error);
            const detail = error.faultString || '';
            reject(new OdooError(
              detail ? `${detail}` : `Method execution failed: ${method}`,
              'EXECUTE_ERROR',
              error.faultCode
            ));
          } else {
            logger.debug(`Successfully executed ${model}.${method}`);
            resolve(value);
          }
        });
      });
    } catch (error) {
      logger.error(`Execute attempt ${attempt} failed for ${model}.${method}:`, error);
      
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY * attempt);
      }
    }
  }
  
  throw new OdooError(
    `Method execution failed after ${MAX_RETRIES} attempts: ${method}`,
    'MAX_RETRIES_EXCEEDED'
  );
};

/**
 * Search and read records from Odoo
 */
export const search_read = async (
  auth: AuthResponse,
  params: SearchReadParams
): Promise<any[]> => {
  const { model, domain = [], fields = [], offset = 0, limit = 0, order = '' } = params;
  
  try {
    const result = await execute_kw(
      auth,
      model,
      'search_read',
      [domain],
      { fields, offset, limit, order }
    );
    
    return result || [];
  } catch (error) {
    logger.error(`Search read failed for ${model}:`, error);
    throw error;
  }
};

/**
 * Create a new record in Odoo
 */
export const create = async (
  auth: AuthResponse,
  params: CreateParams
): Promise<number> => {
  const { model, data } = params;
  
  try {
    const result = await execute_kw(auth, model, 'create', [data]);
    
    if (typeof result !== 'number') {
      throw new OdooError('Invalid response from create operation', 'INVALID_RESPONSE');
    }
    
    logger.info(`Created record in ${model} with ID: ${result}`);
    return result;
  } catch (error) {
    logger.error(`Create failed for ${model}:`, error);
    throw error;
  }
};

/**
 * Update existing records in Odoo
 */
export const write = async (
  auth: AuthResponse,
  params: WriteParams
): Promise<boolean> => {
  const { model, ids, data } = params;
  
  try {
    const result = await execute_kw(auth, model, 'write', [ids, data]);
    
    if (result !== true) {
      throw new OdooError('Write operation failed', 'WRITE_ERROR');
    }
    
    logger.info(`Updated ${ids.length} record(s) in ${model}`);
    return true;
  } catch (error) {
    logger.error(`Write failed for ${model}:`, error);
    throw error;
  }
};

/**
 * Delete records from Odoo
 */
export const unlink = async (
  auth: AuthResponse,
  params: UnlinkParams
): Promise<boolean> => {
  const { model, ids } = params;
  
  try {
    const result = await execute_kw(auth, model, 'unlink', [ids]);
    
    if (result !== true) {
      throw new OdooError('Unlink operation failed', 'UNLINK_ERROR');
    }
    
    logger.info(`Deleted ${ids.length} record(s) from ${model}`);
    return true;
  } catch (error) {
    logger.error(`Unlink failed for ${model}:`, error);
    throw error;
  }
};

/**
 * OdooService class for petty cash operations
 */
export class OdooService {
  private auth: AuthResponse | null = null;
  private authPromise: Promise<AuthResponse> | null = null;

  /**
   * Get or create authentication session
   */
  private async getAuth(): Promise<AuthResponse> {
    if (this.auth) {
      return this.auth;
    }
    
    if (this.authPromise) {
      return this.authPromise;
    }
    
    this.authPromise = authenticate();
    this.auth = await this.authPromise;
    this.authPromise = null;
    
    return this.auth;
  }

  /**
   * Re-authenticate (invalidate current session)
   */
  public async reauthenticate(): Promise<AuthResponse> {
    this.auth = null;
    this.authPromise = null;
    return this.getAuth();
  }

  /**
   * Get employee by user ID
   */
  public async getEmployeeById(employeeId: number): Promise<any> {
    const auth = await this.getAuth();
    
    const result = await search_read(auth, {
      model: 'hr.employee',
      domain: [['id', '=', employeeId]],
      fields: ['id', 'name', 'work_email', 'department_id', 'job_id'],
      limit: 1
    });
    
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Get employee by name
   */
  public async getEmployeeByName(name: string): Promise<any> {
    const auth = await this.getAuth();
    
    const result = await search_read(auth, {
      model: 'hr.employee',
      domain: [['name', '=', name]],
      fields: ['id', 'name', 'work_email', 'department_id', 'job_id'],
      limit: 1
    });
    
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Get all employees
   */
  public async getEmployees(limit: number = 100, offset: number = 0): Promise<any[]> {
    const auth = await this.getAuth();
    
    return search_read(auth, {
      model: 'hr.employee',
      domain: [['active', '=', true]],
      fields: ['id', 'name', 'work_email', 'department_id', 'job_id'],
      limit,
      offset,
      order: 'name ASC'
    });
  }

  /**
   * Get petty cash account
   */
  public async getPettyCashAccount(accountId?: number): Promise<any> {
    const auth = await this.getAuth();
    
    const domain = accountId 
      ? [['id', '=', accountId]]
      : [['code', '=', ' Petty Cash']]; // Adjust based on your Odoo setup
    
    const result = await search_read(auth, {
      model: 'account.account',
      domain,
      fields: ['id', 'name', 'code', 'currency_id'],
      limit: 1
    });
    
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Get petty cash journal
   */
  public async getPettyCashJournal(journalId?: number): Promise<any> {
    const auth = await this.getAuth();
    
    const domain = journalId
      ? [['id', '=', journalId]]
      : [['type', '=', 'cash'], [['name', 'ilike', 'petty']]];
    
    const result = await search_read(auth, {
      model: 'account.journal',
      domain,
      fields: ['id', 'name', 'code', 'currency_id', 'company_id'],
      limit: 1
    });
    
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Create petty cash voucher/expense
   */
  public async createPettyCashVoucher(data: {
    employeeId: number;
    amount: number;
    description: string;
    date: string;
    accountId?: number;
    journalId?: number;
    analyticAccountId?: number;
  }): Promise<number> {
    const auth = await this.getAuth();
    
    const voucherData = {
      name: data.description,
      employee_id: data.employeeId,
      amount: data.amount,
      date: data.date,
      account_id: data.accountId,
      journal_id: data.journalId,
      analytic_account_id: data.analyticAccountId,
      state: 'draft',
    };
    
    return create(auth, {
      model: 'hr.expense.sheet', // or appropriate petty cash model
      data: voucherData
    });
  }

  /**
   * Submit petty cash voucher for approval
   */
  public async submitPettyCashVoucher(voucherId: number): Promise<boolean> {
    const auth = await this.getAuth();
    
    return execute_kw(auth, 'hr.expense.sheet', 'action_submit_sheet', [[voucherId]]);
  }

  /**
   * Approve petty cash voucher
   */
  public async approvePettyCashVoucher(voucherId: number): Promise<boolean> {
    const auth = await this.getAuth();
    
    return execute_kw(auth, 'hr.expense.sheet', 'approve_expense_sheets', [[voucherId]]);
  }

  /**
   * Pay petty cash voucher
   */
  public async payPettyCashVoucher(voucherId: number): Promise<boolean> {
    const auth = await this.getAuth();
    
    return execute_kw(auth, 'hr.expense.sheet', 'action_paid', [[voucherId]]);
  }

  /**
   * Get petty cash vouchers for employee
   */
  public async getPettyCashVouchers(
    employeeId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const auth = await this.getAuth();
    
    return search_read(auth, {
      model: 'hr.expense.sheet',
      domain: [['employee_id', '=', employeeId]],
      fields: ['id', 'name', 'employee_id', 'amount', 'date', 'state', 'currency_id'],
      limit,
      offset,
      order: 'date DESC'
    });
  }

  /**
   * Get expense categories
   */
  public async getExpenseCategories(limit: number = 100): Promise<any[]> {
    const auth = await this.getAuth();
    
    return search_read(auth, {
      model: 'hr.expense.type', // or product.category depending on Odoo version
      domain: [['active', '=', true]],
      fields: ['id', 'name', 'description'],
      limit,
      order: 'name ASC'
    });
  }

  /**
   * Get vendors/suppliers
   */
  public async getVendors(limit: number = 100, offset: number = 0): Promise<any[]> {
    const auth = await this.getAuth();
    
    return search_read(auth, {
      model: 'res.partner',
      domain: [['supplier', '=', true], ['active', '=', true]],
      fields: ['id', 'name', 'email', 'phone', 'street'],
      limit,
      offset,
      order: 'name ASC'
    });
  }

  /**
   * Create vendor
   */
  public async createVendor(data: {
    name: string;
    email?: string;
    phone?: string;
    street?: string;
  }): Promise<number> {
    const auth = await this.getAuth();
    
    return create(auth, {
      model: 'res.partner',
      data: {
        ...data,
        supplier: true,
        customer: false,
        active: true
      }
    });
  }

  /**
   * Get analytic accounts (for cost centers)
   */
  public async getAnalyticAccounts(limit: number = 100): Promise<any[]> {
    const auth = await this.getAuth();
    
    return search_read(auth, {
      model: 'account.analytic.account',
      domain: [['active', '=', true]],
      fields: ['id', 'name', 'code', 'company_id'],
      limit,
      order: 'name ASC'
    });
  }

  /**
   * Create account move (journal entry)
   */
  public async createAccountMove(data: {
    journalId: number;
    date: string;
    ref?: string;
    lineIds: number[];
  }): Promise<number> {
    const auth = await this.getAuth();
    
    return create(auth, {
      model: 'account.move',
      data: {
        journal_id: data.journalId,
        date: data.date,
        ref: data.ref,
        line_ids: data.lineIds,
        state: 'draft'
      }
    });
  }

  /**
   * Validate account move
   */
  public async validateAccountMove(moveId: number): Promise<boolean> {
    const auth = await this.getAuth();
    
    return execute_kw(auth, 'account.move', 'action_post', [[moveId]]);
  }

  /**
   * Generic search method for any model
   */
  public async search(
    model: string,
    domain: any[] = [],
    fields: string[] = [],
    limit: number = 0,
    offset: number = 0,
    order: string = ''
  ): Promise<any[]> {
    const auth = await this.getAuth();
    
    return search_read(auth, {
      model,
      domain,
      fields,
      limit,
      offset,
      order
    });
  }

  /**
   * Generic create method for any model
   */
  public async createRecord(model: string, data: Record<string, any>): Promise<number> {
    const auth = await this.getAuth();
    
    return create(auth, { model, data });
  }

  /**
   * Generic update method for any model
   */
  public async updateRecord(model: string, ids: number[], data: Record<string, any>): Promise<boolean> {
    const auth = await this.getAuth();
    
    return write(auth, { model, ids, data });
  }

  /**
   * Generic delete method for any model
   */
  public async deleteRecord(model: string, ids: number[]): Promise<boolean> {
    const auth = await this.getAuth();
    
    return unlink(auth, { model, ids });
  }
}

// Export singleton instance
export const odooService = new OdooService();
