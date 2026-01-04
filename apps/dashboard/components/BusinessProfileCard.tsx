'use client'

import { useState } from 'react'

interface BusinessProfileCardProps {
  data: any
  onContinue: () => void
  onEdit: () => void
}

export default function BusinessProfileCard({ data, onContinue, onEdit }: BusinessProfileCardProps) {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({
    areas: false,
    services: false,
    fleet: false,
    seo: true,
    conv: false,
    content: false,
    trust: false
  })
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }
  
  const analysis = data.websiteAnalysis || {}
  const contact = data.contact || data.contactInfo || {}
  const areas = data.serviceAreas || {}
  const team = data.team || {}
  const fleet = data.fleet || data.assets || []
  const specs = data.specializations || {}
  const years = data.history?.yearsInBusiness || data.yearsInBusiness || ''
  const city = data.contact?.city || data.location?.city || ''
  const state = data.contact?.state || data.location?.state || ''
  
  // Calculate scores
  const seo = analysis.localSeo || {}
  const conv = analysis.conversion || {}
  const content = analysis.content || {}
  const trust = analysis.trust || {}
  
  const seoScore = [seo.napConsistent, seo.hasLocalKeywords, seo.hasServiceAreaPages, seo.hasGoogleBusiness].filter(Boolean).length
  const convScore = [conv.bookingType === 'Instant' || conv.bookingType === 'Form', conv.hasPricing, conv.hasClickablePhone].filter(Boolean).length
  const contentScore = [content.hasBlog, content.hasFaq, content.hasTestimonials].filter(Boolean).length
  const trustScore = [trust.hasReviews, trust.hasCredentialBadges, trust.hasInsuranceMention].filter(Boolean).length
  
  const getGradeColor = (grade: string) => {
    if (grade === 'A') return 'bg-green-500'
    if (grade === 'B') return 'bg-yellow-500'
    if (grade === 'C') return 'bg-orange-500'
    return 'bg-red-500'
  }
  
  const getScoreLabel = (score: number, max: number) => {
    const pct = score / max
    if (pct >= 0.75) return { label: 'Strong', color: 'text-green-600 bg-green-50' }
    if (pct >= 0.5) return { label: 'Fair', color: 'text-yellow-600 bg-yellow-50' }
    return { label: 'Needs Work', color: 'text-red-600 bg-red-50' }
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-4xl mx-auto">
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION 1: BUSINESS PROFILE */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold">
              {data.businessName?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{data.businessName || 'Your Business'}</h2>
              <p className="text-blue-100 mt-1">{data.industry || 'Business'}</p>
            </div>
          </div>
          
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {city && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                📍 {city}{state ? `, ${state}` : ''}
              </span>
            )}
            {years && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                🏆 {years}
              </span>
            )}
            {data.hours?.is24x7 && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                ⏰ 24/7
              </span>
            )}
          </div>
        </div>
        
        {/* Contact Row */}
        <div className="p-4 bg-gray-50 flex flex-wrap gap-6 border-b border-gray-100">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
              <span className="text-lg">📞</span>
              <span className="font-medium">{contact.phone}</span>
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-gray-700 hover:text-blue-600">
              <span className="text-lg">✉️</span>
              <span>{contact.email}</span>
            </a>
          )}
        </div>
        
        {/* Description */}
        {data.description && (
          <div className="p-4 border-b border-gray-100">
            <p className="text-gray-600 leading-relaxed">
              {expandedSections['desc'] ? data.description : `${data.description.substring(0, 200)}${data.description.length > 200 ? '...' : ''}`}
            </p>
            {data.description.length > 200 && (
              <button 
                onClick={() => toggleSection('desc')}
                className="text-blue-600 text-sm mt-2 hover:underline font-medium"
              >
                {expandedSections['desc'] ? '← Show less' : 'Read more →'}
              </button>
            )}
          </div>
        )}
        
        {/* Expandable Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          
          {/* Service Areas */}
          {(areas.cities?.length > 0 || areas.airports?.length > 0) && (
            <div className="p-4">
              <button 
                onClick={() => toggleSection('areas')}
                className="w-full flex items-center justify-between text-left mb-3"
              >
                <span className="font-semibold text-gray-800">🗺️ Service Areas</span>
                <span className="text-blue-600 text-sm">{expandedSections['areas'] ? '− Less' : '+ More'}</span>
              </button>
              
              {areas.cities?.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Cities:</span>{' '}
                    {expandedSections['areas'] 
                      ? areas.cities.join(', ')
                      : `${areas.cities.slice(0, 4).join(', ')}${areas.cities.length > 4 ? ` +${areas.cities.length - 4} more` : ''}`
                    }
                  </p>
                </div>
              )}
              
              {expandedSections['areas'] && (
                <>
                  {areas.airports?.length > 0 && (
                    <p className="text-sm text-gray-700 mb-2">
                      <span className="font-medium">Airports:</span> {areas.airports.join(', ')}
                    </p>
                  )}
                  {areas.landmarks?.length > 0 && (
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">Destinations:</span> {areas.landmarks.join(', ')}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Services */}
          {data.services?.length > 0 && (
            <div className="p-4">
              <button 
                onClick={() => toggleSection('services')}
                className="w-full flex items-center justify-between text-left mb-3"
              >
                <span className="font-semibold text-gray-800">💼 Services ({data.services.length})</span>
                <span className="text-blue-600 text-sm">{expandedSections['services'] ? '− Less' : '+ More'}</span>
              </button>
              
              <div className="space-y-2">
                {(expandedSections['services'] ? data.services.slice(0, 8) : data.services.slice(0, 3)).map((s: any, i: number) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-gray-800">{typeof s === 'string' ? s : s.name}</span>
                    {expandedSections['services'] && s.idealFor && (
                      <span className="text-gray-500 ml-1">— {s.idealFor}</span>
                    )}
                  </div>
                ))}
                {!expandedSections['services'] && data.services.length > 3 && (
                  <p className="text-gray-400 text-sm">+{data.services.length - 3} more...</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Fleet Row */}
        {fleet.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <button 
              onClick={() => toggleSection('fleet')}
              className="w-full flex items-center justify-between text-left mb-3"
            >
              <span className="font-semibold text-gray-800">🚗 Fleet & Equipment ({fleet.length})</span>
              <span className="text-blue-600 text-sm">{expandedSections['fleet'] ? '− Less' : '+ More'}</span>
            </button>
            
            <div className="flex flex-wrap gap-2">
              {(expandedSections['fleet'] ? fleet.slice(0, 12) : fleet.slice(0, 6)).map((v: any, i: number) => (
                <span key={i} className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700">
                  {typeof v === 'string' ? v : v.name}
                  {v.capacity && <span className="text-gray-500 ml-1">({v.capacity})</span>}
                </span>
              ))}
              {!expandedSections['fleet'] && fleet.length > 6 && (
                <span className="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-500">
                  +{fleet.length - 6} more
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Credentials Row */}
        {data.credentials?.length > 0 && (
          <div className="p-4 border-t border-gray-100 bg-amber-50">
            <h3 className="font-semibold text-gray-800 mb-3">🏅 Credentials & Trust</h3>
            <div className="flex flex-wrap gap-3">
              {data.credentials.slice(0, 4).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm">
                  <span className="text-xl">🏆</span>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{typeof c === 'string' ? c : c.name}</p>
                    {c.issuer && <p className="text-xs text-gray-500">{c.issuer}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION 2: DIGITAL PRESENCE SCORECARD */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Overall Grade Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-xl mb-1">📊 Digital Presence Scorecard</h3>
              <p className="text-slate-300 text-sm">{analysis.gradeExplain || 'Analysis of your online presence'}</p>
            </div>
            <div className={`w-20 h-20 ${getGradeColor(analysis.grade || 'B')} rounded-2xl flex items-center justify-center shadow-lg`}>
              <span className="text-4xl font-bold text-white">{analysis.grade || 'B'}</span>
            </div>
          </div>
        </div>
        
        {/* Score Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
          
          {/* Local SEO */}
          <div className="p-4">
            <button 
              onClick={() => toggleSection('seo')}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">🔍 Local SEO</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreLabel(seoScore, 4).color}`}>
                  {getScoreLabel(seoScore, 4).label}
                </span>
              </div>
              <span className="text-gray-400 text-sm">{expandedSections['seo'] ? '−' : '+'}</span>
            </button>
            
            {expandedSections['seo'] && (
              <div className="space-y-2">
                <ScoreItem label="Name/Address/Phone visible" checked={seo.napConsistent} />
                <ScoreItem label="City names in content" checked={seo.hasLocalKeywords} />
                <ScoreItem label="Service area pages" checked={seo.hasServiceAreaPages} />
                <ScoreItem label="Google Business linked" checked={seo.hasGoogleBusiness} />
                {seo.fixes?.[0] && (
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                    💡 {seo.fixes[0]}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Conversion */}
          <div className="p-4">
            <button 
              onClick={() => toggleSection('conv')}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">💰 Conversion</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreLabel(convScore, 3).color}`}>
                  {getScoreLabel(convScore, 3).label}
                </span>
              </div>
              <span className="text-gray-400 text-sm">{expandedSections['conv'] ? '−' : '+'}</span>
            </button>
            
            {expandedSections['conv'] && (
              <div className="space-y-2">
                <ScoreItem 
                  label="Online booking" 
                  checked={conv.bookingType === 'Instant' || conv.bookingType === 'Form'} 
                  detail={conv.bookingType || 'None'}
                />
                <ScoreItem label="Pricing visible" checked={conv.hasPricing} />
                <ScoreItem label="Tap-to-call phone" checked={conv.hasClickablePhone} />
                <ScoreItem label="Live chat" checked={conv.hasLiveChat} />
                {conv.fixes?.[0] && (
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                    💡 {conv.fixes[0]}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="p-4 border-t sm:border-t-0">
            <button 
              onClick={() => toggleSection('content')}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">📝 Content</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreLabel(contentScore, 3).color}`}>
                  {getScoreLabel(contentScore, 3).label}
                </span>
              </div>
              <span className="text-gray-400 text-sm">{expandedSections['content'] ? '−' : '+'}</span>
            </button>
            
            {expandedSections['content'] && (
              <div className="space-y-2">
                <ScoreItem label="Blog for SEO" checked={content.hasBlog} detail={content.blogFrequency} />
                <ScoreItem label="FAQ section" checked={content.hasFaq} />
                <ScoreItem label="Customer testimonials" checked={content.hasTestimonials} />
                <ScoreItem label="Video content" checked={content.hasVideo} />
                {content.fixes?.[0] && (
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                    💡 {content.fixes[0]}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Trust */}
          <div className="p-4 border-t sm:border-t-0">
            <button 
              onClick={() => toggleSection('trust')}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">🛡️ Trust Signals</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreLabel(trustScore, 3).color}`}>
                  {getScoreLabel(trustScore, 3).label}
                </span>
              </div>
              <span className="text-gray-400 text-sm">{expandedSections['trust'] ? '−' : '+'}</span>
            </button>
            
            {expandedSections['trust'] && (
              <div className="space-y-2">
                <ScoreItem 
                  label="Reviews displayed" 
                  checked={trust.hasReviews} 
                  detail={trust.hasReviews ? `${trust.reviewScore || ''} (${trust.reviewCount || ''})` : undefined}
                />
                <ScoreItem label="Credentials/badges" checked={trust.hasCredentialBadges} />
                <ScoreItem label="Insurance mentioned" checked={trust.hasInsuranceMention} warning={!trust.hasInsuranceMention} />
                {trust.fixes?.[0] && (
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                    💡 {trust.fixes[0]}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SECTION 3: ACTIONABLE SUGGESTIONS */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
          <h3 className="font-bold text-xl">🚀 Your Top Actions</h3>
          <p className="text-emerald-100 text-sm mt-1">Do these first — highest impact for your business</p>
        </div>
        
        <div className="p-6 space-y-4">
          {(analysis.priorityActions || []).slice(0, 3).map((action: any, i: number) => (
            <div key={i} className={`p-4 rounded-xl border-2 ${i === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${i === 0 ? 'bg-emerald-600' : i === 1 ? 'bg-teal-500' : 'bg-cyan-500'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800 text-lg">{action.action}</h4>
                  <div className="flex gap-6 mt-2">
                    <span className="text-sm text-gray-600">
                      <span className="font-medium">Impact:</span> {action.impact === 'High' ? '🔴🔴🔴 High' : '🟡🟡 Medium'}
                    </span>
                    <span className="text-sm text-gray-600">
                      <span className="font-medium">Effort:</span> {action.effort === 'Easy' ? '✅ Easy' : action.effort === 'Medium' ? '🟡 Medium' : '🔴 Hard'}
                    </span>
                  </div>
                  {action.why && <p className="text-gray-600 mt-2">{action.why}</p>}
                </div>
              </div>
            </div>
          ))}
          
          {(!analysis.priorityActions || analysis.priorityActions.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <p>No specific actions identified yet.</p>
              <p className="text-sm mt-1">Your website looks good!</p>
            </div>
          )}
        </div>
        
        {/* CTA Buttons */}
        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <p className="text-center text-gray-700 mb-4 font-medium">Does this business profile look accurate?</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onContinue}
              className="flex-1 max-w-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              ✓ Looks Good — See Website Options
            </button>
            <button
              onClick={onEdit}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-white transition-all"
            >
              ✏️ Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper component for score items
function ScoreItem({ label, checked, detail, warning }: { label: string, checked?: boolean, detail?: string, warning?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        {checked ? (
          <span className="text-green-500 text-lg">✓</span>
        ) : warning ? (
          <span className="text-yellow-500">⚠️</span>
        ) : (
          <span className="text-red-500 text-lg">✗</span>
        )}
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      {detail && (
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{detail}</span>
      )}
    </div>
  )
}
