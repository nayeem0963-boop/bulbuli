// App-facing component entry for the learning adapter context (design 1.2). Only the component is
// exported here (React Fast Refresh); the hook useLearningAdapter(), the context and the error
// live in adapterContext.js. There is deliberately no default adapter.
import { AdapterProvider as Provider } from './adapterContext.js'

export function AdapterProvider(props) {
  return <Provider {...props} />
}
