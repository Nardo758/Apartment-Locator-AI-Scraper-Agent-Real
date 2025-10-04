# 🏢 Apartment Scraper Agent System

A sophisticated two-agent system for discovering and extracting apartment rental data using AI and automated browsing.

## 🤖 Agent Overview

### 1. Property Discovery Agent (Claude-based)

**Purpose**: Discover apartment property websites and extract basic information using lightweight scraping.

- **Features**:

- SERP API integration for finding property URLs
- Claude AI for intelligent information extraction
- Lightweight HTML fetching (50KB limit per page)
- Cost-effective basic property data collection
- Automatic priority scoring and complexity assessment

### 2. Rental Data Agent (Vision/Cognitive) ⭐ **COMPLETED**

**Purpose**: Extract detailed rental pricing and availability from complex multi-page apartment websites.

- **Features**:

- Playwright browser automation for human-like navigation
- GPT-4V vision model for intelligent page analysis and decision making
- Multi-page flow handling (floor plans → pricing → applications)
- Intelligent concession and availability detection
- Comprehensive rental data extraction with confidence scoring

## 🗄️ Database Schema

### `properties_basic` - Discovery Agent Output

```sql
CREATE TABLE properties_basic (
    id BIGSERIAL PRIMARY KEY,
    property_name TEXT NOT NULL,
    property_url TEXT UNIQUE NOT NULL,
    year_built INTEGER,
    total_units INTEGER,
    property_type TEXT,
    management_company TEXT,
    address TEXT,
    city TEXT, state TEXT, zip_code TEXT,
    confidence_score DECIMAL(3,2),
    website_complexity TEXT DEFAULT 'medium',
    priority_level TEXT DEFAULT 'medium',
    last_verified DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `rental_prices` - Rental Agent Output

```sql
CREATE TABLE rental_prices (
    id BIGSERIAL PRIMARY KEY,
    property_id BIGINT REFERENCES properties_basic(id),
    floorplan_name TEXT NOT NULL,
    bedrooms INTEGER NOT NULL,
    bathrooms DECIMAL(3,1) NOT NULL,
    sqft INTEGER,
    monthly_rent DECIMAL(10,2) NOT NULL,
    lease_term_months INTEGER DEFAULT 12,
    concessions TEXT,
    availability_date DATE,
    data_source TEXT DEFAULT 'vision_agent',
    confidence_score DECIMAL(3,2),
    extracted_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Run Property Discovery

```python
from property_discovery_agent import PropertyDiscoveryAgent
import asyncio

async def main():
    async with PropertyDiscoveryAgent() as agent:
        # Discover properties in Atlanta
        summary = await agent.run_discovery_pipeline("Atlanta, GA", max_properties=50)
        print(f"Discovered {summary['properties_discovered']} properties")

asyncio.run(main())
```

## ⚙️ Configuration

- **SERP_API_KEY**: For property URL discovery
### Required API Keys

- **SERP_API_KEY**: For property URL discovery
- **ANTHROPIC_API_KEY**: For Claude AI information extraction
- **SUPABASE_URL**: Your Supabase project URL
- **SUPABASE_SERVICE_ROLE_KEY**: Service role key for database access

### Optional API Keys (for Rental Agent)

- **OPENAI_API_KEY**: For vision model analysis (GPT-4o)

### Cost Control Settings

```bash
# Maximum cost per discovery batch (USD)
MAX_DISCOVERY_COST=5.0

# Priority thresholds
HIGH_PRIORITY_UNIT_THRESHOLD=200
LUXURY_KEYWORDS=luxury,premier,executive,high-end
```

## 📊 Agent Workflow

### Property Discovery Agent Flow

1. **SERP Search**: Query Google for apartment properties
2. **URL Filtering**: Remove non-property sites (Google, Facebook, etc.)
3. **Lightweight Fetch**: Get first 50KB of HTML content
4. **Claude Extraction**: Extract property basics using AI
5. **Database Storage**: Save to `properties_basic` table

### Rental Data Agent Flow (Future)

1. **Priority Selection**: Choose high-value properties first
2. **Browser Launch**: Start Playwright automation
3. **Page Analysis**: Use vision model to understand page layout
4. **Navigation**: Click through floor plans, pricing pages
5. **Data Extraction**: Capture rental rates, concessions, availability
6. **Database Storage**: Save to `rental_prices` table

## 🎯 Priority System

Properties are automatically prioritized based on:

- **High Priority**: Luxury buildings, large complexes (>200 units), major management companies
- **Medium Priority**: Standard apartments, medium complexity websites
- **Low Priority**: Small properties, outdated websites

## 💰 Cost Optimization

- Uses Claude Haiku (cost-effective model)
### Discovery Agent (Low Cost)


- Uses Claude Haiku (cost-effective model)
- Lightweight HTML fetching (50KB limit)
- Batch processing to minimize API calls

- Vision model analysis per page
### Rental Agent (Higher Cost)


- Vision model analysis per page
- Browser automation overhead
- Reserved for high-priority, complex websites only

## 🧪 Testing

### Run Structure Tests

```bash
python test_agent_structure.py
python test_rental_agent.py
```

### Test Individual Agents

```python
# Test Discovery Agent
from property_discovery_agent import PropertyDiscoveryAgent
agent = PropertyDiscoveryAgent()
print("Discovery Agent initialized successfully")

# Test Rental Agent
from rental_data_agent import RentalDataAgent
agent = RentalDataAgent()
print("Rental Agent initialized successfully")
```

### Integration Demo

```bash
python integration_demo.py
```

## 📈 Monitoring & Analytics

- Automatic cost logging per agent operation
### Cost Tracking


- Automatic cost logging per agent operation
- Budget alerts and usage monitoring
- Performance metrics collection

- Properties discovered per batch
### Success Metrics


- Properties discovered per batch
- Extraction success rates
- Confidence score distributions
- Processing time analytics

## 🔧 Development

### Project Structure

```text
agents/
├── property_discovery_agent.py    # Main discovery agent ✅
├── rental_data_agent.py          # Vision-based rental agent ✅
├── integration_demo.py           # Agent integration demo
├── test_agent_structure.py       # Discovery agent tests
├── test_rental_agent.py          # Rental agent tests
├── requirements.txt              # Python dependencies
├── .env.example                  # Configuration template
└── README.md                     # This file
```

### Adding New Agent Features

1. Extend base agent classes with new methods
2. Add configuration options to `.env.example`
3. Update database schema if needed
4. Add comprehensive tests
5. Update cost tracking for new operations

## 🚨 Error Handling

### Common Issues

- **Missing API Keys**: Check `.env` configuration
- **Rate Limits**: Implement exponential backoff
- **Website Blocking**: Rotate user agents and proxies
- **Claude API Errors**: Fallback to simpler extraction methods

### Logging

- Structured logging with different levels
- Performance metrics collection
- Error tracking and alerting

## 🔄 Future Enhancements

### Phase 2: Rental Data Agent ✅ **COMPLETED**

- Complete vision-guided browser automation
- Multi-page navigation intelligence
- Advanced concession detection

### Phase 3: Hybrid Intelligence ⭐ **NEXT**

- Smart routing between agents based on website complexity
- Cost optimization through intelligent agent selection
- Automated quality assurance and fallback mechanisms

### Advanced Features

- Real-time pricing monitoring
- Competitive analysis
- Market trend detection
- Automated reporting

---

## 📞 Support

For issues or questions:

1. Check the test suite: `python test_agent_structure.py`
2. Review configuration in `.env`
3. Check Supabase database connectivity
4. Verify API key validity and quotas

---

**🎯 Goal**: Build the most efficient and cost-effective apartment data collection system using cutting-edge AI agents.
