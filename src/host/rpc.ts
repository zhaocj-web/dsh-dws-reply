import type { KnowledgeResult } from '../shared/knowledge';
import type { DirectoryResult } from '../shared/types';
import { errorMessage } from '../shared/errors';
import type {
  ContactSearchResult,
  GroupSearchResult,
  ModelCatalog,
  Endpoint,
  PluginSnapshot,
  RpcResult,
} from '../shared/types';
import type { HostContext } from './contracts';
interface Runtime {
  dispatch(
    endpoint: Endpoint,
    payload?: unknown,
  ): Promise<
    | PluginSnapshot
    | ContactSearchResult
    | GroupSearchResult
    | ModelCatalog
    | DirectoryResult
    | KnowledgeResult
  >;
  dispose(): Promise<void>;
}
const endpoints: Endpoint[] = [
  'knowledge',
  'listContacts',
  'listGroups',
  'listModels',
  'get',
  'internalChat',
  'connect',
  'refreshAccount',
  'save',
  'test',
  'searchContacts',
  'searchGroups',
  'openConfigDirectory',
];
/** 统一注册 RPC，并串行执行会修改配置或调用模型的请求。 */
export function registerRpc(context: HostContext, runtime: Runtime): void {
  let pendingMutation: Promise<unknown> = Promise.resolve();
  for (const endpoint of endpoints) {
    const method = `dws-personal.${endpoint}`;
    context.effect(() =>
      context.connection.fetch.register({
        path: `/api/${method}`,
        methods: ['POST'],
        requestBody: 'buffered',
        async fetch(request) {
          if (!request.headers.get('content-type')?.startsWith('application/json')) {
            return new Response('JSON required', { status: 415 });
          }
          let body: {
            type?: string;
            rpcId?: string;
            method?: string;
            payload?: unknown;
          };
          try {
            body = await request.json();
          } catch {
            return new Response('Invalid JSON', { status: 400 });
          }
          if (
            !body ||
            body.type !== 'client-request' ||
            typeof body.rpcId !== 'string' ||
            body.method !== method
          ) {
            return new Response('Invalid request', { status: 400 });
          }
          let result: RpcResult<
            | PluginSnapshot
            | ContactSearchResult
            | GroupSearchResult
            | ModelCatalog
            | DirectoryResult
            | KnowledgeResult
          >;
          try {
            const execute = () => runtime.dispatch(endpoint, body.payload);
            const task = endpoint === 'get' ? execute() : pendingMutation.then(execute);
            if (endpoint !== 'get') pendingMutation = task.catch(() => undefined);
            result = { ok: true, value: await task };
          } catch (error) {
            result = { ok: false, error: { message: errorMessage(error) } };
          }
          return Response.json({ type: 'server-response', rpcId: body.rpcId, result });
        },
      }),
    );
  }
  context.on('dispose', async () => {
    await pendingMutation;
    await runtime.dispose();
  });
}
