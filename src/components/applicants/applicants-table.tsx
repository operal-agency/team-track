'use client'

import type { InferSelectModel } from 'drizzle-orm'
import { applicantsTable, mediaTable } from '@/db/schema'

type Applicant = InferSelectModel<typeof applicantsTable> & {
  cvFile?: InferSelectModel<typeof mediaTable> | null
}
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import Link from 'next/link'
import { DataTable } from '../data-table'
import { formatDate } from '@/lib/date-utils'
import { FileText, ExternalLink } from 'lucide-react'

interface ApplicantsTableProps {
  data: Applicant[]
}

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  new: { label: 'New', variant: 'default' },
  'under-review': { label: 'Under Review', variant: 'secondary' },
  shortlisted: { label: 'Shortlisted', variant: 'outline' },
  'interview-scheduled': { label: 'Interview', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  hired: { label: 'Hired', variant: 'default' },
}

const educationLabels: Record<string, string> = {
  'high-school': 'High School',
  associate: 'Associate',
  bachelor: "Bachelor's",
  master: "Master's",
  phd: 'PhD',
  other: 'Other',
}

export function ApplicantsTable({ data }: ApplicantsTableProps) {
  const columns = [
    {
      key: 'fullName' as keyof Applicant,
      header: 'Full Name',
      render: (value: unknown, applicant: Applicant) => (
        <Link href={`/applicants/${applicant.id}`} className="font-medium hover:underline">
          {String(value)}
        </Link>
      ),
    },
    {
      key: 'email' as keyof Applicant,
      header: 'Email',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">{String(value)}</span>
      ),
    },
    {
      key: 'phone' as keyof Applicant,
      header: 'Phone',
      render: (value: unknown) => (
        <span className="text-sm text-muted-foreground">{String(value || '-')}</span>
      ),
    },
    {
      key: 'positionAppliedFor' as keyof Applicant,
      header: 'Position',
      render: (value: unknown) => <span className="font-medium">{String(value)}</span>,
    },
    {
      key: 'yearsOfExperience' as keyof Applicant,
      header: 'Experience',
      render: (value: unknown) => {
        const years = Number(value) || 0
        return (
          <span className="text-sm">
            {years} {years === 1 ? 'year' : 'years'}
          </span>
        )
      },
    },
    {
      key: 'educationLevel' as keyof Applicant,
      header: 'Education',
      render: (value: unknown) => {
        const level = String(value)
        return (
          <Badge variant="outline" className="text-xs">
            {educationLabels[level] || level}
          </Badge>
        )
      },
    },
    {
      key: 'status' as keyof Applicant,
      header: 'Status',
      render: (value: unknown) => {
        const status = String(value)
        const config = statusConfig[status] || { label: status, variant: 'outline' as const }
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
    },
    {
      key: 'applicationDate' as keyof Applicant,
      header: 'Applied On',
      render: (value: unknown) => {
        if (!value) return <span className="text-muted-foreground">-</span>
        return <span className="text-sm text-muted-foreground">{formatDate(String(value))}</span>
      },
    },
    {
      key: 'cv' as keyof Applicant,
      header: 'CV',
      render: (cv: unknown, applicant: Applicant) => {
        const cvUrl =
          applicant.cvFile?.url ||
          (typeof cv === 'object' && cv && 'url' in cv
            ? (cv as { url: string }).url
            : typeof cv === 'string' && cv.startsWith('/')
              ? cv
              : '')
        if (!cvUrl) return <span className="text-muted-foreground">-</span>
        return (
          <a
            href={cvUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <FileText className="h-4 w-4" />
            View
          </a>
        )
      },
    },
    {
      key: 'id' as keyof Applicant,
      header: 'Actions',
      render: (value: unknown) => (
        <Button asChild size="sm" variant="outline">
          <Link href={`/applicants/${value}`}>View Details</Link>
        </Button>
      ),
    },
  ]

  return (
    <div>
      <DataTable data={data} columns={columns} />
    </div>
  )
}
