// DeepRoom Indigenous Client Adapter
// Redirects all legacy base44 calls to the indigenous Firebase-backed client
import { indigenousClient } from './indigenousClient';

export const base44 = indigenousClient;
export default indigenousClient;
