import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPageDraft, renamePageDraft, deletePageDraft } from './page_ops'
import { Website, WebsitePage } from './types'
import { BusinessProfile } from '../../chat-core/src/types'

// Mock dependencies
vi.mock('./data', () => ({
  getWebsiteByUserId: vi.fn(),
  upsertWebsiteDraft: vi.fn(),
}))

vi.mock('../../admin-center/src/plan_limits', () => ({
  getUserPlanLimits: vi.fn(() => Promise.resolve({ maxPages: 5 })),
}))

vi.mock('./generator', () => ({
  generatePageWithAI: vi.fn(),
}))

import { getWebsiteByUserId, upsertWebsiteDraft } from './data'
import { getUserPlanLimits } from '../../admin-center/src/plan_limits'
import { generatePageWithAI } from './generator'

const mockUserId = 'test-user-id'

const mockProfile: BusinessProfile = {
  userId: mockUserId,
  businessName: 'Test Business',
  industry: 'Retail',
  location: {
    address: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
    country: 'USA',
  },
  contactInfo: {
    phone: '555-0100',
    email: 'test@example.com',
  },
  services: [],
  hours: [],
  brandVoice: 'friendly',
  targetAudience: 'General public',
  customAttributes: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockWebsite: Website = {
  id: 'website-1',
  userId: mockUserId,
  name: 'Test Website',
  theme: {
    colorPalette: {
      primary: '#000',
      secondary: '#fff',
    },
    font: {
      heading: 'Arial',
      body: 'Arial',
    },
  },
  pages: [
    {
      id: 'page-1',
      slug: 'home',
      title: 'Home',
      metaTitle: 'Home',
      metaDescription: 'Home page',
      structuredData: null,
      sections: [],
    },
    {
      id: 'page-2',
      slug: 'about',
      title: 'About',
      metaTitle: 'About',
      metaDescription: 'About page',
      structuredData: null,
      sections: [],
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('page_ops', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createPageDraft', () => {
    it('should create a new page and return before/after lists', async () => {
      const newPage: WebsitePage = {
        id: 'page-3',
        slug: 'gallery',
        title: 'Gallery',
        metaTitle: 'Gallery',
        metaDescription: 'Gallery page',
        structuredData: null,
        sections: [],
      }

      vi.mocked(getWebsiteByUserId).mockResolvedValue(mockWebsite)
      vi.mocked(generatePageWithAI).mockResolvedValue(newPage)
      vi.mocked(upsertWebsiteDraft).mockResolvedValue(undefined)

      const result = await createPageDraft(mockUserId, 'Gallery', mockProfile)

      expect(result.before).toEqual(['Home', 'About'])
      expect(result.after).toEqual(['Home', 'About', 'Gallery'])
      expect(upsertWebsiteDraft).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          pages: expect.arrayContaining([newPage]),
        })
      )
    })

    it('should throw error if website not found', async () => {
      vi.mocked(getWebsiteByUserId).mockResolvedValue(null)

      await expect(createPageDraft(mockUserId, 'Gallery', mockProfile)).rejects.toThrow(
        'No website draft found'
      )
    })

    it('should throw error if plan limit reached', async () => {
      const fullWebsite: Website = {
        ...mockWebsite,
        pages: Array.from({ length: 5 }, (_, i) => ({
          id: `page-${i + 1}`,
          slug: `page-${i + 1}`,
          title: `Page ${i + 1}`,
          metaTitle: `Page ${i + 1}`,
          metaDescription: '',
          structuredData: null,
          sections: [],
        })),
      }

      vi.mocked(getWebsiteByUserId).mockResolvedValue(fullWebsite)

      await expect(createPageDraft(mockUserId, 'New Page', mockProfile)).rejects.toThrow(
        'You have reached your plan limit'
      )
    })
  })

  describe('renamePageDraft', () => {
    it('should rename page and return before/after lists with slugs', async () => {
      vi.mocked(getWebsiteByUserId).mockResolvedValue(mockWebsite)
      vi.mocked(upsertWebsiteDraft).mockResolvedValue(undefined)

      const result = await renamePageDraft(mockUserId, 'about', 'Our Story')

      expect(result.before).toEqual(['Home(/home)', 'About(/about)'])
      expect(result.after).toEqual(['Home(/home)', 'Our Story(/about)'])
      expect(upsertWebsiteDraft).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          pages: expect.arrayContaining([
            expect.objectContaining({ slug: 'about', title: 'Our Story' }),
          ]),
        })
      )
    })

    it('should throw error if website not found', async () => {
      vi.mocked(getWebsiteByUserId).mockResolvedValue(null)

      await expect(renamePageDraft(mockUserId, 'about', 'New Title')).rejects.toThrow(
        'No website draft found'
      )
    })
  })

  describe('deletePageDraft', () => {
    it('should delete page and return before/after lists', async () => {
      vi.mocked(getWebsiteByUserId).mockResolvedValue(mockWebsite)
      vi.mocked(upsertWebsiteDraft).mockResolvedValue(undefined)

      const result = await deletePageDraft(mockUserId, 'about')

      expect(result.before).toEqual(['Home', 'About'])
      expect(result.after).toEqual(['Home'])
      expect(upsertWebsiteDraft).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          pages: expect.not.arrayContaining([
            expect.objectContaining({ slug: 'about' }),
          ]),
        })
      )
    })

    it('should throw error if trying to delete last page', async () => {
      const singlePageWebsite: Website = {
        ...mockWebsite,
        pages: [mockWebsite.pages[0]],
      }

      vi.mocked(getWebsiteByUserId).mockResolvedValue(singlePageWebsite)

      await expect(deletePageDraft(mockUserId, 'home')).rejects.toThrow(
        'You cannot delete the last remaining page'
      )
    })

    it('should throw error if page not found', async () => {
      vi.mocked(getWebsiteByUserId).mockResolvedValue(mockWebsite)
      vi.mocked(upsertWebsiteDraft).mockResolvedValue(undefined)

      await expect(deletePageDraft(mockUserId, 'nonexistent')).rejects.toThrow('Page not found')
    })

    it('should throw error if website not found', async () => {
      vi.mocked(getWebsiteByUserId).mockResolvedValue(null)

      await expect(deletePageDraft(mockUserId, 'about')).rejects.toThrow(
        'No website draft found'
      )
    })
  })
})

