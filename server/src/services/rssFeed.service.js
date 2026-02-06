/**
 * RSS Feed Service
 * Fetches and parses regulatory news and tender-related updates
 * from external RSS feeds for the dashboard
 */

// Simple XML parser for RSS feeds (no external dependency needed)
const parseRSSItem = (itemXml) => {
  const getTagContent = (xml, tag) => {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    if (!match) return null;
    return match[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .trim();
  };

  return {
    title: getTagContent(itemXml, 'title'),
    link: getTagContent(itemXml, 'link'),
    description: getTagContent(itemXml, 'description'),
    pubDate: getTagContent(itemXml, 'pubDate'),
    category: getTagContent(itemXml, 'category'),
    author: getTagContent(itemXml, 'author') || getTagContent(itemXml, 'dc:creator')
  };
};

const parseRSSFeed = (xml) => {
  const items = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    const item = parseRSSItem(itemXml);
    if (item.title && item.link) {
      items.push(item);
    }
  }

  // Get channel info
  const channelMatch = xml.match(/<channel[\s\S]*?<item/i);
  const channelXml = channelMatch ? channelMatch[0] : '';

  return {
    title: parseRSSItem(channelXml).title || 'News Feed',
    items
  };
};

// In-memory cache for RSS feeds
const feedCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// Default RSS feed sources for tender/procurement/regulatory news
// Focused on bid documentation regulations and government procurement practices
const DEFAULT_FEEDS = [
  {
    id: 'et-policy',
    name: 'ET Government Policy',
    url: 'https://economictimes.indiatimes.com/news/economy/policy/rssfeeds/1373380680.cms',
    category: 'REGULATORY',
    priority: 1,
    fallbackData: false,
    // Covers: Government policies, procurement rules, trade regulations, fiscal measures
  },
  {
    id: 'et-industry',
    name: 'ET Industry News',
    url: 'https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms',
    category: 'BUSINESS',
    priority: 2,
    fallbackData: false,
    // Covers: Industry developments, infrastructure projects, contract awards
  },
  {
    id: 'inn-business',
    name: 'India Business News',
    url: 'https://www.indianewsnetwork.com/rss.en.business.xml',
    category: 'BUSINESS',
    priority: 3,
    fallbackData: false,
    // Covers: Trade agreements, economic partnerships, business regulations
  },
  {
    id: 'et-economy',
    name: 'ET Economy',
    url: 'https://economictimes.indiatimes.com/news/economy/rssfeeds/1373380680.cms',
    category: 'REGULATORY',
    priority: 4,
    fallbackData: false,
    // Covers: Economic indicators, budget updates, monetary policy, RBI rates
  }
];

// Fallback/mock data for demo purposes when RSS feeds are unavailable
// Links point to real government portal homepages that actually exist
const FALLBACK_NEWS = [
  {
    id: 'news-1',
    title: 'New Guidelines for EMD Submission in Government Tenders',
    description: 'Ministry announces updated guidelines for Earnest Money Deposit requirements in public procurement. Digital payment methods now mandatory for tenders above ₹10 Lakhs.',
    link: 'https://eprocure.gov.in/eprocure/app',
    pubDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'REGULATORY',
    source: 'Central Public Procurement Portal',
    isHighlight: true
  },
  {
    id: 'news-2',
    title: 'Deadline Extension: Infrastructure Projects Q1 2025',
    description: 'Submission deadlines for infrastructure tenders in the National Highway expansion project have been extended by 15 days due to festive season.',
    link: 'https://eprocure.gov.in/eprocure/app',
    pubDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'DEADLINE',
    source: 'Ministry of Road Transport',
    isHighlight: false
  },
  {
    id: 'news-3',
    title: 'Mandatory Technical Compliance: ISO 9001:2015 for IT Tenders',
    description: 'All IT and software development tenders above ₹50 Lakhs now require ISO 9001:2015 certification as a mandatory eligibility criterion.',
    link: 'https://www.meity.gov.in/',
    pubDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'COMPLIANCE',
    source: 'Ministry of Electronics and IT',
    isHighlight: true
  },
  {
    id: 'news-4',
    title: 'GeM 4.0 Platform Update: New Bid Submission Features',
    description: 'Government e-Marketplace introduces enhanced bid submission interface with real-time compliance checking and AI-assisted form filling.',
    link: 'https://gem.gov.in/',
    pubDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'PLATFORM',
    source: 'GeM Portal',
    isHighlight: false
  },
  {
    id: 'news-5',
    title: 'Annual Vendor Registration Renewal Reminder',
    description: 'Registered vendors are reminded to renew their CPPP/GeM registrations before March 31, 2025 to maintain eligibility for government tenders.',
    link: 'https://eprocure.gov.in/eprocure/app',
    pubDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'REMINDER',
    source: 'Central Procurement Portal',
    isHighlight: false
  },
  {
    id: 'news-6',
    title: 'Green Procurement Policy: New Environmental Compliance Requirements',
    description: 'Public sector tenders to include mandatory environmental impact assessment for projects exceeding ₹5 Crore, effective April 2025.',
    link: 'https://moef.gov.in/',
    pubDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'REGULATORY',
    source: 'Ministry of Environment',
    isHighlight: true
  }
];

