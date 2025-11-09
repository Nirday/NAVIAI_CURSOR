/**
 * AI Opportunity Review UI Integration Placeholder
 * Placeholder component for future SEO Opportunities feature
 */

interface OpportunityReviewPlaceholderProps {
  className?: string
}

export default function OpportunityReviewPlaceholder({ 
  className = '' 
}: OpportunityReviewPlaceholderProps) {
  return (
    <div className={`opportunity-review-placeholder ${className}`}>
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <svg 
                className="w-5 h-5 text-purple-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                />
              </svg>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h3 className="text-sm font-medium text-gray-900">
                SEO Opportunities
              </h3>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Coming Soon
              </span>
            </div>
            
            <p className="text-sm text-gray-600 leading-relaxed">
              Coming Soon: AI-Powered SEO Opportunities! Navi AI is learning new ways to improve your website's visibility. Soon, approved suggestions from our SEO experts will appear here, ready for you to implement.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
