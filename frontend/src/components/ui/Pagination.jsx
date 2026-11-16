import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

export default function Pagination({ page, totalPages, totalElements, onPage }) {
  if (!totalPages || totalPages <= 1) {
    return totalElements ? <p className="text-xs text-muted">{totalElements} {totalElements === 1 ? 'result' : 'results'}</p> : null
  }
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">Page {page + 1} of {totalPages} · {totalElements} results</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" icon={ChevronLeft} disabled={page <= 0} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="secondary" size="sm" disabled={page >= totalPages - 1} onClick={() => onPage(page + 1)}>
          Next <ChevronRight size={16} />
        </Button>
      </div>
    </div>
  )
}
