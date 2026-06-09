'use client'

import * as React from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Mail,
  Phone,
  Linkedin,
  Globe,
  GraduationCap,
  Briefcase,
  UserCircle,
} from 'lucide-react'
import { formatDate } from '@/lib/date-utils'
import { toast } from 'sonner'
import type { InferSelectModel } from 'drizzle-orm'
import { applicantsTable, mediaTable } from '@/db/schema'
import type { User } from '@/lib/rbac'

type Applicant = InferSelectModel<typeof applicantsTable> & {
  cvFile?: InferSelectModel<typeof mediaTable> | null
}
import { SetBreadcrumbLabel } from '@/components/set-breadcrumb-label'

interface ApplicantDetailProps {
  applicant: Applicant
  currentUser: User
}

const statusConfig: Record<string, { label: string; variant: any; icon: string }> = {
  new: { label: 'New', variant: 'default', icon: '🆕' },
  'under-review': { label: 'Under Review', variant: 'secondary', icon: '👀' },
  shortlisted: { label: 'Shortlisted', variant: 'outline', icon: '⭐' },
  'interview-scheduled': { label: 'Interview Scheduled', variant: 'secondary', icon: '📅' },
  rejected: { label: 'Rejected', variant: 'destructive', icon: '❌' },
  hired: { label: 'Hired', variant: 'default', icon: '✅' },
}

const educationLabels: Record<string, string> = {
  'high-school': 'High School',
  associate: 'Associate Degree',
  bachelor: "Bachelor's Degree",
  master: "Master's Degree",
  phd: 'Doctorate (PhD)',
  other: 'Other',
}

const employmentStatusLabels: Record<string, string> = {
  employed: 'Employed',
  unemployed: 'Unemployed',
  'notice-period': 'Notice Period',
  student: 'Student',
}

const sourceLabels: Record<string, string> = {
  website: 'Company Website',
  linkedin: 'LinkedIn',
  referral: 'Referral',
  'job-board': 'Job Board',
  other: 'Other',
}

