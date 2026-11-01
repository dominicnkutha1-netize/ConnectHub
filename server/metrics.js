'use strict';

/**
 * Prometheus metrics.
 *
 * A service nobody measures is a service nobody can operate. These two
 * instruments cover the questions you actually ask during an incident:
 * how much traffic, how many errors, and how slow.
 */

const client = require('prom-client');

const registry = new client.Registry();
registry.setDefaultLabels({ service: 'connecthub' });

client.collectDefaultMetrics({ register: registry, prefix: 'connecthub_' });

const httpRequestsTotal = new client.Counter({
  name: 'connecthub_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

const httpRequestDuration = new client.Histogram({
  name: 'connecthub_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

/**
 * Record every response once it has been written.
 *
 * The route label is read at finish time, because Express only knows which
 * route matched after the handler runs. Unmatched paths are grouped as
 * "unmatched" instead of being labelled by path, which would let a scanner
 * create an unbounded number of label values.
 */
function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    const route = req.route ? `${req.baseUrl || ''}${req.route.path}` : 'unmatched';
    const labels = { method: req.method, route, status: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    httpRequestDuration.observe(labels, seconds);
  });

  next();
}

function metricsHandler(req, res, next) {
  registry
    .metrics()
    .then((body) => {
      res.setHeader('Content-Type', registry.contentType);
      res.send(body);
    })
    .catch(next);
}

module.exports = { registry, metricsMiddleware, metricsHandler };
