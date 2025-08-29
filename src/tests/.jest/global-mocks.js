const { faker } = require('@faker-js/faker');
const jwt = require('jsonwebtoken');
const { default: config } = require('src/config');

const mockLookup = jest.fn((c) => {
  return Promise.resolve(c);
});

const mockAxiosGet = jest.fn(() => {
  return Promise.resolve({
    status: 200,
    data: '',
  });
});
const mockAxiosPost = jest.fn(() => {
  return Promise.resolve({
    status: 200,
    data: '',
  });
});

const mockCLIExec = jest.fn((c) => {
  return Promise.resolve({
    stdout: `${c} stdout`,
    stderr: ``,
  });
});

const mockSaveToFile = jest.fn();

const mockGenPrivateKey = jest.fn(async () => {
  return Promise.resolve('private_key');
});

const mockGenPublicKey = jest.fn(async (privateKey) => {
  return Promise.resolve('public_key');
});

const mockGenPreSharedKey = jest.fn(async () => {
  return Promise.resolve('shared_key');
});

jest.mock('dns', () => {
  return {
    resolve: mockLookup,
  };
});

jest.mock('axios', () => {
  return {
    get: mockAxiosGet,
    post: mockAxiosPost,
  };
});

const mockSyncConf = jest.fn();
const mockQuickUp = jest.fn();
const mockQuickDown = jest.fn();
const mockIsLink = jest.fn(() => {
  return false;
});
const mockDumpRuntimeInfo = jest.fn();
const mockPeerRuntimeInfo = jest.fn();

const mockRemoveDir = jest.fn();
const mockRemoveFile = jest.fn();
const mockIsPath = jest.fn(() => {
  return false;
});

const mockNslookup = jest.fn(() => {
  return true;
});
const mockCheckCname = jest.fn(() => {
  return false;
});
const mockCheckPort = jest.fn(() => {
  return true;
});
const mockCheckUdpPort = jest.fn(() => {
  return true;
});
const mockGetAvailablePort = jest.fn((arr, min, max) => {
  let port = faker.number.int({ min, max });

  while (arr.includes(port)) {
    port = faker.number.int({ min, max });
  }

  return port;
});

jest.mock('../../utils/cli.ts', () => {
  return {
    exec: mockCLIExec,
  };
});

const mockNetAddRoute = jest.fn();
const mockNetDelRoute = jest.fn();

jest.mock('../../utils/net.ts', () => {
  return {
    addRoute: mockNetAddRoute,
    delRoute: mockNetDelRoute,
    isReachable: jest.fn(),
    nslookup: mockNslookup,
    checkCNAME: mockCheckCname,
    lookupIncludesThisServer: mockNslookup,
    isIPForwardEnabled: jest.fn(),
    getAvailablePort: mockGetAvailablePort,
    getAvailableLocalPort: mockGetAvailablePort,
    checkPort: mockCheckPort,
    checkUdpPort: mockCheckUdpPort,
    getWireguardIP: jest.fn(() => config.wireguard.host),
  };
});

jest.mock('../../utils/iptables.ts', () => {
  const actual = jest.requireActual('../../utils/iptables.ts');
  return {
    __esModule: true,
    ...actual,
    default: {
      ruleExists: jest.fn(),
      showRules: jest.fn(),
      addRules: jest.fn(),
      addRule: jest.fn(),
      deleteRules: jest.fn(),
      deleteRule: jest.fn(),
    },
  };
});

jest.mock('../../utils/file-manager.ts', () => {
  return {
    isFile: jest.fn(() => {
      return false;
    }),
    isPath: mockIsPath,
    isDirectory: jest.fn(),
    mkdirSync: jest.fn(() => {
      return true;
    }),
    listDirectories: jest.fn(),
    readDirectory: jest.fn(),
    readFile: jest.fn(),
    readFileInDir: jest.fn(),
    saveToFile: mockSaveToFile,
    appendToFile: jest.fn(),
    rename: jest.fn(),
    removeDir: mockRemoveDir,
    removeFile: mockRemoveFile,
  };
});

jest.mock('../../utils/wg-cli.ts', () => {
  return {
    genPrivateKey: mockGenPrivateKey,
    genPublicKey: mockGenPublicKey,
    genPreSharedKey: mockGenPreSharedKey,
    syncConf: mockSyncConf,
    quickUp: mockQuickUp,
    quickDown: mockQuickDown,
    isLink: mockIsLink,
    dumpPeerRuntimeInfo: mockPeerRuntimeInfo,
    dumpRunTimeInfo: mockDumpRuntimeInfo,
  };
});

function mockAuthenticatedToken(c) {
  const claims = {
    id: c?.id || 0,
    type: c?.type || 'admin',
  };
  return jwt.sign(claims, config.jwt.secret);
}

module.exports = {
  mockLookup,
  mockAxiosGet,
  mockAxiosPost,
  mockCLIExec,
  mockSaveToFile,
  mockGenPrivateKey,
  mockGenPublicKey,
  mockPeerRuntimeInfo,
  mockDumpRuntimeInfo,
  mockGenPreSharedKey,
  mockSyncConf,
  mockQuickUp,
  mockQuickDown,
  mockIsPath,
  mockRemoveDir,
  mockRemoveFile,
  mockNslookup,
  mockNetAddRoute,
  mockNetDelRoute,
  mockIsLink,
  mockCheckCname,
  mockCheckPort,
  mockCheckUdpPort,
  mockGetAvailablePort,
  mockAuthenticatedToken,
};
