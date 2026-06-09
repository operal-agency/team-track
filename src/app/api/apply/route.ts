import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { db } from '@/db'
import { applicantsTable, mediaTable } from '@/db/schema'
import { eq } from 'drizzle-orm'

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    // Extract form fields
    const fullName = formData.get('fullName') as string
    const email = formData.get('email') as string
    const phone = formData.get('phone') as string
    const linkedInUrl = formData.get('linkedInUrl') as string | null
    const portfolioUrl = formData.get('portfolioUrl') as string | null
    const positionAppliedFor = formData.get('positionAppliedFor') as string
    const yearsOfExperience = formData.get('yearsOfExperience') as string
    const educationLevel = formData.get('educationLevel') as string
    const currentEmploymentStatus = formData.get('currentEmploymentStatus') as string
    const expectedSalary = formData.get('expectedSalary') as string | null
    const availabilityDate = formData.get('availabilityDate') as string | null
    const source = formData.get('source') as string | null
    const bio = formData.get('bio') as string
    const consentToDataStorage = formData.get('consentToDataStorage') === 'true'
    const cvFile = formData.get('cv') as File | null

    // Validate required fields
    if (
      !fullName ||
      !email ||
      !phone ||
      !positionAppliedFor ||
      !yearsOfExperience ||
      !educationLevel ||
      !currentEmploymentStatus ||
      !bio ||
      !cvFile
    ) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 },
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ success: false, message: 'Invalid email format' }, { status: 400 })
    }

    // Validate consent
    if (!consentToDataStorage) {
      return NextResponse.json(
        { success: false, message: 'Consent to data storage is required' },
        { status: 400 },
      )
    }

    // Validate CV file
    if (!ALLOWED_FILE_TYPES.includes(cvFile.type)) {
      return NextResponse.json(
        { success: false, message: 'Invalid file type. Only PDF and Word documents are allowed.' },
        { status: 400 },
      )
    }

    if (cvFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: 'File size exceeds 10MB limit' },
        { status: 400 },
      )
    }

    // Check if email already exists
    const existing = await db.query.applicantsTable.findFirst({
      where: eq(applicantsTable.email, email),
    })

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          message:
            'An application with this email already exists. Please contact HR if you need to update your application.',
        },
        { status: 409 },
      )
    }

    // Save CV file
    const bytes = await cvFile.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const timestamp = Date.now()
    const fileExtension = cvFile.name.split('.').pop()
    const sanitizedName = fullName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    const filename = `cv-${sanitizedName}-${timestamp}.${fileExtension}`
    const filepath = join(process.cwd(), 'public', 'media', filename)

    await writeFile(filepath, buffer)

    // Store file metadata in media table
    const [media] = await db
      .insert(mediaTable)
      .values({
        filename,
        mimeType: cvFile.type,
        filesize: cvFile.size,
        url: `/media/${filename}`,
      })
      .returning()

    // Create the applicant record
    const [applicant] = await db
      .insert(applicantsTable)
      .values({
        fullName,
        email,
        phone,
        linkedInUrl: linkedInUrl || null,
        portfolioUrl: portfolioUrl || null,
        positionAppliedFor,
        yearsOfExperience: parseInt(yearsOfExperience, 10),
        educationLevel: educationLevel as any,
        currentEmploymentStatus: currentEmploymentStatus as any,
        expectedSalary: expectedSalary ? parseInt(expectedSalary, 10) : null,
        availabilityDate: availabilityDate ? availabilityDate.split('T')[0] : null,
        source: (source || 'website') as any,
        bio,
        cv: media.id,
        status: 'new',
        consentToDataStorage,
      })
      .returning()

    return NextResponse.json(
      {
        success: true,
        message: 'Application submitted successfully',
        applicant: {
          id: applicant.id,
          fullName: applicant.fullName,
          email: applicant.email,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('Error creating applicant:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to submit application. Please try again later.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
