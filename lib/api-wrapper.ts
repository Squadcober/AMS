import { NextRequest, NextResponse } from 'next/server'

export function wrapApiRoute(handler: Function) {
  // Add dynamic exports
  Object.assign(handler, {
    dynamic: 'force-dynamic',
    fetchCache: 'force-no-store'
  })

  // Wrap the handler to add dynamic headers
  return async function wrappedHandler(req: NextRequest) {
    const response = await handler(req)
    
    // Add cache control headers
    if (response instanceof NextResponse) {
      response.headers.set('Cache-Control', 'no-store, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
    }
    
    return response
  }
}