export const RSSFeedService = {
  /**
   * Fetch and parse an RSS feed
   * @param {string} url - RSS feed URL
   * @param {number} timeout - Request timeout in ms
   * @returns {Object} Parsed feed with items
   */
  async fetchFeed(url, timeout = 10000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'TenderManagement/1.0 RSS Reader',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = await response.text();
      return parseRSSFeed(xml);
    } catch (err) {
      console.error(`[RSSFeed] Failed to fetch ${url}:`, err.message);
      throw err;
    }
  },

  /**
   * Get cached feed or fetch fresh
   */
  async getCachedFeed(feedConfig) {
    const cacheKey = feedConfig.id;
    const cached = feedCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const feed = await this.fetchFeed(feedConfig.url);
      feedCache.set(cacheKey, {
        data: feed,
        timestamp: Date.now()
      });
      return feed;
    } catch (err) {
      // Return cached data even if stale, or null
      return cached?.data || null;
    }
  },

  /**
   * Get aggregated news from all configured feeds
   * Falls back to mock data for demo/hackathon purposes
   * @param {Object} options - Options
   * @returns {Object} Aggregated news items
   */
  async getAggregatedNews({ limit = 10, categories = null, useFallback = true } = {}) {
    const allItems = [];
    const feedStatuses = [];

    // Try to fetch from real feeds
    for (const feedConfig of DEFAULT_FEEDS) {
      try {
        const feed = await this.getCachedFeed(feedConfig);

        if (feed && feed.items) {
          const items = feed.items.map(item => ({
            id: `${feedConfig.id}-${Buffer.from(item.link || item.title).toString('base64').slice(0, 10)}`,
            title: item.title,
            description: this.truncateDescription(item.description, 200),
            link: item.link,
            pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            category: this.categorizeItem(item, feedConfig),
            source: feedConfig.name,
            isHighlight: feedConfig.priority === 1
          }));

          allItems.push(...items);
          feedStatuses.push({ id: feedConfig.id, name: feedConfig.name, status: 'OK', itemCount: items.length });
        } else {
          feedStatuses.push({ id: feedConfig.id, name: feedConfig.name, status: 'EMPTY' });
        }
      } catch (err) {
        feedStatuses.push({ id: feedConfig.id, name: feedConfig.name, status: 'ERROR', error: err.message });
      }
    }

    // Use fallback data if no items fetched or for demo
    let finalItems = allItems;
    let usingFallback = false;

    if (allItems.length === 0 && useFallback) {
      finalItems = FALLBACK_NEWS;
      usingFallback = true;
    }

    // Filter by category if specified
    if (categories && categories.length > 0) {
      finalItems = finalItems.filter(item =>
        categories.includes(item.category)
      );
    }

    // Sort by date (newest first)
    finalItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Limit results
    const limitedItems = finalItems.slice(0, limit);

    // Group by category for dashboard display
    const byCategory = {};
    for (const item of limitedItems) {
      const cat = item.category || 'GENERAL';
      byCategory[cat] = byCategory[cat] || [];
      byCategory[cat].push(item);
    }

    return {
      items: limitedItems,
      byCategory,
      highlights: limitedItems.filter(i => i.isHighlight).slice(0, 3),
      feedStatuses,
      usingFallback,
      lastUpdated: new Date().toISOString(),
      totalItems: limitedItems.length
    };
  },

  /**
   * Get news highlights for dashboard widget
   */
  async getHighlights({ limit = 5 } = {}) {
    const news = await this.getAggregatedNews({ limit: limit * 2 });

    // Prioritize highlights, then recent regulatory news
    const highlights = [
      ...news.highlights,
      ...(news.byCategory['REGULATORY'] || []),
      ...(news.byCategory['COMPLIANCE'] || []),
      ...news.items
    ]
      .filter((item, index, self) =>
        index === self.findIndex(i => i.id === item.id)
      )
      .slice(0, limit);

    return {
      highlights,
      lastUpdated: news.lastUpdated,
      usingFallback: news.usingFallback
    };
  },

  /**
   * Truncate description to max length
   */
  truncateDescription(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  },

  /**
   * Categorize an RSS item based on content - focused on tender/procurement relevance
   */
  categorizeItem(item, feedConfig) {
    const text = ((item.title || '') + ' ' + (item.description || '') + ' ' + (item.category || '')).toLowerCase();

    // Tender/Procurement specific keywords
    if (text.includes('tender') || text.includes('procurement') || text.includes('bid') || text.includes('contract award') || text.includes('gem portal') || text.includes('e-procurement')) {
      return 'TENDER';
    }
    // Government policy and regulations
    if (text.includes('policy') || text.includes('regulation') || text.includes('guideline') || text.includes('amendment') || text.includes('notification') || text.includes('circular') || text.includes('gfr') || text.includes('finance ministry')) {
      return 'REGULATORY';
    }
    // Compliance and requirements
    if (text.includes('compliance') || text.includes('mandatory') || text.includes('requirement') || text.includes('eligibility') || text.includes('qualification') || text.includes('msme') || text.includes('startup')) {
      return 'COMPLIANCE';
    }
    // Deadlines and extensions
    if (text.includes('deadline') || text.includes('extension') || text.includes('due date') || text.includes('last date')) {
      return 'DEADLINE';
    }
    // Trade and business (relevant to bidders)
    if (text.includes('trade') || text.includes('export') || text.includes('import') || text.includes('fta') || text.includes('agreement') || text.includes('industry')) {
      return 'BUSINESS';
    }
    // Infrastructure projects (potential tender opportunities)
    if (text.includes('infrastructure') || text.includes('project') || text.includes('construction') || text.includes('development') || text.includes('ppp')) {
      return 'INFRASTRUCTURE';
    }
    // Platform updates
    if (text.includes('platform') || text.includes('portal') || text.includes('system') || text.includes('digital')) {
      return 'PLATFORM';
    }

    return feedConfig?.category || 'GENERAL';
  },

  /**
   * Clear feed cache (useful for testing)
   */
  clearCache() {
    feedCache.clear();
  },

  /**
   * Get available feed sources
   */
  getFeedSources() {
    return DEFAULT_FEEDS.map(f => ({
      id: f.id,
      name: f.name,
      category: f.category,
      priority: f.priority
    }));
  }
};

export default RSSFeedService;