export function ApplicantDetail({ applicant, currentUser }: ApplicantDetailProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [status, setStatus] = useState(applicant.status)
  const [internalNotes, setInternalNotes] = useState('')

  // Use any type for extended properties until types are regenerated
  const app = applicant as any

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === status) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/applicants/${applicant.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus, internalNotes }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update status')
      }

      setStatus(newStatus as any)
      toast.success('Status updated successfully')
      router.refresh()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const cvUrl =
    applicant.cvFile?.url ||
    (typeof applicant.cv === 'object' && applicant.cv && 'url' in applicant.cv
      ? (applicant.cv as { url: string }).url
      : typeof applicant.cv === 'string' && applicant.cv.startsWith('/')
        ? applicant.cv
        : '')

  const departmentName =
    app.department && typeof app.department === 'object' && 'name' in app.department
      ? app.department.name
      : null

  const reviewedByName =
    app.reviewedBy && typeof app.reviewedBy === 'object' && 'fullName' in app.reviewedBy
      ? app.reviewedBy.fullName
      : null

  const statusInfo = statusConfig[applicant.status] || {
    label: applicant.status,
    variant: 'outline',
    icon: '📄',
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        <SetBreadcrumbLabel label={applicant.fullName} />

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/applicants">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Applicants
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Applicant Details</h1>
            </div>
          </div>
          <Link href={`/users/new`}>
            <Button variant="outline" size="sm">
              Change to Team Member
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Content - 2 columns */}
          <div className="md:col-span-2 space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 flex flex-col">
                <div className="mb-6">
                  <h1 className="text-2xl font-bold">{applicant.fullName}</h1>
                  <p className="text-sm text-muted-foreground">{applicant.positionAppliedFor}</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">
                        Email:{' '}
                        <a
                          href={`mailto:${applicant.email}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {applicant.email}
                        </a>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">
                        Phone:{' '}
                        <a
                          href={`tel:${applicant.phone}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {applicant.phone}
                        </a>
                      </span>
                    </div>
                  </div>
                </div>

                {(app.linkedInUrl || app.portfolioUrl) && (
                  <>
                    <Separator />
                    <div className="grid gap-4 md:grid-cols-2">
                      {app.linkedInUrl && (
                        <div className="flex items-center gap-2">
                          <Linkedin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">LinkedIn</p>
                            <a
                              href={app.linkedInUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              View Profile
                            </a>
                          </div>
                        </div>
                      )}
                      {app.portfolioUrl && (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">Portfolio</p>
                            <a
                              href={app.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              View Website
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Professional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Position Applied For
                    </p>
                    <p className="text-sm font-semibold">{applicant.positionAppliedFor}</p>
                  </div>
                  {departmentName && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Department</p>
                      <Badge variant="outline">{departmentName}</Badge>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Experience</p>
                      <p className="text-sm font-semibold">
                        {applicant.yearsOfExperience}{' '}
                        {applicant.yearsOfExperience === 1 ? 'year' : 'years'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Education</p>
                      <p className="text-sm font-semibold">
                        {educationLabels[applicant.educationLevel] || applicant.educationLevel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <p className="text-sm font-semibold">
                        {employmentStatusLabels[applicant.currentEmploymentStatus] ||
                          applicant.currentEmploymentStatus}
                      </p>
                    </div>
                  </div>
                </div>

                {app.expectedSalary && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        Expected Monthly Salary
                      </p>
                      <p className="text-sm font-semibold">
                        ₺{app.expectedSalary.toLocaleString()}
                      </p>
                    </div>
                  </>
                )}

                {app.availabilityDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Available From</p>
                    <p className="text-sm font-semibold">{formatDate(app.availabilityDate)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            {app.skills && Array.isArray(app.skills) && app.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Skills & Technologies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {app.skills.map((skillItem: any, index: number) => {
                      const skillText =
                        typeof skillItem === 'object' && 'skill' in skillItem
                          ? skillItem.skill
                          : String(skillItem)
                      return (
                        <Badge key={index} variant="secondary">
                          {skillText}
                        </Badge>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cover Letter / Bio */}
            <Card>
              <CardHeader>
                <CardTitle>Cover Letter</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{applicant.bio}</p>
              </CardContent>
            </Card>

            {/* CV Document */}
            <Card>
              <CardHeader>
                <CardTitle>Resume / CV</CardTitle>
              </CardHeader>
              <CardContent>
                {cvUrl ? (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">CV Document</p>
                        <p className="text-sm text-muted-foreground">
                          View or download the applicant&apos;s resume
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button asChild variant="outline" size="sm">
                        <a href={cvUrl} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      </Button>
                      <Button asChild variant="default" size="sm">
                        <a href={cvUrl} download>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No CV uploaded</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - 1 column */}
          <div className="space-y-6">
            {/* Status Management */}
            <Card>
              <CardHeader>
                <CardTitle>Application Status</CardTitle>
                <CardDescription>Update the application status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={handleStatusChange} disabled={isUpdating}>
                    <SelectTrigger id="status">
                      <SelectValue>
                        {isUpdating ? (
                          <span className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Updating...
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            {statusConfig[status]?.icon} {statusConfig[status]?.label || status}
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <span className="flex items-center gap-2">
                            {config.icon} {config.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    placeholder="Add notes about this applicant..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    These notes are only visible to HR staff
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Application Details */}
            <Card>
              <CardHeader>
                <CardTitle>Application Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Applied On</p>
                  <p className="font-medium">{formatDate(applicant.applicationDate)}</p>
                </div>
                {applicant.source && (
                  <div>
                    <p className="text-muted-foreground">Source</p>
                    <p className="font-medium">
                      {sourceLabels[applicant.source] || applicant.source}
                    </p>
                  </div>
                )}
                {reviewedByName && app.reviewedAt && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground">Reviewed By</p>
                      <p className="font-medium">{reviewedByName}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Reviewed On</p>
                      <p className="font-medium">{formatDate(app.reviewedAt)}</p>
                    </div>
                  </>
                )}
                {app.converted && (
                  <>
                    <Separator />
                    <div>
                      <Badge variant="default" className="w-full justify-center">
                        ✅ Converted to User
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
