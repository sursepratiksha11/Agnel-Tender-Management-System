/**
 * News Widget Component
 * Displays regulatory news and updates from RSS feeds
 */

import React, { useState, useEffect } from 'react';
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Loader,
  Clock,
  Tag,
  ChevronRight
} from 'lucide-react';
import { insightsService } from '../../services/bidder/insightsService';

// Category configurations - focused on tender/procurement relevance
const categoryConfig = {
  TENDER: { color: 'bg-rose-100 text-rose-700', label: 'Tender' },
  REGULATORY: { color: 'bg-purple-100 text-purple-700', label: 'Policy' },
  COMPLIANCE: { color: 'bg-blue-100 text-blue-700', label: 'Compliance' },
  DEADLINE: { color: 'bg-orange-100 text-orange-700', label: 'Deadline' },
  BUSINESS: { color: 'bg-emerald-100 text-emerald-700', label: 'Trade' },
  INFRASTRUCTURE: { color: 'bg-amber-100 text-amber-700', label: 'Projects' },
  PLATFORM: { color: 'bg-green-100 text-green-700', label: 'Platform' },
  GOVERNMENT: { color: 'bg-indigo-100 text-indigo-700', label: 'Government' },
  GENERAL: { color: 'bg-slate-100 text-slate-700', label: 'News' }
};

export default function NewsWidget({ limit = 5, showCategories = true, compact = false }) {
  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const fetchNews = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const response = await insightsService.getNews({
        limit: limit * 2, // Fetch extra for filtering
        categories: selectedCategory ? [selectedCategory] : null
      });

      setNews(response.data);
      setError(null);
    } catch (err) {
      console.error('[NewsWidget] Error:', err);
      setError('Failed to load news');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [selectedCategory]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex items-center justify-center py-6">
          <Loader className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="ml-2 text-sm text-slate-600">Loading news...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl border border-slate-200 ${compact ? 'p-4' : 'p-6'}`}>
        <div className="text-center py-4">
          <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-1" />
          <p className="text-sm text-slate-600">{error}</p>
          <button
            onClick={() => fetchNews()}
            className="mt-2 text-blue-600 hover:text-blue-700 text-xs font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!news) return null;

  const displayItems = news.items.slice(0, limit);
  const categories = Object.keys(news.byCategory || {});

  return (
    <div className={`bg-white rounded-xl border border-slate-200 ${compact ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-slate-900">Procurement & Policy News</h3>
          {news.usingFallback && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              Demo
            </span>
          )}
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
            Live
          </span>
        </div>
        <button
          onClick={() => fetchNews(true)}
          disabled={refreshing}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition"
          title="Refresh news"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Category filters */}
      {showCategories && categories.length > 1 && !compact && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition ${
              selectedCategory === null
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => {
            const config = categoryConfig[cat] || categoryConfig.GENERAL;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : `${config.color} hover:opacity-80`
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      )}

      {/* News items */}
      {displayItems.length > 0 ? (
        <div className="space-y-3">
          {displayItems.map((item, index) => {
            const catConfig = categoryConfig[item.category] || categoryConfig.GENERAL;
            // Create a unique key by combining index with item properties
            const uniqueKey = `${item.category}-${item.title}-${index}`;

            return (
              <a
                key={uniqueKey}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-slate-50 rounded-lg hover:bg-blue-50 transition group"
              >
                <div className="flex items-start gap-3">
                  {/* Category badge */}
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${catConfig.color}`}>
                    {catConfig.label}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition line-clamp-2">
                      {item.title}
                    </h4>

                    {!compact && item.description && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(item.pubDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {item.source}
                      </span>
                    </div>
                  </div>

                  {/* External link indicator */}
                  <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-500 flex-shrink-0 transition" />
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <Newspaper className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No news available</p>
        </div>
      )}

      {/* View all link */}
      {news.totalItems > limit && (
        <button
          onClick={() => {/* TODO: Navigate to full news page */}}
          className="w-full mt-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition flex items-center justify-center gap-1"
        >
          View all {news.totalItems} updates
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Last updated */}
      <p className="text-xs text-slate-400 mt-3 text-right">
        Updated {formatDate(news.lastUpdated)}
      </p>
    </div>
  );
}
