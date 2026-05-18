import User from '../models/user.js';

const MAX_EVENTS = 30;

export function parseClientMeta(userAgent = '') {
  const ua = String(userAgent);
  let browser = 'Browser';
  if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';

  let os = 'Device';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return {
    browser,
    os,
    device: `${os} • ${browser}`,
  };
}

export async function appendAccountEvent(userId, { type, description, meta = {} }) {
  if (!userId || !type || !description) return;

  await User.findByIdAndUpdate(userId, {
    $push: {
      accountEvents: {
        $each: [
          {
            type,
            description,
            at: new Date(),
            meta,
          },
        ],
        $position: 0,
        $slice: MAX_EVENTS,
      },
    },
  });
}
