import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Calendar, AlertCircle, Copy, ExternalLink } from 'lucide-react';

interface Offer {
  id: string;
  network_name: string;
  title: string;
  price_jpy: number;
  commission_bps: number;
  affiliate_url: string;
  product_url: string;
  image_url?: string;
  shop_name: string;
  eRPC: number;
  commission: number;
}

interface EventData {
  code: string;
  badge_text: string;
  points_multiplier?: number;
  urgency_level: string;
}

export const AffiliateHub: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<EventData | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchActiveEvents();
  }, []);

  const fetchActiveEvents = async () => {
    try {
      const response = await fetch('/api/affiliate/events/active');
      const data = await response.json();
      
      if (data.success && data.data.events.length > 0) {
        setActiveEvent(data.data.boost_settings);
      }
    } catch (error) {
      console.error('Failed to fetch active events:', error);
    }
  };

  const searchOffers = async () => {
    if (!keyword.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/affiliate/search?keyword=${encodeURIComponent(keyword)}&limit=10`);
      const data = await response.json();
      
      if (data.success) {
        setOffers(data.data);
      } else {
        console.error('Search failed:', data.error);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (url: string, offerId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(offerId);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0
    }).format(price);
  };

  const getNetworkColor = (network: string) => {
    const colors = {
      rakuten: 'bg-red-100 text-red-800',
      yahoo: 'bg-purple-100 text-purple-800',
      amazon: 'bg-orange-100 text-orange-800',
      valuecommerce: 'bg-blue-100 text-blue-800',
      a8net: 'bg-green-100 text-green-800'
    };
    return colors[network] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header with Event Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Affiliate Hub</h2>
          <p className="text-gray-600 mt-1">Search and compare offers across Japanese affiliate networks</p>
        </div>
        
        {activeEvent && (
          <div className={`
            px-4 py-2 rounded-lg flex items-center space-x-2
            ${activeEvent.urgency_level === 'high' ? 'bg-red-100 text-red-800' : 
              activeEvent.urgency_level === 'medium' ? 'bg-orange-100 text-orange-800' : 
              'bg-blue-100 text-blue-800'}
          `}>
            <Calendar className="w-4 h-4" />
            <span className="font-medium">{activeEvent.badge_text}</span>
            {activeEvent.points_multiplier && (
              <span className="bg-white px-2 py-1 rounded text-xs font-bold">
                {activeEvent.points_multiplier}倍
              </span>
            )}
          </div>
        )}
      </div>

      {/* Search Interface */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchOffers()}
                placeholder="Search products (e.g., iPhone, 化粧品, 家電)"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={searchOffers}
            disabled={loading || !keyword.trim()}
            className={`
              px-6 py-3 rounded-lg font-medium transition-colors
              ${loading || !keyword.trim() 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      {offers.length > 0 && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Best Offers (Sorted by eRPC)</h3>
              <span className="text-sm text-gray-500">
                ({offers.length} results)
              </span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200">
            {offers.map((offer) => (
              <div key={offer.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-4">
                  {offer.image_url && (
                    <img
                      src={offer.image_url}
                      alt={offer.title}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-1 line-clamp-2">
                          {offer.title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">{offer.shop_name}</p>
                        
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-2xl font-bold text-green-600">
                            {formatPrice(offer.price_jpy)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getNetworkColor(offer.network_name)}`}>
                            {offer.network_name.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>Commission: {(offer.commission_bps / 100).toFixed(2)}%</span>
                          <span>Est. Commission: {formatPrice(offer.commission)}</span>
                          <span className="font-semibold text-blue-600">
                            eRPC: {formatPrice(offer.eRPC)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col space-y-2 flex-shrink-0">
                        <button
                          onClick={() => copyToClipboard(offer.affiliate_url, offer.id)}
                          className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          <span>{copiedUrl === offer.id ? 'Copied!' : 'Copy Link'}</span>
                        </button>
                        
                        <a
                          href={offer.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View Product</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Compliance Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-yellow-800 mb-1">Compliance Notice</p>
            <p className="text-yellow-700">
              All affiliate links must include proper disclosure as per Japanese stealth marketing regulations (ステマ規制). 
              The system automatically adds required disclaimers: 「本コンテンツには広告（アフィリエイトリンク）を含みます。」
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};