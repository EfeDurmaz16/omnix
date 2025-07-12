/**
 * Data Analysis Tool - Analyze data, generate insights, create charts
 */

export interface DataPoint {
  [key: string]: any;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'histogram';
  title: string;
  xAxis?: string;
  yAxis?: string;
  colorScheme?: string[];
}

export interface AnalysisResult {
  summary: {
    totalRows: number;
    columns: string[];
    numericColumns: string[];
    categoricalColumns: string[];
  };
  statistics: {
    [column: string]: {
      mean?: number;
      median?: number;
      mode?: any;
      min?: number;
      max?: number;
      stdDev?: number;
      count: number;
      nullCount: number;
    };
  };
  insights: string[];
  recommendations: string[];
}

export class DataAnalysisTool {
  
  /**
   * Analyze dataset and generate insights
   */
  static analyzeData(data: DataPoint[]): AnalysisResult {
    if (!data || data.length === 0) {
      throw new Error('No data provided for analysis');
    }

    const columns = Object.keys(data[0]);
    const numericColumns = columns.filter(col => 
      data.every(row => row[col] === null || row[col] === undefined || typeof row[col] === 'number')
    );
    const categoricalColumns = columns.filter(col => !numericColumns.includes(col));

    const statistics: AnalysisResult['statistics'] = {};
    
    // Calculate statistics for each column
    columns.forEach(column => {
      const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined);
      const nullCount = data.length - values.length;
      
      if (numericColumns.includes(column)) {
        const numericValues = values as number[];
        const sorted = numericValues.sort((a, b) => a - b);
        
        statistics[column] = {
          mean: numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length,
          median: sorted[Math.floor(sorted.length / 2)],
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          stdDev: this.calculateStdDev(numericValues),
          count: values.length,
          nullCount
        };
      } else {
        const mode = this.calculateMode(values);
        statistics[column] = {
          mode,
          count: values.length,
          nullCount
        };
      }
    });

    // Generate insights
    const insights = this.generateInsights(data, statistics, numericColumns, categoricalColumns);
    const recommendations = this.generateRecommendations(statistics, numericColumns, categoricalColumns);

