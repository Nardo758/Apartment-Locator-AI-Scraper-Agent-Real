// Concession Tracking & Analytics
export class ConcessionTracker {
  static async trackMarketConcessions(properties: any[]) {
    const concessionStats = {
      total_properties: properties.length,
      properties_with_concessions: 0,
      free_rent_offers: 0,
      waived_fees: 0,
      reduced_deposits: 0,
      average_discount: 0,
      concession_rate: 0,
      total_discount_amount: 0
    };

    let totalDiscountSum = 0;
    let propertiesWithDiscounts = 0;

    properties.forEach(property => {
      if (property.concessions_applied) {
        concessionStats.properties_with_concessions++;
        
        if (property.concession_details?.includes('free')) {
          concessionStats.free_rent_offers++;
        }
        if (property.concession_details?.includes('waived')) {
          concessionStats.waived_fees++;
        }
        if (property.concession_details?.includes('deposit')) {
          concessionStats.reduced_deposits++;
        }
        
        // Calculate discount percentage
        if (property.effective_rent && property.base_rent) {
          const discount = ((property.base_rent - property.effective_rent) / property.base_rent) * 100;
          totalDiscountSum += discount;
          propertiesWithDiscounts++;
          concessionStats.total_discount_amount += (property.base_rent - property.effective_rent);
        }
      }
    });

    concessionStats.concession_rate = (concessionStats.properties_with_concessions / properties.length) * 100;
    concessionStats.average_discount = propertiesWithDiscounts > 0 ? totalDiscountSum / propertiesWithDiscounts : 0;

    return concessionStats;
  }

  static async analyzeConcessionTrends(properties: any[], timeframe: 'week' | 'month' | 'quarter' = 'month') {
    const now = new Date();
    const cutoffDate = new Date();
    
    switch (timeframe) {
      case 'week':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        cutoffDate.setMonth(now.getMonth() - 3);
        break;
    }

    const recentProperties = properties.filter(p => 
      new Date(p.last_seen_at || p.first_seen_at) >= cutoffDate
    );

    const currentStats = await this.trackMarketConcessions(recentProperties);
    
    return {
      timeframe,
      period_start: cutoffDate.toISOString(),
      period_end: now.toISOString(),
      ...currentStats,
      trend_analysis: {
        concession_adoption: currentStats.concession_rate > 50 ? 'high' : 
                           currentStats.concession_rate > 25 ? 'medium' : 'low',
        market_pressure: currentStats.average_discount > 10 ? 'high' : 
                        currentStats.average_discount > 5 ? 'medium' : 'low'
      }
    };
  }

  static generateConcessionReport(stats: any): string {
    const report = `
📊 CONCESSION MARKET ANALYSIS REPORT
=====================================

🏢 Property Overview:
• Total Properties Analyzed: ${stats.total_properties}
• Properties with Concessions: ${stats.properties_with_concessions} (${stats.concession_rate.toFixed(1)}%)

💰 Concession Breakdown:
• Free Rent Offers: ${stats.free_rent_offers}
• Waived Fees: ${stats.waived_fees}
• Reduced Deposits: ${stats.reduced_deposits}

📈 Financial Impact:
• Average Discount: ${stats.average_discount.toFixed(1)}%
• Total Savings Offered: $${stats.total_discount_amount?.toLocaleString() || 0}

🎯 Market Insights:
• Concession Rate: ${stats.concession_rate > 50 ? 'HIGH COMPETITION' : 
                   stats.concession_rate > 25 ? 'MODERATE COMPETITION' : 'LOW COMPETITION'}
• Market Pressure: ${stats.average_discount > 10 ? 'LANDLORD-FAVORABLE' : 
                   stats.average_discount > 5 ? 'BALANCED' : 'TENANT-FAVORABLE'}

Generated: ${new Date().toLocaleDateString()}
`;

    return report;
  }

  static async saveConcessionAnalytics(supabase: any, stats: any, market: string = 'atlanta') {
    try {
      const analyticsData = {
        market_name: market,
        analysis_date: new Date().toISOString(),
        total_properties: stats.total_properties,
        properties_with_concessions: stats.properties_with_concessions,
        concession_rate: stats.concession_rate,
        free_rent_offers: stats.free_rent_offers,
        waived_fees: stats.waived_fees,
        reduced_deposits: stats.reduced_deposits,
        average_discount: stats.average_discount,
        total_discount_amount: stats.total_discount_amount,
        market_analysis: {
          concession_adoption: stats.trend_analysis?.concession_adoption || 'unknown',
          market_pressure: stats.trend_analysis?.market_pressure || 'unknown',
          report: this.generateConcessionReport(stats)
        }
      };

      const { data, error } = await supabase
        .from('concession_analytics')
        .upsert(analyticsData, { 
          onConflict: 'market_name,analysis_date',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error('Failed to save concession analytics:', error);
        return false;
      }

      console.log('✅ Concession analytics saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving concession analytics:', error);
      return false;
    }
  }
}

// Helper function to extract concession value from text
export function parseConcessionValue(concessionText: string): number {
  if (!concessionText) return 0;
  
  const text = concessionText.toLowerCase();
  
  // Match "X months free" patterns
  const monthsFreeMatch = text.match(/(\d+)\s*months?\s*free/);
  if (monthsFreeMatch) {
    const monthsFree = parseInt(monthsFreeMatch[1]);
    return monthsFree * 1500; // Estimate based on average rent
  }

  // Match "X weeks free" patterns
  const weeksFreeMatch = text.match(/(\d+)\s*weeks?\s*free/);
  if (weeksFreeMatch) {
    const weeksFree = parseInt(weeksFreeMatch[1]);
    return (weeksFree / 4) * 1500; // Convert to months
  }

  // Match dollar amounts
  const dollarMatch = text.match(/\$(\d+(?:,\d{3})*)/);
  if (dollarMatch) {
    return parseInt(dollarMatch[1].replace(/,/g, ''));
  }

  return 0;
}

// Enhanced effective rent calculation
export function calculateEffectiveRent(baseRent: number, concessions: string[], leaseTerm: number = 12): number {
  if (!concessions || concessions.length === 0) return baseRent;

  let totalDiscount = 0;
  
  concessions.forEach(concession => {
    const value = parseConcessionValue(concession);
    totalDiscount += value;
  });

  // Calculate monthly discount
  const monthlyDiscount = totalDiscount / leaseTerm;
  return Math.max(baseRent - monthlyDiscount, 0);
}