import { lookup } from 'node:dns/promises';
import { BlockList, isIPv4, isIP } from 'node:net';
import { request } from 'node:https';

const blocked = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blocked.addSubnet(address, prefix);

const fakeIp = new BlockList();
fakeIp.addSubnet('198.18.0.0', 15);
type ResolveImageAddressParams = { hostname: string; signal: AbortSignal };
type AddressResolver = {
  system: (hostname: string) => Promise<string[]>;
  public: (params: ResolveImageAddressParams) => Promise<string[]>;
};

/** 固定使用 Google DoH 的已知公网入口，TLS 仍验证 dns.google，不依赖被代理替换的系统 DNS。 */
async function resolvePublicAddress(params: ResolveImageAddressParams): Promise<string[]> {
  const url = new URL('https://dns.google/resolve');
  url.searchParams.set('name', params.hostname);
  url.searchParams.set('type', 'A');
  const signal = AbortSignal.any([params.signal, AbortSignal.timeout(5000)]);
  const response = await new Promise<import('node:http').IncomingMessage>((resolve, reject) => {
    const req = request(
      url,
      {
        signal,
        headers: { Accept: 'application/dns-json' },
        lookup: (_hostname, options, callback) => {
          if (options.all) callback(null, [{ address: '8.8.8.8', family: 4 }]);
          else callback(null, '8.8.8.8', 4);
        },
      },
      resolve,
    );
    req.on('error', reject);
    req.end();
  });
  try {
    if (response.statusCode !== 200) throw new Error('公网 DNS 查询失败');
    let body = '';
    for await (const chunk of response) {
      body += chunk.toString('utf8');
      if (body.length > 32768) throw new Error('公网 DNS 返回超出限制');
    }
    const value: unknown = JSON.parse(body);
    if (!value || typeof value !== 'object') throw new Error('公网 DNS 返回无效');
    const result = value as { Status?: number; Answer?: Array<{ type?: number; data?: string }> };
    if (result.Status !== 0 || !Array.isArray(result.Answer)) throw new Error('未取得真实公网地址');
    return result.Answer.filter((item) => item.type === 1 && typeof item.data === 'string').map(
      (item) => item.data!,
    );
  } finally {
    response.destroy();
  }
}

/** 仅对域名的 Fake-IP 解析启用公网 DNS 回查，真实内网地址和字面量保留地址仍拒绝。 */
export async function resolveImageAddress(
  params: ResolveImageAddressParams,
  resolver: AddressResolver = {
    system: async (hostname) =>
      (await lookup(hostname, { family: 4, all: true })).map((item) => item.address),
    public: resolvePublicAddress,
  },
): Promise<string> {
  params.signal.throwIfAborted();
  let addresses = await resolver.system(params.hostname);
  params.signal.throwIfAborted();
  if (
    !isIP(params.hostname) &&
    addresses.length &&
    addresses.every((address) => isIPv4(address) && fakeIp.check(address))
  ) {
    if (
      !params.hostname.includes('.') ||
      /\.(local|localhost|internal|lan|home|test|invalid)\.?$/i.test(params.hostname)
    )
      throw new Error('图片地址不允许访问本机或内网域名');
    try {
      addresses = await resolver.public(params);
    } catch {
      params.signal.throwIfAborted();
      throw new Error('检测到代理 Fake-IP，但无法获取真实公网地址，请检查网络后重试');
    }
  }
  params.signal.throwIfAborted();
  if (!addresses.length || addresses.some((address) => !isIPv4(address) || blocked.check(address)))
    throw new Error('图片地址不允许访问本机、内网或保留地址');
  return addresses[0];
}
