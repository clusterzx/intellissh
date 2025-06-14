/**
 * IP extraction middleware
 * Extracts real client IP from various proxy headers
 */

const extractRealIp = (req, res, next) => {
  let realIp = null;

  // Priority order for IP extraction:
  // 1. CF-Connecting-IP (Cloudflare)
  // 2. X-Real-IP (Common proxy header)
  // 3. X-Forwarded-For (Standard proxy header, first IP)
  // 4. req.connection.remoteAddress (fallback)
  // 5. req.ip (Express default)

  const cfConnectingIp = req.headers['cf-connecting-ip'];
  const xRealIp = req.headers['x-real-ip'];
  const xForwardedFor = req.headers['x-forwarded-for'];

  if (cfConnectingIp && typeof cfConnectingIp === 'string') {
    realIp = cfConnectingIp.trim();
  } else if (xRealIp && typeof xRealIp === 'string') {
    realIp = xRealIp.trim();
  } else if (xForwardedFor && typeof xForwardedFor === 'string') {
    // X-Forwarded-For can contain multiple IPs, take the first one
    realIp = xForwardedFor.split(',')[0].trim();
  } else if (req.connection && req.connection.remoteAddress) {
    realIp = req.connection.remoteAddress;
  } else {
    realIp = req.ip;
  }

  // Clean up IPv6-mapped IPv4 addresses
  if (realIp && realIp.startsWith('::ffff:')) {
    realIp = realIp.substring(7);
  }

  // Set the real IP on the request object
  req.realIp = realIp;
  
  next();
};

module.exports = extractRealIp; 