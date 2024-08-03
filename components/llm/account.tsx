import { formatPrice } from '@/lib/format-price'
import clsx from 'clsx'
import { format } from 'date-fns'

export function Account({ name = 'Account', price = 0 }) {
  return (
    <div className="p-4 border rounded-xl bg-zinc-950">
      <div className="text-lg text-zinc-300">{name}</div>
      <div className={clsx('text-3xl font-bold text-zinc-200 ')}>
        {formatPrice(price)}
      </div>
      <div className="mt-1 text-xs text text-zinc-500">
        Created: {format(new Date(), 'MMM do, HH:MM:ssaa')}
      </div>
    </div>
  )
}