    return {
      summary: {
        totalRows: data.length,
        columns,
        numericColumns,
        categoricalColumns
      },
      statistics,
      insights,
      recommendations
    };
  }

  /**
   * Generate chart configuration for visualization
   */
  static generateChartConfig(data: DataPoint[], chartType: ChartConfig['type'], options: Partial<ChartConfig> = {}): ChartConfig {
    const columns = Object.keys(data[0]);
    const numericColumns = columns.filter(col => 
      data.every(row => typeof row[col] === 'number' || row[col] === null || row[col] === undefined)
    );

    const config: ChartConfig = {
      type: chartType,
      title: options.title || `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`,
      colorScheme: options.colorScheme || ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
    };

    // Auto-select appropriate axes based on chart type
    if (chartType === 'line' || chartType === 'bar' || chartType === 'scatter') {
      config.xAxis = options.xAxis || columns[0];
      config.yAxis = options.yAxis || numericColumns[0];
    }

    return config;
  }

  /**
   * Calculate correlation matrix for numeric columns
   */
  static calculateCorrelationMatrix(data: DataPoint[], columns: string[]): { [key: string]: { [key: string]: number } } {
    const matrix: { [key: string]: { [key: string]: number } } = {};
    
    columns.forEach(col1 => {
      matrix[col1] = {};
      columns.forEach(col2 => {
        matrix[col1][col2] = this.calculateCorrelation(data, col1, col2);
      });
    });
    
    return matrix;
  }

  /**
   * Detect outliers using IQR method
   */
  static detectOutliers(data: DataPoint[], column: string): DataPoint[] {
    const values = data.map(row => row[column]).filter(val => typeof val === 'number');
    const sorted = values.sort((a, b) => a - b);
    
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data.filter(row => {
      const value = row[column];
      return typeof value === 'number' && (value < lowerBound || value > upperBound);
    });
  }

  /**
   * Group data by category and calculate aggregates
   */
  static groupBy(data: DataPoint[], groupColumn: string, valueColumn: string, aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'sum'): DataPoint[] {
    const groups: { [key: string]: number[] } = {};
    
    data.forEach(row => {
      const group = row[groupColumn];
      const value = row[valueColumn];
      
      if (!groups[group]) {
        groups[group] = [];
      }
      
      if (typeof value === 'number') {
        groups[group].push(value);
      }
    });
    
    return Object.entries(groups).map(([group, values]) => {
      let result: number;
      
      switch (aggregation) {
        case 'sum':
          result = values.reduce((sum, val) => sum + val, 0);
          break;
        case 'avg':
          result = values.reduce((sum, val) => sum + val, 0) / values.length;
          break;
        case 'count':
          result = values.length;
          break;
        case 'min':
          result = Math.min(...values);
          break;
        case 'max':
          result = Math.max(...values);
          break;
      }
      
      return {
        [groupColumn]: group,
        [valueColumn]: result
      };
    });
  }

  // Helper methods
  private static calculateStdDev(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private static calculateMode(values: any[]): any {
    const counts: { [key: string]: number } = {};
    values.forEach(val => {
      counts[val] = (counts[val] || 0) + 1;
    });
    
    return Object.entries(counts).reduce((mode, [value, count]) => 
      count > (counts[mode] || 0) ? value : mode
    );
  }

  private static calculateCorrelation(data: DataPoint[], col1: string, col2: string): number {
    const pairs = data.map(row => [row[col1], row[col2]])
      .filter(([a, b]) => typeof a === 'number' && typeof b === 'number') as [number, number][];
    
    if (pairs.length < 2) return 0;
    
    const mean1 = pairs.reduce((sum, [a]) => sum + a, 0) / pairs.length;
    const mean2 = pairs.reduce((sum, [, b]) => sum + b, 0) / pairs.length;
    
    let numerator = 0;
    let denom1 = 0;
    let denom2 = 0;
    
    pairs.forEach(([a, b]) => {
      const diff1 = a - mean1;
      const diff2 = b - mean2;
      numerator += diff1 * diff2;
      denom1 += diff1 * diff1;
      denom2 += diff2 * diff2;
    });
    
    const denominator = Math.sqrt(denom1 * denom2);
    return denominator === 0 ? 0 : numerator / denominator;
  }

  private static generateInsights(data: DataPoint[], statistics: AnalysisResult['statistics'], numericColumns: string[], categoricalColumns: string[]): string[] {
    const insights: string[] = [];
    
    // Data quality insights
    const totalRows = data.length;
    const nullCounts = Object.values(statistics).map(stat => stat.nullCount);
    const totalNulls = nullCounts.reduce((sum, count) => sum + count, 0);
    
    if (totalNulls > 0) {
      insights.push(`Dataset has ${totalNulls} null values across ${nullCounts.filter(c => c > 0).length} columns`);
    }
    
    // Numeric insights
    numericColumns.forEach(column => {
      const stat = statistics[column];
      if (stat.mean !== undefined && stat.stdDev !== undefined) {
        const cv = stat.stdDev / stat.mean;
        if (cv > 1) {
          insights.push(`${column} shows high variability (CV: ${cv.toFixed(2)})`);
        }
      }
    });
    
    // Categorical insights
    categoricalColumns.forEach(column => {
      const values = data.map(row => row[column]).filter(val => val !== null && val !== undefined);
      const uniqueValues = new Set(values).size;
      if (uniqueValues / values.length < 0.1) {
        insights.push(`${column} has low diversity (${uniqueValues} unique values)`);
      }
    });
    
    return insights;
  }

  private static generateRecommendations(statistics: AnalysisResult['statistics'], numericColumns: string[], categoricalColumns: string[]): string[] {
    const recommendations: string[] = [];
    
    // Missing data recommendations
    Object.entries(statistics).forEach(([column, stat]) => {
      if (stat.nullCount > 0) {
        recommendations.push(`Consider handling missing values in ${column} (${stat.nullCount} nulls)`);
      }
    });
    
    // Analysis recommendations
    if (numericColumns.length >= 2) {
      recommendations.push('Consider correlation analysis between numeric variables');
    }
    
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      recommendations.push('Consider group-by analysis to compare categories');
    }
    
    if (numericColumns.length > 0) {
      recommendations.push('Check for outliers that might skew your analysis');
    }
    
    return recommendations;
  }
}