type ToastProps = {
  message: string
}

export default function Toast({ message }: ToastProps) {
  if (!message) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
      {message}
    </div>
  )
}