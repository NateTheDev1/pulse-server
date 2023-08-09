document.addEventListener('DOMContentLoaded', function () {
  const PORT = location.port;

  const getStats = async () => {
    const res = await fetch(`http://localhost:${PORT}/pulse/stats`, { method: 'GET' });

    const data = await res.json();

    console.log(data);

    const serverPort = document.getElementById('server-port');
    const osType = document.getElementById('os-type');
    const osRelease = document.getElementById('os-release');
    const configMethod = document.getElementById('config-method');
    const usePulseLogger = document.getElementById('use-pulse-logger');
    const bodyFormat = document.getElementById('body-format');
    const useCors = document.getElementById('use-cors');
    const apiVersion = document.getElementById('api-version');
    const disableParamMiddleware = document.getElementById('disable-param-middleware');
    const staticLogFile = document.getElementById('static-log-file');
    const staticLogFileName = document.getElementById('static-log-file-name');
    const rateLimit = document.getElementById('rate-limit');
    const rateLimitTimeMs = document.getElementById('rate-limit-time-ms');
    const rateLimitMaxRequests = document.getElementById('rate-limit-max-requests');
    const dashboard = document.getElementById('dashboard');
    const ipGateMethod = document.getElementById('ip-gate-method');
    const usePerformanceMonitor = document.getElementById('use-performance-monitor');
    const performanceMonitoringLevel = document.getElementById('performance-monitoring-level');
    const loadAverage = document.getElementById('load-average');
    const freeMemory = document.getElementById('free-memory');
    const totalMemory = document.getElementById('total-memory');
    const cpuInfo = document.getElementById('cpu-info');
    const systemUptime = document.getElementById('system-uptime');
    const nodeProcessUptime = document.getElementById('node-process-uptime');
    const networkInterfaces = document.getElementById('network-interfaces');
    const processMemoryUsage = document.getElementById('process-memory-usage');
    const requestTime = document.getElementById('request-time');
    const totalRequests = document.getElementById('total-requests');

    serverPort.innerHTML = data.config.port;
    osType.innerHTML = data.osType;
    osRelease.innerHTML = data.osRelease;
    usePulseLogger.innerHTML = data.config.usePulseLogger;
    configMethod.innerHTML = data.configMethod;
    bodyFormat.innerHTML = data.config.bodyFormat;
    useCors.innerHTML = data.config.useCors;
    disableParamMiddleware.innerHTML = data.config.disableParamMiddleware;
    apiVersion.innerHTML = data.config.apiVersion;
    staticLogFile.innerHTML = data.config.staticLogFile;
    staticLogFileName.innerHTML = data.config.staticLogFileName;
    rateLimit.innerHTML = data.config.rateLimit.enabled;
    rateLimitTimeMs.innerHTML = data.config.rateLimit.timeMs;
    rateLimitMaxRequests.innerHTML = data.config.rateLimit.maxRequests;
    dashboard.innerHTML = data.config.dashboard;
    ipGateMethod.innerHTML = data.config.ipGateMethod;
    usePerformanceMonitor.innerHTML = data.config.usePerformanceMonitor;
    performanceMonitoringLevel.innerHTML = data.config.performanceMonitoringLevel;
    loadAverage.innerHTML = JSON.stringify(data.loadAverage);
    freeMemory.innerHTML = data.freeMemory;
    totalMemory.innerHTML = data.totalMemory;
    cpuInfo.innerHTML = data.cpuInfo[0].model + ' ' + data.cpuInfo[0].speed + 'MHz';
    systemUptime.innerHTML = data.systemUptime + ' seconds';
    nodeProcessUptime.innerHTML = data.nodeProcessUptime + ' seconds';

    let networkString = '';

    for (const [key, val] of Object.entries(data.networkInterfaces)) {
      networkString += key + ' ' + val.length + ', ';
    }

    networkInterfaces.innerHTML = networkString;

    processMemoryUsage.innerHTML = JSON.stringify(data.processMemoryUsage);
    requestTime.innerHTML = data.requestTime + 'ms';
    totalRequests.innerHTML = data.totalRequests;
  };

  const pollStats = () => {
    setInterval(getStats, 1000);
  };

  pollStats();
});
