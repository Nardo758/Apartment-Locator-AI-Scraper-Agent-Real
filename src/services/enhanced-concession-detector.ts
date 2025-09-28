// Enhanced Scraper Logic for Concession Detection
export class ConcessionDetector {
  static detectConcessionKeywords(html: string): string[] {
    const concessionPatterns = [
      /(\d+)\s*(month|week)s?\s*free/gi,
      /free\s*rent/gi,
      /move[-\s]*in\s*special/gi,
      /(\d+)\s*off/gi,
      /waived\s*(fee|deposit|application)/gi,
      /reduced\s*(deposit|fee)/gi,
      /\$0\s*(deposit|fee)/gi,
      /no\s*(deposit|fee)/gi,
      /limited\s*time/gi,
      /special\s*offer/gi,
      /promotion/gi,
      /discount/gi,
      /concession/gi
    ];

    const foundConcessions: string[] = [];
    
    concessionPatterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        foundConcessions.push(...matches);
      }
    });

    return [...new Set(foundConcessions)]; // Remove duplicates
  }

  static extractConcessionContext(html: string): any {
    // Look for concession context in common sections
    const contextSections = [
      { pattern: /special[s]?.*?(?=<|$)/gi, name: "specials" },
      { pattern: /promotion[s]?.*?(?=<|$)/gi, name: "promotions" },
      { pattern: /concession[s]?.*?(?=<|$)/gi, name: "concessions" },
      { pattern: /limited.*?offer.*?(?=<|$)/gi, name: "limited_offers" },
      { pattern: /move[-\s]*in.*?(?=<|$)/gi, name: "move_in_specials" }
    ];

    const context: any = {};
    
    contextSections.forEach(section => {
      const matches = html.match(section.pattern);
      if (matches) {
        context[section.name] = matches;
      }
    });

    return context;
  }

  static calculateNetEffectiveRent(baseRent: number, freeRentOffer: string): number {
    // Parse "1 month free on 13-month lease" type offers
    const match = freeRentOffer.match(/(\d+)\s*month/);
    if (match) {
      const freeMonths = parseInt(match[1]);
      const leaseTerm = 12; // Standard lease term
      return Math.round((baseRent * (leaseTerm - freeMonths)) / leaseTerm);
    }
    return baseRent;
  }

  static calculateConcessionConfidence(intelligence: any): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence if we found concessions
    if (intelligence.concessions && intelligence.concessions.length > 0) {
      confidence += 0.3;
    }

    // Higher confidence if we found specific free rent offers
    if (intelligence.free_rent_offers && intelligence.free_rent_offers.length > 0) {
      confidence += 0.2;
    }

    // Higher confidence if we found pricing structure
    if (intelligence.base_rent_by_unit && Object.keys(intelligence.base_rent_by_unit).length > 0) {
      confidence += 0.1;
    }

    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }

  static applyConcessionPricing(apartments: any[], intelligence: any): any[] {
    return apartments.map(apt => {
      const baseRent = apt.rent_price || apt.current_price;
      let effectiveRent = baseRent;
      let concessionText = '';
      
      // Calculate effective rent based on concessions
      if (intelligence.free_rent_offers && intelligence.free_rent_offers.length > 0) {
        const freeRent = intelligence.free_rent_offers[0];
        effectiveRent = this.calculateNetEffectiveRent(baseRent, freeRent);
        concessionText = `Net Effective Rent: $${effectiveRent} (${freeRent})`;
      }
      
      return {
        ...apt,
        base_rent: baseRent,
        effective_rent: effectiveRent,
        net_effective_rent: effectiveRent,
        concessions_applied: intelligence.concessions && intelligence.concessions.length > 0,
        concession_details: concessionText || intelligence.concessions?.join(', '),
        intelligence_confidence: intelligence.confidence_score,
        data_source: 'property_website_primary'
      };
    });
  }
}