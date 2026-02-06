import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  Upload,
  Link,
  Plus,
  Globe,
  ExternalLink,
  X,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BidderLayout from '../../components/bidder-layout/BidderLayout';
import StatsGrid from '../../components/bidder-discovery/StatsGrid';
import SearchAndFilters from '../../components/bidder-discovery/SearchAndFilters';
import TenderCard from '../../components/bidder-discovery/TenderCard';
import { tenderService } from '../../services/bidder/tenderService';

export default function BidderTenderDiscovery() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    industryDomain: '',
    sortBy: 'publishedAt',
    sortOrder: 'desc'
  });
  const [selectedView, setSelectedView] = useState('grid');
  const [tenders, setTenders] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Government portal states
  const [showGovPortal, setShowGovPortal] = useState(false);
  const [activePortal, setActivePortal] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);
  
  // Upload modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('url');
  const [tenderUrl, setTenderUrl] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // Saved tenders state
  const [savedTenderIds, setSavedTenderIds] = useState({ platformTenderIds: [], uploadedTenderIds: [] });

  const governmentPortals = [
    {
      id: 'mahatenders',
      name: 'Mahatenders',
      url: 'https://mahatenders.gov.in/nicgep/app',
      searchUrl: 'https://mahatenders.gov.in/nicgep/app?page=directorates&service=page',
      icon: Globe,
      color: 'blue',
      description: 'Government of Maharashtra Tenders',
      directLink: true
    },
    {
      id: 'etenders',
      name: 'eTenders',
      url: 'https://etenders.gov.in/eprocure/app',
      searchUrl: 'https://etenders.gov.in/eprocure/app?page=showTenders&service=page',
      icon: ExternalLink,
      color: 'green',
      description: 'Government of India eProcurement',
      directLink: true
    }
  ];

  // Fetch saved tender IDs on mount
  useEffect(() => {
    fetchSavedIds();
  }, []);

  useEffect(() => {
    fetchTenders();
  }, [page, filters, searchQuery]);

  const fetchSavedIds = async () => {
    try {
      const response = await tenderService.getSavedTenderIds();
      if (response.data?.success) {
        setSavedTenderIds(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch saved tender IDs:', err);
    }
  };

  const fetchTenders = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 12,
        search: searchQuery,
        industryDomain: filters.industryDomain,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder
      };

      const response = await tenderService.discoverTenders(params);

      if (response.data && response.data.tenders) {
        setTenders(response.data.tenders);
        setTotalPages(response.data.pagination?.pages || 1);
        // Store real statistics from backend
        if (response.data.statistics) {
          setStatistics(response.data.statistics);
        }
      } else {
        setError('Failed to load tenders');
      }
    } catch (err) {
      console.error('Error fetching tenders:', err);
      setError(err.response?.data?.message || 'Failed to load tenders');
    } finally {
      setLoading(false);
    }
  };

  const handleViewTender = (tender) => {
    // Handle uploaded tenders differently - navigate to PDF analysis view
    if (tender.isUploaded) {
      navigate(`/bidder/uploaded-tenders/${tender._id}/analyze`);
    } else {
      navigate(`/bidder/tenders/${tender._id}/analyze`);
    }
  };

  // Format total value for display
  const formatValue = (value) => {
    if (!value || value === 0) return '₹0';
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    return `₹${value.toLocaleString()}`;
  };

  // Use real statistics from backend, with fallbacks
  const stats = [
    { label: 'Available Tenders', value: (statistics?.totalTenders || tenders.length).toString(), icon: FileText, color: 'blue' },
    { label: 'Avg. Competition', value: (statistics?.avgCompetition || 0).toString(), icon: Users, color: 'purple' },
    { label: 'Closing Soon', value: (statistics?.closingSoon || 0).toString(), icon: Clock, color: 'orange' },
    { label: 'Total Value', value: formatValue(statistics?.totalValue || 0), icon: TrendingUp, color: 'green' }
  ];
  // Government portal functions - OPEN IN NEW TAB instead of iframe
  const openGovernmentPortal = (portal) => {
    setActivePortal(portal);
    setPortalLoading(true);
    
    // Try to open in a popup window first
    const popup = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes');
    
    if (popup) {
      // Show loading in popup
      popup.document.write(`
        <html>
          <head>
            <title>Loading ${portal.name}...</title>
            <style>
              body { 
                margin: 0; 
                padding: 0; 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .loading-container {
                text-align: center;
                color: white;
                padding: 2rem;
              }
              .spinner {
                border: 4px solid rgba(255,255,255,0.3);
                border-radius: 50%;
                border-top: 4px solid white;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 0 auto 20px;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              h2 { margin-bottom: 10px; }
              p { opacity: 0.8; }
            </style>
          </head>
          <body>
            <div class="loading-container">
              <div class="spinner"></div>
              <h2>Opening ${portal.name}</h2>
              <p>Please wait while we redirect you to the official portal...</p>
            </div>
          </body>
        </html>
      `);
      
      // Redirect after a short delay
      setTimeout(() => {
        try {
          popup.location.href = portal.url;
          popup.focus();
        } catch (e) {
          // If popup blocked, open in same tab
          window.open(portal.url, '_blank', 'noopener,noreferrer');
        }
      }, 1000);
    } else {
      // If popup blocked, open in same tab
      window.open(portal.url, '_blank', 'noopener,noreferrer');
    }
    
    setPortalLoading(false);
    setShowGovPortal(true);
    
    // Close modal after opening portal
    setTimeout(() => {
      setShowGovPortal(false);
      setActivePortal(null);
    }, 2000);
  };

  const searchGovernmentPortal = (portal, query = '') => {
    let searchUrl = portal.searchUrl;
    if (query) {
      searchUrl = `${portal.url}?keyword=${encodeURIComponent(query)}`;
    }
    window.open(searchUrl, '_blank', 'noopener,noreferrer');
  };

  // Upload functions
  const handleUploadClick = () => {
    setShowUploadModal(true);
    setUploadError('');
    setTenderUrl('');
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    // Only accept PDF files
    if (file.type !== 'application/pdf') {
      setUploadError('Please upload a PDF document');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File size should be less than 15MB');
      return;
    }

    // Navigate to PDF analysis page with the file
    setShowUploadModal(false);
    navigate('/bidder/pdf-analyze', {
      state: { file }
    });
  };

  const handleUrlSubmit = async (e) => {
    e.preventDefault();
    if (!tenderUrl.trim()) {
      setUploadError('Please enter a tender URL');
      return;
    }
    
    setUploadLoading(true);
    setUploadError('');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      navigate('/bidder/tenders/analyze', {
        state: {
          tenderUrl: tenderUrl,
          analyzeMode: 'url'
        }
      });
      
      setShowUploadModal(false);
    } catch (err) {
      setUploadError('Failed to analyze URL. Please check the link and try again.');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const getUrgencyColor = (days) => {
    if (days <= 7) return 'text-red-600 bg-red-50 border-red-200';
    if (days <= 14) return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getCompetitionLevel = (count) => {
    if (count >= 30) return { label: 'High', color: 'red' };
    if (count >= 15) return { label: 'Medium', color: 'orange' };
    return { label: 'Low', color: 'green' };
  };

  if (loading && tenders.length === 0) {
    return (
      <BidderLayout>
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-slate-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </BidderLayout>
    );
  }

  return (
    <BidderLayout>
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-8">
          {/* Header with Upload Button */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                Discover Tenders
                {statistics && (
                  <span className="ml-3 text-xl text-slate-600 font-normal">
                    ({statistics.totalTenders || tenders.length} Available)
                  </span>
                )}
              </h1>
              <p className="text-sm sm:text-base text-slate-600">
                Find and analyze opportunities matching your expertise
                {statistics?.uploadedTenders > 0 && (
                  <span className="ml-1 text-blue-600 font-medium">
                    • {statistics.uploadedTenders} uploaded by you
                  </span>
                )}
              </p>
            </div>
            
            {/* Upload Button - Top Right */}
            <button
              onClick={handleUploadClick}
              className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
              <span>Analyze Tender</span>
            </button>
          </div>

          <StatsGrid stats={stats} />
          
          {/* Government Portals Section */}
          <div className="mb-6 bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Globe className="w-6 h-6 text-blue-600" />
                  Government Tender Portals
                </h2>
                <p className="text-slate-600 mt-1">Access official government tender websites</p>
              </div>
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {governmentPortals.map((portal) => (
                <div
                  key={portal.id}
                  className="bg-white rounded-lg border border-slate-200 p-5 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg bg-${portal.color}-50`}>
                      <portal.icon className={`w-6 h-6 text-${portal.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 text-lg mb-1">{portal.name}</h3>
                      <p className="text-sm text-slate-600 mb-4">{portal.description}</p>
                      
                      <div className="flex gap-3">
                        <button
                          onClick={() => openGovernmentPortal(portal)}
                          className={`flex-1 px-4 py-2.5 bg-${portal.color}-600 hover:bg-${portal.color}-700 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors`}
                        >
                          <ExternalLink className="w-4 h-4" />
                          Visit Portal
                        </button>
                        <button
                          onClick={() => searchGovernmentPortal(portal, searchQuery)}
                          className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg flex items-center gap-2 transition-colors"
                          title="Search with current query"
                        >
                          <Search className="w-4 h-4" />
                          Search
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            
          </div>

          <SearchAndFilters 
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filters={filters}
            setFilters={setFilters}
          />

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error loading tenders</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3 sm:gap-0">
            <p className="text-sm sm:text-base text-slate-600">
              Showing <span className="font-semibold text-slate-900">{tenders.length}</span> tenders
              {statistics?.uploadedTenders > 0 && (
                <span className="ml-1">
                  (<span className="text-blue-600 font-medium">{statistics.uploadedTenders} uploaded</span>)
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setSelectedView('grid')}
                className={`px-3 py-2 text-sm rounded-lg ${selectedView === 'grid' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                Grid
              </button>
              <button 
                onClick={() => setSelectedView('list')}
                className={`px-3 py-2 text-sm rounded-lg ${selectedView === 'list' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                List
              </button>
            </div>
          </div>

          {tenders.length === 0 && !loading && (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-slate-900 mb-2">No platform tenders found</h3>
              <p className="text-slate-600 mb-6">Try adjusting your search or check government portals above</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Clear Search
                </button>
                <button
                  onClick={() => openGovernmentPortal(governmentPortals[0])}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
                >
                  <Globe className="w-4 h-4" />
                  Check Government Tenders
                </button>
              </div>
            </div>
          )}

          {tenders.length > 0 && (
            <div className={selectedView === 'grid' ? 'grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-6' : 'space-y-4'}>
              {tenders.map((tender) => {
                const isUploaded = tender.isUploaded === true;
                const isSaved = isUploaded
                  ? savedTenderIds.uploadedTenderIds.includes(tender._id)
                  : savedTenderIds.platformTenderIds.includes(tender._id);

                return (
                  <div key={tender._id} onClick={() => handleViewTender(tender)} className="cursor-pointer">
                    <TenderCard
                      tender={tender}
                      getUrgencyColor={getUrgencyColor}
                      getCompetitionLevel={getCompetitionLevel}
                      onViewDetails={() => handleViewTender(tender)}
                      initialSaved={isSaved}
                      onSaveToggle={(id, saved) => {
                        if (saved) {
                          setSavedTenderIds(prev => ({
                            ...prev,
                            [isUploaded ? 'uploadedTenderIds' : 'platformTenderIds']: [
                              ...prev[isUploaded ? 'uploadedTenderIds' : 'platformTenderIds'],
                              id
                            ]
                          }));
                        } else {
                          setSavedTenderIds(prev => ({
                            ...prev,
                            [isUploaded ? 'uploadedTenderIds' : 'platformTenderIds']:
                              prev[isUploaded ? 'uploadedTenderIds' : 'platformTenderIds'].filter(tid => tid !== id)
                          }));
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center gap-2">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`px-3 py-2 rounded-lg ${
                      page === i + 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload/URL Analysis Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-slate-900">Analyze Tender</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="flex border-b border-slate-200 mb-6">
                
                
                <button
                  onClick={() => setUploadMethod('file')}
                  className={`flex-1 py-3 text-center font-medium transition-colors ${
                    uploadMethod === 'file'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    Upload File
                  </div>
                </button>
              </div>
              
              {uploadMethod === 'url' ? (
                <form onSubmit={handleUrlSubmit}>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tender Document URL
                    </label>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="url"
                        value={tenderUrl}
                        onChange={(e) => setTenderUrl(e.target.value)}
                        placeholder="https://example.com/tender-document.pdf"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      Enter direct link to tender document or webpage
                    </p>
                  </div>
                  
                  {uploadError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {uploadError}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={uploadLoading || !tenderUrl.trim()}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                  >
                    {uploadLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        Analyze Tender
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div>
                  <div className="mb-6 text-center">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-dashed border-blue-200 flex items-center justify-center">
                      <Upload className="w-10 h-10 text-blue-500" />
                    </div>
                    <p className="text-slate-600 mb-2">
                      Upload tender PDF for AI analysis
                    </p>
                    <p className="text-sm text-slate-500">
                      Get summary, proposal draft & evaluation
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      PDF files up to 15MB
                    </p>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept=".pdf"
                    className="hidden"
                  />
                  
                  {uploadError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {uploadError}
                    </div>
                  )}
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadLoading}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                  >
                    {uploadLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Choose File
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Government Portal Loading Modal */}
      {showGovPortal && activePortal && portalLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md text-center">
            <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-6"></div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Opening {activePortal.name}</h3>
            <p className="text-slate-600 mb-4">Redirecting to official government portal...</p>
            <p className="text-sm text-slate-500">
              If a new window doesn't open, please check your browser's pop-up settings
            </p>
          </div>
        </div>
      )}
    </BidderLayout>
  );
}