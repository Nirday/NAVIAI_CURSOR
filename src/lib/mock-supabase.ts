/**
 * Mock Supabase client for local development
 * This provides a mock implementation that doesn't require actual Supabase credentials
 */

export interface MockSupabaseResponse<T> {
  data: T | null
  error: MockSupabaseError | null
}

export interface MockSupabaseError {
  message: string
  code?: string
  details?: string
}

class MockQueryBuilder {
  private table: string
  private client: MockSupabaseClient
  private filters: Array<{ column: string; value: any }> = []
  private selectedColumns?: string

  constructor(table: string, client: MockSupabaseClient) {
    this.table = table
    this.client = client
  }

  select(columns: string) {
    this.selectedColumns = columns
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value })
    return this
  }

  async single(): Promise<MockSupabaseResponse<any>> {
    const tableData = this.client.getTableData(this.table)
    let result = tableData.find((item: any) => {
      return this.filters.every(filter => item[filter.column] === filter.value)
    })

    if (!result) {
      return {
        data: null,
        error: { message: 'Not found', code: 'PGRST116' }
      }
    }

    // Extract selected columns if specified
    if (this.selectedColumns && this.selectedColumns !== '*') {
      const columns = this.selectedColumns.split(',').map(c => c.trim())
      const extracted: any = {}
      columns.forEach(col => {
        if (result[col] !== undefined) {
          extracted[col] = result[col]
        }
      })
      result = extracted
    }

    return { data: result, error: null }
  }

  then<TResult1 = MockSupabaseResponse<any[]>, TResult2 = never>(
    onfulfilled?: ((value: MockSupabaseResponse<any[]>) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    const tableData = this.client.getTableData(this.table)
    let filtered = tableData.filter((item: any) => {
      return this.filters.every(filter => item[filter.column] === filter.value)
    })

    // Extract selected columns if specified
    if (this.selectedColumns && this.selectedColumns !== '*') {
      const columns = this.selectedColumns.split(',').map(c => c.trim())
      filtered = filtered.map(item => {
        const extracted: any = {}
        columns.forEach(col => {
          if (item[col] !== undefined) {
            extracted[col] = item[col]
          }
        })
        return extracted
      })
    }

    const result: MockSupabaseResponse<any[]> = { data: filtered, error: null }
    return Promise.resolve(result).then(onfulfilled, onrejected)
  }
}

class MockSupabaseClient {
  private data: Map<string, any[]> = new Map()

  getTableData(table: string): any[] {
    return this.data.get(table) || []
  }

  from(table: string) {
    const queryBuilder = new MockQueryBuilder(table, this)

    return {
      select: (columns: string) => {
        queryBuilder.select(columns)
        return queryBuilder
      },
      upsert: async (payload: any, options?: { onConflict?: string }): Promise<MockSupabaseResponse<any>> => {
        const tableData = this.getTableData(table)
        const conflictKey = options?.onConflict || 'id'
        const existingIndex = tableData.findIndex((item: any) => {
          return item[conflictKey] === payload[conflictKey]
        })

        if (existingIndex >= 0) {
          tableData[existingIndex] = { ...tableData[existingIndex], ...payload }
        } else {
          tableData.push(payload)
        }

        this.data.set(table, tableData)
        return { data: payload, error: null }
      },
      update: (updates: any) => ({
        eq: async (column: string, value: any): Promise<MockSupabaseResponse<any>> => {
          const tableData = this.getTableData(table)
          const index = tableData.findIndex((item: any) => item[column] === value)
          if (index >= 0) {
            tableData[index] = { ...tableData[index], ...updates }
            this.data.set(table, tableData)
            return { data: tableData[index], error: null }
          }
          return { data: null, error: { message: 'Not found' } }
        }
      })
    }
  }

  // Initialize with mock data
  initMockData() {
    // Import mock website data
    const { mockWebsite } = require('../../libs/website-builder/src/mock-data')
    
    // Initialize websites table with mock data
    this.data.set('websites', [
      {
        user_id: 'mock-user-123',
        website_data: mockWebsite,
        status: 'published',
        published_domain: 'bellas-bakery.naviai.local'
      }
    ])
  }
}

// Create singleton instance
const mockSupabaseClient = new MockSupabaseClient()
mockSupabaseClient.initMockData()

export const mockSupabase = {
  from: (table: string) => mockSupabaseClient.from(table)
}

export const mockSupabaseAdmin = {
  from: (table: string) => mockSupabaseClient.from(table)
}

