'use client'

import { useState } from 'react'

interface BusinessProfileCardProps {
  data: any
  onContinue: () => void
  onEdit: () => void
}

export default function BusinessProfileCard({ data, onContinue, onEdit }: BusinessProfileCardProps) {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({})
  
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 max-w-7xl mx-auto">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LEFT COLUMN - Business Card */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-2xl font-bold">
              {data.businessName?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{data.businessName || 'Your Business'}</h2>
              <p className="text-blue-100 text-sm mt-1">{data.industry || 'Business'}</p>
            </div>
          </div>
          
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-4">
            {city && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                📍 {city}{state ? `, ${state}` : ''}
              </span>
            )}
            {years && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                🏆 {years}
              </span>
            )}
            {data.hours?.is24x7 && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs flex items-center gap-1">
                ⏰ 24/7
              </span>
            )}
          </div>
        </div>
        
        {/* Contact Info */}
        <div className="p-4 border-b border-gray-100">
          {contact.phone && (
            <a href={`tel:${contact.phone}`} className="flex items-center gap-3 py-2 text-gray-700 hover:text-blue-600">
              <span className="text-lg">📞</span>
              <span className="font-medium">{contact.phone}</span>
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="flex items-center gap-3 py-2 text-gray-700 hover:text-blue-600">
              <span className="text-lg">✉️</span>
              <span>{contact.email}</span>
            </a>
          )}
        </div>
        
        {/* Description */}
        {data.description && (
          <div className="p-4 border-b border-gray-100">
            <p className="text-gray-600 text-sm leading-relaxed">
              {expandedSections['desc'] ? data.description : `${data.description.substring(0, 150)}...`}
            </p>
            {data.description.length > 150 && (
              <button 
                onClick={() => toggleSection('desc')}
                className="text-blue-600 text-sm mt-2 hover:underline"
              >
                {expandedSections['desc'] ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}
        
        {/* Service Areas - Expandable */}
        {(areas.cities?.length > 0 || areas.airports?.length > 0) && (
          <div className="p-4 border-b border-gray-100">
            <button 
              onClick={() => toggleSection('areas')}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="font-semibold text-gray-800">🗺️ Service Areas</span>
              <span className="text-gray-400">{expandedSections['areas'] ? '−' : '+'}</span>
            </button>
            
            {areas.cities?.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Cities</span>
                <p className="text-sm text-gray-700 mt-1">
                  {expandedSections['areas'] 
                    ? areas.cities.join(', ')
                    : `${areas.cities.slice(0, 3).join(', ')}${areas.cities.length > 3 ? ` +${areas.cities.length - 3} more` : ''}`
                  }
                </p>
              </div>
            )}
            
            {expandedSections['areas'] && areas.airports?.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Airports</span>
                <p className="text-sm text-gray-700 mt-1">{areas.airports.join(', ')}</p>
              </div>
            )}
            
            {expandedSections['areas'] && areas.landmarks?.length > 0 && (
              <div className="mt-3">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Key Destinations</span>
                <p className="text-sm text-gray-700 mt-1">{areas.landmarks.join(', ')}</p>
              </div>
            )}
          </div>
        )}
        
        {/* Services - Expandable */}
        {data.services?.length > 0 && (
          <div className="p-4 border-b border-gray-100">
            <button 
              onClick={() => toggleSection('services')}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="font-semibold text-gray-800">💼 Services ({data.services.length})</span>
              <span className="text-gray-400">{expandedSections['services'] ? '−' : '+'}</span>
            </button>
            
            {expandedSections['services'] && (
              <div className="mt-3 space-y-3">
                {data.services.slice(0, 6).map((s: any, i: number) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <h4 className="font-medium text-gray-800">{typeof s === 'string' ? s : s.name}</h4>
                    {s.description && <p className="text-sm text-gray-600 mt-1">{s.description}</p>}
                    {s.idealFor && <p className="text-xs text-blue-600 mt-1">Best for: {s.idealFor}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Fleet - Expandable */}
        {fleet.length > 0 && (
          <div className="p-4 border-b border-gray-100">
            <button 
              onClick={() => toggleSection('fleet')}
              className="w-full flex items-center justify-between text-left"
            >
              <span className="font-semibold text-gray-800">🚗 Fleet ({fleet.length})</span>
              <span className="text-gray-400">{expandedSections['fleet'] ? '−' : '+'}</span>
            </button>
            
            {expandedSections['fleet'] && (
              <div className="mt-3 space-y-2">
                {fleet.slice(0, 8).map((v: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-gray-800">{typeof v === 'string' ? v : v.name}</span>
                    {v.capacity && <span className="text-xs bg-gray-100 px-2 py-1 rounded">{v.capacity}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Credentials */}
        {data.credentials?.length > 0 && (
          <div className="p-4">
            <h3 className="font-semibold text-gray-800 mb-3">🏅 Credentials & Trust</h3>
            {data.credentials.slice(0, 3).map((c: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <span className="text-2xl">🏆</span>
                <div>
                  <p className="font-medium text-gray-800">{typeof c === 'string' ? c : c.name}</p>
                  {c.issuer && <p className="text-xs text-gray-500">{c.issuer}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MIDDLE COLUMN - Actions & CTA */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {/* Navi Greeting */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-800">Hey there! 👋</h3>
              <p className="text-sm text-gray-600">I'm Navi, your AI assistant</p>
            </div>
          </div>
          <p className="text-gray-700">
            I've analyzed your website and built this profile. Review the details and let me know if anything needs updating!
          </p>
        </div>
        
        {/* Top 3 Actions */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 text-lg mb-4">🚀 Your Top 3 Actions</h3>
          
          {(analysis.priorityActions || []).slice(0, 3).map((action: any, i: number) => (
            <div key={i} className={`p-4 rounded-xl mb-3 ${i === 0 ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${i === 0 ? 'bg-blue-600' : i === 1 ? 'bg-indigo-500' : 'bg-purple-500'}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-800">{action.action}</h4>
                  <div className="flex gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1">
                      Impact: {action.impact === 'High' ? '🔴🔴🔴' : '🟡🟡'}
                    </span>
                    <span className="flex items-center gap-1">
                      Effort: {action.effort === 'Easy' ? '✅' : action.effort === 'Medium' ? '🟡🟡' : '🔴🔴'}
                    </span>
                  </div>
                  {action.why && <p className="text-sm text-gray-600 mt-2">{action.why}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* CTA Buttons */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <p className="text-center text-gray-700 mb-4">Does this business profile look accurate?</p>
          <div className="flex gap-3">
            <button
              onClick={onContinue}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              See Website Options
            </button>
            <button
              onClick={onEdit}
              className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
            >
              Edit
            </button>
          </div>
        </div>
      </div>
      
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* RIGHT COLUMN - Scorecard */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {/* Overall Grade Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white">
          <h3 className="font-bold text-lg mb-4">Digital Presence Scorecard</h3>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 ${getGradeColor(analysis.grade || 'B')} rounded-xl flex items-center justify-center`}>
              <span className="text-3xl font-bold text-white">{analysis.grade || 'B'}</span>
            </div>
            <div>
              <p className="text-lg font-semibold">Overall Grade: {analysis.grade || 'B'}</p>
              <p className="text-slate-300 text-sm">{analysis.gradeExplain || 'Good foundation with room for improvement'}</p>
            </div>
          </div>
        </div>
        
        {/* Score Sections */}
        <div className="divide-y divide-gray-100">
          {/* Local SEO */}
          <div className="p-4">
            <button 
              onClick={() => toggleSection('seo')}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">🔍 Local SEO</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreLabel(seoScore, 4).color}`}>
                  {getScoreLabel(seoScore, 4).label}
                </span>
              </div>
              <span className="text-gray-400">{expandedSections['seo'] ? '−' : '+'}</span>
            </button>
            
            {expandedSections['seo'] && (
              <div className="mt-3 space-y-2">
                <ScoreItem label="Name/Address/Phone visible" checked={seo.napConsistent} />
                <ScoreItem label="City names in content" checked={seo.hasLocalKeywords} />
                <ScoreItem label="Service area pages" checked={seo.hasServiceAreaPages} />
                <ScoreItem label="Google Business linked" checked={seo.hasGoogleBusiness} />
                {seo.fixes?.[0] && (
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                    💡 Quick Win: {seo.fixes[0]}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Conversion */}
          <div className="p-4">
            <button 
              onClick={() => toggleSection('conv')}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">💰 Conversion</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreLabel(convScore, 3).color}`}>
                  {getScoreLabel(convScore, 3).label}
                </span>
              </div>
              <span className="text-gray-400">{expandedSections['conv'] ? '−' : '+'}</span>
            </button>
            
            {expandedSections['conv'] && (
              <div className="mt-3 space-y-2">
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
                    💡 Quick Win: {conv.fixes[0]}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="p-4">
            <button 
              onClick={() => toggleSection('content')}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">📝 Content</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreLabel(contentScore, 3).color}`}>
                  {getScoreLabel(contentScore, 3).label}
                </span>
              </div>
              <span className="text-gray-400">{expandedSections['content'] ? '−' : '+'}</span>
            </button>
            
            {expandedSections['content'] && (
              <div className="mt-3 space-y-2">
                <ScoreItem label="Blog for SEO" checked={content.hasBlog} detail={content.blogFrequency} />
                <ScoreItem label="FAQ section" checked={content.hasFaq} />
                <ScoreItem label="Customer testimonials" checked={content.hasTestimonials} />
                <ScoreItem label="Video content" checked={content.hasVideo} />
                {content.fixes?.[0] && (
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                    💡 Quick Win: {content.fixes[0]}
                  </p>
                )}
              </div>
            )}
          </div>
          
          {/* Trust */}
          <div className="p-4">
            <button 
              onClick={() => toggleSection('trust')}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold">🛡️ Trust Signals</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreLabel(trustScore, 3).color}`}>
                  {getScoreLabel(trustScore, 3).label}
                </span>
              </div>
              <span className="text-gray-400">{expandedSections['trust'] ? '−' : '+'}</span>
            </button>
            
            {expandedSections['trust'] && (
              <div className="mt-3 space-y-2">
                <ScoreItem 
                  label="Reviews displayed" 
                  checked={trust.hasReviews} 
                  detail={trust.hasReviews ? `${trust.reviewScore || ''} (${trust.reviewCount || ''})` : undefined}
                />
                <ScoreItem label="Credentials/badges" checked={trust.hasCredentialBadges} />
                <ScoreItem label="Insurance mentioned" checked={trust.hasInsuranceMention} warning={!trust.hasInsuranceMention} />
                {trust.fixes?.[0] && (
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded mt-2">
                    💡 Quick Win: {trust.fixes[0]}
                  </p>
                )}
              </div>
            )}
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
          <span className="text-green-500">✓</span>
        ) : warning ? (
          <span className="text-yellow-500">⚠️</span>
        ) : (
          <span className="text-red-500">✗</span>
        )}
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      {detail && (
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{detail}</span>
      )}
    </div>
  )
}

